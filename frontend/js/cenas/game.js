import { criarJogador } from "../entidades/jogador.js";
import { criarEsqueleto } from "../entidades/esqueletos.js";
import { criarLich, criarExplosaoVerde, criarExplosaoAzul } from "../entidades/lich.js";
import { LEVELS, LEVEL_PADRAO } from "../levels.js";
import { carregarMapa } from "../mapa.js";
import { criarLobo } from "../entidades/lobo.js";

export async function cenaJogo(data = { lives: 3 }) {
    setGravity(2400);

    // Qual fase carregar (ver levels.js). Sem "level" no data, abre a fase padrão.
    const idLevel = data.level ?? LEVEL_PADRAO;
    const level = LEVELS[idLevel];
    if (!level) throw new Error(`Level "${idLevel}" não existe em levels.js`);

    // --- REINICIA O INVENTÁRIO AO ENTRAR NA FASE/RESSUSCITAR ---
    sistemaInventario.itens = [];
    sistemaInventario.indiceSelecionado = 0;

    let currentHp = 100;
    const maxHp = 100;
    let currentLives = data.lives; 
    let isPaused = false; 

    // INICIA A MÚSICA DE FUNDO DA FASE (definida em levels.js)
    const musicaFase = play(level.musica, {
        volume: 0.4,   // Ajuste de 0.0 (mudo) a 1.0 (máximo)
        loop: true     // Mantém a música repetindo em loop contínuo
    });

    // Criação dos elementos de pausa individualmente com .fixed() e .anchor("center")
    // Usamos o centro absoluto da tela com center()
    const fundoPause = add([
        rect(width(), height()),
        color(10, 10, 15),
        opacity(0.85),
        fixed(),
        z(900)
    ]);
    fundoPause.hidden = true; // Oculta logo após criar

    const tituloPause = add([
        text("JOGO PAUSADO", { size: 48 }),
        pos(center().x, center().y - 100),
        anchor("center"),
        color(220, 220, 220),
        fixed(),
        z(901)
    ]);
    tituloPause.hidden = true;

    const btnResume = add([
        text("▶ Pressione [ ESC ] para Retornar", { size: 22 }),
        pos(center().x, center().y - 10),
        anchor("center"),
        color(100, 255, 100),
        fixed(),
        z(901)
    ]);
    btnResume.hidden = true;

    const btnMenu = add([
        text("🏠 Pressione [ M ] para ir ao Menu", { size: 22 }),
        pos(center().x, center().y + 40),
        anchor("center"),
        color(255, 100, 100),
        fixed(),
        z(901)
    ]);
    btnMenu.hidden = true

    // Função para alternar o estado de pausa (Corrigida para pausar também a música de fundo)
    // Função para alternar o estado de pausa (Atualizada para incluir o Boss e os Projéteis)
    function togglePause() {
        isPaused = !isPaused;

        // Alterna a visibilidade dos elementos de pausa
        fundoPause.hidden = !isPaused;
        tituloPause.hidden = !isPaused;
        btnResume.hidden = !isPaused;
        btnMenu.hidden = !isPaused;

        if (isPaused) {
            player.paused = true;
            
            // Pausa esqueletos, chefe, projéteis, raios E O SOM EM LOOP DO PROJÉTIL
            get("enemy").forEach(e => { e.paused = true; });
            get("boss").forEach(b => { b.paused = true; });
            get("projetilLich").forEach(p => { 
                p.paused = true; 
                if (p.somLoop) p.somLoop.paused = true; // Pausa o som da risada do projétil
            });
            get("raioLich").forEach(r => { r.paused = true; });
            get("avisoRaio").forEach(a => { a.paused = true; }); 
            
            musicaFase.paused = true; 
        } else {
            player.paused = false;
            
            get("enemy").forEach(e => { e.paused = false; });
            get("boss").forEach(b => { b.paused = false; });
            get("projetilLich").forEach(p => { 
                p.paused = false; 
                if (p.somLoop) p.somLoop.paused = false; // Retoma o som da risada do projétil
            });
            get("raioLich").forEach(r => { r.paused = false; });
            get("avisoRaio").forEach(a => { a.paused = false; }); 
            
            musicaFase.paused = false; 
        }
    }

    // Tecla ESC alterna o pause
    onKeyPress("escape", () => {
        togglePause();
    });

    // Se estiver pausado, a tecla 'm' envia de volta ao menu
    onKeyPress("m", () => {
        if (isPaused) {
            go("menu");
        }
    });

    // Tecla 'A' para circular entre os itens
    onKeyPress("a", () => {
        if (isPaused) return;
        sistemaInventario.avancarSelecao();
        atualizarHUDInventario();
    });

    // Tecla 'S' para usar o item
    onKeyPress("s", () => {
        if (isPaused) return;

        const item = sistemaInventario.obterItemAtual();
        if (!item) return;

        if (item.tipo === "cura") {
            if (currentHp < maxHp) {
                currentHp = Math.min(maxHp, currentHp + 40); 
                hpBar.width = (currentHp / maxHp) * 160; 

                add([
                    text("+40", { size: 16 }),
                    pos(player.pos.x, player.pos.y - 40),
                    color(50, 255, 50),
                    lifespan(1, { fade: 1 })
                ]);
                
                sistemaInventario.removerItemAtual();
                atualizarHUDInventario();
            }
        } else if (item.tipo === "voo") {
            // Chama a função de voo passando o tempo (10 segundos)
            player.ativarVoo(10);
            
            // Consome o item e atualiza o HUD
            sistemaInventario.removerItemAtual();
            atualizarHUDInventario();
        } else {
            player.use(body({ gravityScale: 1 })); // Restaura a gravidade
            add([
                text("Voo Desativado", { size: 14 }),
                pos(player.pos.x, player.pos.y - 30),
                color(200, 200, 200),
                lifespan(1, { fade: 1 })
            ]);
        }
    });

    // CARREGA O MAPA (tiles, colisões e spawns) - o formato depende do "tipo" do level em levels.js
    const mapa = await carregarMapa(level);
    const { larguraTotalMapa, alturaTotalMapa } = mapa;

    let spawnPlayerX = mapa.spawnPlayer.x, spawnPlayerY = mapa.spawnPlayer.y;
    const esqueletosSpawns = mapa.spawnsEsqueletos; // um item para cada "esqueleto-spawn" do Tiled
    const lobosSpawns = mapa.spawnsLobos;
    const spawnLich = mapa.spawnLich;           // posição do "lich-spawn" (ou null)

    // FUNDO
    const fundo = level.fundo;
    if (fundo) {
        if (fundo.modo === "tela") {
            // Fixo na tela: acompanha a câmera, serve para mapas grandes
            add([ sprite(fundo.sprite), pos(0, 0), scale(fundo.escala ?? 1), fixed(), z(-100) ]);
        } else {
            add([ sprite(fundo.sprite), pos(fundo.x ?? 0, fundo.y ?? 0), z(-100), scale(fundo.escala ?? 1) ]);
        }
    }

    // LIMITES DO MAPA (paredes laterais e zona de morte), proporcionais ao tamanho do mapa
    add([ rect(16, alturaTotalMapa + 1040), pos(-16, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(16, alturaTotalMapa + 1040), pos(larguraTotalMapa, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(larguraTotalMapa + 400, 100), pos(-200, alturaTotalMapa + 140), area(), body({ isStatic: true }), opacity(0), "deathZone" ]);

    // INSTANCIAÇÃO DAS ENTIDADES MODULARIZADAS
    const player = criarJogador(spawnPlayerX, spawnPlayerY, { hitboxEstreita: level.hitboxEstreita });
    // A câmera já começa em cima do jogador (evita "voar" do canto da tela em mapas altos)
    camPos(
        Math.max(1280 / 2, Math.min(larguraTotalMapa - 1280 / 2, spawnPlayerX)),
        Math.max(600 / 2, Math.min(alturaTotalMapa - 600 / 2, spawnPlayerY))
    );
    // --- PROTEÇÃO DE SPAWN CONTRA A ZONA DE MORTE ---
    // Isso evita que, se o mapa demorar 1 milissegundo extra para desenhar o chão, 
    // o jogador morra instantaneamente.
    let isSpawning = true;
    wait(1.5, () => { // 1.5 segundos de imunidade inicial ao abismo
        isSpawning = false;
    });
    // Cria um esqueleto para cada ponto "esqueleto_spawn" criado no Tiled Editor!
    esqueletosSpawns.forEach(spawn => {
        criarEsqueleto(spawn.x, spawn.y, larguraTotalMapa);
    });
    
    lobosSpawns.forEach(spawn => {
    criarLobo(spawn.x, spawn.y);
    });
    
    // ADICIONE ESTE BLOCO PARA CRIAR O LICH SE ELE TIVER SIDO ENCONTRADO NO MAPA:
    if (spawnLich) {
        criarLich(spawnLich.x, spawnLich.y);
    }

    // === GERAÇÃO DOS ITENS NO MAPA ===
    // Poção de Vida
    add([
        sprite("pocao-vida"), 
        pos(spawnPlayerX + 80, spawnPlayerY),
        scale(0.2), // <--- AJUSTE A ESCALA AQUI (ex: 0.3 ou 0.35)
        area(), 
        "item_coletavel",
        { nome: "Poção", tipo: "cura", spriteId: "pocao-vida" } // Adicionamos a referência do id do sprite aqui
    ]);

    // Asas
    add([
        sprite("asas"), 
        pos(spawnPlayerX + 160, spawnPlayerY), 
        scale(0.2), // <--- AJUSTE A ESCALA AQUI
        area(),
        "item_coletavel",
        { nome: "Asas", tipo: "voo", spriteId: "asas" } // Adicionamos a referência do id do sprite aqui
    ]);

    // HUD FIXO
    add([ rect(320, 90), pos(15, 15), color(0, 0, 0), opacity(0.6), fixed(), z(100) ]);
    add([ rect(164, 20), pos(25, 25), color(80, 80, 80), fixed(), z(101) ]);
    const hpBar = add([ rect(160, 16), pos(27, 27), color(220, 40, 40), fixed(), z(102) ]);
    add([ text(`VIDAS: ${currentLives}`, { size: 18 }), pos(25, 55), color(255, 215, 0), fixed(), z(101) ]);

    add([ rect(50, 50), pos(240, 25), color(40, 40, 50), outline(2, rgb(200, 200, 200)), fixed(), z(101) ]);
    add([ text("ITEM", { size: 10 }), pos(265, 30), anchor("center"), color(150, 150, 150), fixed(), z(102) ]);

    // CRIAMOS UM SPRITE PLACEHOLDER INICIALMENTE INVISÍVEL OU VAZIO NA HUD
    let hudItemSprite = add([
        sprite("pocao-vida"), // sprite padrão temporário
        pos(265, 53),
        anchor("center"),
        scale(0.2), // Escala menor para caber perfeitamente na caixinha da HUD
        fixed(),
        z(102)
    ]);
    hudItemSprite.hidden = true;

    atualizarHUDInventario();

    // Função que lê o objeto global e atualiza a tela com o sprite do item
    function atualizarHUDInventario() {
        const itemAtual = sistemaInventario.obterItemAtual();
        if (itemAtual) {
            hudItemSprite.use(sprite(itemAtual.spriteId)); // Altera para o sprite correto (ex: "pocao-vida" ou "asas")
            hudItemSprite.hidden = false;                  // Mostra o ícone
        } else {
            hudItemSprite.hidden = true;                   // Esconde se estiver vazio
        }
    }

    // --- HUD DA BARRA DE VIDA DO LICH (Inicialmente Oculta) ---
    const larguraBarraBoss = 400;
    
    // Fundo da barra do chefe (centralizada no topo da tela)
    const bossBarBg = add([ 
        rect(larguraBarraBoss + 8, 24), 
        pos(width() / 2, 35), 
        anchor("center"),
        color(0, 0, 0), 
        opacity(0.7), 
        fixed(), 
        z(100) 
    ]);
    bossBarBg.hidden = true;

    // Parte cinza de fundo da vida
    const bossBarBack = add([ 
        rect(larguraBarraBoss, 16), 
        pos(width() / 2, 35), 
        anchor("center"),
        color(80, 20, 20), 
        fixed(), 
        z(101) 
    ]);
    bossBarBack.hidden = true;

    // Parte vermelha dinâmica da vida do Lich
    const bossHpBar = add([ 
        rect(larguraBarraBoss, 16), 
        pos(width() / 2 - larguraBarraBoss / 2, 35), // Alinhada à esquerda da barra
        color(220, 40, 40), 
        fixed(), 
        z(102) 
    ]);
    bossHpBar.hidden = true;

    // Nome do Chefe
    const bossText = add([ 
        text("LICH - O CHEFE", { size: 14 }), 
        pos(width() / 2, 18), 
        anchor("center"), 
        color(255, 255, 255), 
        fixed(), 
        z(103) 
    ]);
    bossText.hidden = true;

    let barraBossAtiva = false; // Controla se o chefe já recebeu o primeiro golpe

    function triggerDeath() {
        if (musicaFase) {
            musicaFase.paused = true;
        }

        // --- PARA O SOM DE TODOS OS PROJÉTEIS ATIVOS AO MORRER ---
        get("projetilLich").forEach(proj => {
            if (proj.somLoop) {
                proj.somLoop.paused = true;
            }
            destroy(proj); // Opcional: remove os projéteis da tela para limpar o cenário
        });

        play("som_morte_jogador", { volume: 0.8 });

        go("death", { lives: currentLives - 1, level: idLevel });
    }

    // Função centralizada para aplicar dano, flash e knockback no Jogador
    function causarDanoJogador(quantidadeDano, posInimigoX) {
        if (player.isInvulnerable) return; // Evita dano múltiplo no mesmo segundo

        // --- SISTEMA DE VOZES ALTERNADAS AO TOMAR HIT ---
        const faixasVoz = ["voz_hit_1", "voz_hit_2", "voz_hit_3"];
        // Escolhe aleatoriamente uma das 3 faixas para não ficar repetitivo
        const somEscolhido = faixasVoz[Math.floor(Math.random() * faixasVoz.length)];
        play(somEscolhido, { volume: 0.7 });

        currentHp = Math.max(0, currentHp - quantidadeDano);
        hpBar.width = (currentHp / maxHp) * 160;
        
        if (currentHp <= 0) {
            triggerDeath();
            return;
        }

        // --- 1. EFEITO VISUAL DE FLASH (PISCAR) ---
        player.isInvulnerable = true;
        let piscadas = 0;
        const intervaloFlash = loop(0.1, () => {
            player.opacity = player.opacity === 1 ? 0.3 : 1;
            piscadas++;
            if (piscadas >= 6) { // Pisca 3 vezes (total 0.6s de imunidade visual)
                player.opacity = 1;
                player.isInvulnerable = false;
                intervaloFlash.cancel();
            }
        });

        // --- 2. CONGELAR INPUTS BREVEMENTE E APLICAR KNOCKBACK SEGURO ---
        player.isKnockbacked = true; 
        
        // Descobre o lado do perigo e aplica um tranco instantâneo na posição de forma segura
        const direcaoPerigo = (player.pos.x > posInimigoX) ? 1 : -1;
        player.pos.x += direcaoPerigo * 60; // Empurra 30 pixels para trás instantaneamente
        player.pos.y -= 15;                // Dá um pequeno salto para cima

        // Libera os inputs do jogador após 0.15 segundos
        wait(0.15, () => {
            player.isKnockbacked = false;
        });
    }

    player.onCollide("deathZone", () => {
        if (!isSpawning) { // Só morre se a proteção inicial tiver acabado
            triggerDeath();
        } else {
            // Se cair no buraco durante o spawn, teletransporta de volta para o ponto seguro
            player.pos.x = spawnPlayerX;
            player.pos.y = spawnPlayerY;
        }
    });

    player.onCollide("item_coletavel", (item) => {
        const pegou = sistemaInventario.adicionarItem(item.nome, item.tipo, item.spriteId);
        if (pegou) {
            destroy(item);
            atualizarHUDInventario(); 
        }
    }); 

    player.onCollide("ataqueInimigo", (enemy) => {
      causarDanoJogador(40, enemy.pos.x);
    });

    // NOVO: Quando o ataque do jogador encosta no esqueleto (Transforma em pilha de ossos!) ou mata o lobo
    onCollide("ataqueJogador", "enemy", (ataque, enemy) => {
        if (enemy.isDead) return; 

        // Se o inimigo for o lobo, disparamos o gatilho de morte e saímos da função
        if (enemy.isLobo) {
            enemy.trigger("death"); // Isso vai tocar o som de morte e destruir o lobo lá no lobo.js
            destroy(ataque);
            return; // Interrompe a execução para não aplicar a lógica de ressurreição da caveira
        }

        play("som_quebrar", { volume: 0.7 });
        enemy.isDead = true; 

        // Empurra o esqueleto para trás instantaneamente de forma segura
        const dirEmpurrao = (enemy.pos.x > player.pos.x) ? 1 : -1;
        enemy.pos.x += dirEmpurrao * 25; // Joga 25 pixels para trás
        enemy.pos.y -= 10;               // Dá um pequeno tranco para cima
        
        enemy.use(sprite("esqueleto_caido")); 

        // Escala da pilha de ossos:
        enemy.use(scale(0.08)); 

        enemy.use(area({ 
            width: 45, 
            height: 20, 
            offset: vec2(0, 2), 
            collisionIgnore: ["player", "enemy"] 
        }));
        
        add([
            text("CRACK!", { size: 12 }),
            pos(enemy.pos.x, enemy.pos.y - 20),
            color(200, 200, 200),
            lifespan(0.5, { fade: 0.5 })
        ]);

        // TEMPORIZADOR INTELIGENTE: Usamos uma variável e o onUpdate em vez do wait() global
        enemy.tempoRespawn = 10;
        
        const controleRespawn = enemy.onUpdate(() => {
            // Como o esqueleto mantém a tag "enemy", o togglePause() altera o enemy.paused dele.
            enemy.tempoRespawn -= dt();
            
            if (enemy.tempoRespawn <= 0) {
                if (enemy.exists()) {
                    enemy.isDead = false; 
                    enemy.isAttacking = false;
                    
                    enemy.use(sprite("esqueleto")); 
                    enemy.play("walk");
                    
                    // RESTAURAR O TAMANHO NORMAL AO REVIVER:
                    enemy.use(scale(0.4));

                    enemy.use(area({ 
                        width: 30, 
                        height: 50, 
                        offset: vec2(0, 5),
                        collisionIgnore: [] 
                    })); 
                    
                    add([
                        text("REVIVEU!", { size: 10 }),
                        pos(enemy.pos.x, enemy.pos.y - 30),
                        color(200, 50, 50),
                        lifespan(0.5, { fade: 0.5 })
                    ]);
                }
                controleRespawn.cancel();
            }
        });

        destroy(ataque);
    });

    // Quando o ataque para baixo do jogador encosta no inimigo
    onCollide("ataqueBaixoJogador", "enemy", (ataque, enemy) => {
        if (enemy.isDead) return;

        // Se o inimigo for o lobo, disparamos o gatilho de morte e saímos da função
        if (enemy.isLobo) {
            enemy.trigger("death"); // Toca o som de morte e destrói o lobo
            destroy(ataque);
            return; 
        }

        play("som_quebrar", { volume: 0.7 });
        enemy.isDead = true; 

        // Empurra o esqueleto para trás instantaneamente de forma segura
        const dirEmpurrao = (enemy.pos.x > player.pos.x) ? 1 : -1;
        enemy.pos.x += dirEmpurrao * 25; 
        enemy.pos.y -= 10;

        enemy.use(sprite("esqueleto_caido")); 

        enemy.use(scale(0.08)); 

        enemy.use(area({ 
            width: 45, 
            height: 20, 
            offset: vec2(0, 10), 
            collisionIgnore: ["player", "enemy"] 
        }));
        
        add([
            text("CRACK!", { size: 12 }),
            pos(enemy.pos.x, enemy.pos.y - 20),
            color(200, 200, 200),
            lifespan(0.5, { fade: 0.5 })
        ]);

        // Temporizador de respawn (mesma lógica dos 10 segundos)
        enemy.tempoRespawn = 10;
        const controleRespawn = enemy.onUpdate(() => {
            enemy.tempoRespawn -= dt();
            if (enemy.tempoRespawn <= 0) {
                if (enemy.exists()) {
                    enemy.isDead = false; 
                    enemy.isAttacking = false;
                    enemy.use(sprite("esqueleto")); 
                    enemy.play("walk");

                    enemy.use(scale(0.4));

                    enemy.use(area({ 
                        width: 30, 
                        height: 50, 
                        offset: vec2(0, 5),
                        collisionIgnore: [] 
                    })); 
                    
                    add([
                        text("REVIVEU!", { size: 10 }),
                        pos(enemy.pos.x, enemy.pos.y - 30),
                        color(200, 50, 50),
                        lifespan(0.5, { fade: 0.5 })
                    ]);
                }
                controleRespawn.cancel();
            }
        });

        destroy(ataque);
    });

    player.onCollide("projetilLich", (proj) => {
      causarDanoJogador(30, proj.pos.x);
      
      // Chama a função de destruição com som de explosão e parada da risada
      if (proj.destruirComExplosao) {
          proj.destruirComExplosao();
      } else {
          criarExplosaoVerde(proj.pos);
          destroy(proj);
      }
    });

    player.onCollide("raioLich", (raio) => {
      causarDanoJogador(80, raio.pos.x);
    });

    // Dano do Ataque Lateral do Jogador no Lich
    onCollide("ataqueJogador", "boss", (ataque, boss) => {
        processarDanoBoss(boss);
        destroy(ataque);
    });

    // Dano do Ataque Para Baixo do Jogador no Lich
    onCollide("ataqueBaixoJogador", "boss", (ataque, boss) => {
        processarDanoBoss(boss);
        destroy(ataque);
    });

    // Função central para aplicar o dano de 5 HP por golpe
    function processarDanoBoss(boss) {
        if (boss.isDead) return;

        play("dano_lich", { volume: 0.9 });

        // --- EFEITO VISUAL DE PISCAR DO LICH ---
        let piscadas = 0;
        const intervaloFlash = loop(0.1, () => {
            boss.opacity = boss.opacity === 1 ? 0.3 : 1;
            piscadas++;
            if (piscadas >= 4) { // Pisca 2 vezes rapidamente
                boss.opacity = 1;
                intervaloFlash.cancel();
            }
        });

        // --- KNOCKBACK DO LICH ---
        // Descobre a direção do impacto em relação ao jogador e empurra o chefe para trás
        const direcaoEmpurraoBoss = (boss.pos.x > player.pos.x) ? 1 : -1;
        boss.pos.x += direcaoEmpurraoBoss * 30; // Joga 30 pixels para trás
        boss.pos.y -= 10;                      // Dá um pequeno tranco para cima

        // Se for o primeiro golpe, revela a barra de vida no topo da tela!
        if (!barraBossAtiva) {
            barraBossAtiva = true;
            bossBarBg.hidden = false;
            bossBarBack.hidden = false;
            bossHpBar.hidden = false;
            bossText.hidden = false;
        }

        boss.hp = Math.max(0, boss.hp - 5); // Tira 5 de vida por golpe
        
        // Atualiza a largura visual da barra vermelha proporcionalmente
        bossHpBar.width = (boss.hp / boss.maxHp) * larguraBarraBoss;

        // Efeitinho de texto de dano
        add([
            text("-5", { size: 14 }),
            pos(boss.pos.x, boss.pos.y - 40),
            color(255, 255, 0),
            lifespan(0.4, { fade: 0.4 })
        ]);

        // Se a vida chegar a zero (6º golpe), o Lich morre!
        if (boss.hp <= 0) {
            boss.isDead = true;

            play("morte_lich", { volume: 0.9 });

            criarExplosaoAzul(boss.pos);
            destroy(boss);

            // Esconde a barra de vida após derrotá-lo
            bossBarBg.hidden = true;
            bossBarBack.hidden = true;
            bossHpBar.hidden = true;
            bossText.hidden = true;

            // Mensagem de vitória do chefe centralizada na tela do jogador
            add([
                text("CHEFE DERROTADO!", { size: 28 }),
                pos(center().x, center().y - 200),
                anchor("center"),
                color(100, 255, 100),
                fixed(), // <--- ADICIONADO AQUI: Trava o texto na tela independente da câmera!
                lifespan(4, { fade: 1 }) // (Opcional: Ajustei o tempo para 4 segundos para sumir depois de um tempo legal)
            ]);
        }
    }

    // Quando o jogador colide com o esqueleto por baixo
    player.onCollide("enemy", (enemy) => {
        if (enemy.isDead) return;

        // Se o jogador estiver subindo (pulando) e a posição Y do jogador for inferior à do esqueleto
        if (player.pos.y > enemy.pos.y && player.isGrounded() === false) {
            // Joga o esqueleto fortemente para cima
            enemy.pos.y -= 40; 
            
            // Se o esqueleto usa física de pulo/gravidade, podemos dar um impulso negativo de velocidade se ele tiver body()
            if (enemy.jump) {
                enemy.jump(600);
            }
        }
    });

    // Quando o jogador colide com o chefe Lich por baixo
    player.onCollide("boss", (boss) => {
        if (boss.isDead) return;

        // Verifica se o jogador está abaixo do Lich e subindo
        if (player.pos.y > boss.pos.y) {
            // Joga o Lich instantaneamente para cima
            boss.pos.y -= 50; 
        }
    });

    // ATUALIZAÇÃO DA CÂMERA (Travada nos eixos X e Y)
    player.onUpdate(() => {
        const targetPos = player.pos;
        const currentCam = camPos();
        let newX = currentCam.x + (targetPos.x - currentCam.x) * 0.2;
        let newY = currentCam.y + (targetPos.y - currentCam.y) * 0.2;

        // Limites horizontais (já funcionavam)
        newX = Math.max(1280 / 2, Math.min(larguraTotalMapa - (1280 / 2), newX));

        // Limites verticais baseados na altura do mapa (alturaTotalMapa vem do carregarMapa)
        newY = Math.max(600 / 2, Math.min(alturaTotalMapa - (600 / 2), newY));

        camPos(Math.round(newX), Math.round(newY));
    });
}