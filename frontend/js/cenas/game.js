import { criarJogador } from "../entidades/jogador.js";
import { criarEsqueleto } from "../entidades/inimigos.js";
import { criarLich, criarExplosao } from "../entidades/lich.js";

export async function cenaJogo(data = { lives: 3 }) {
    setGravity(2400);

    let currentHp = 100;
    const maxHp = 100;
    let currentLives = data.lives; 
    let isPaused = false; 

    // INICIA A MÚSICA DE FUNDO DA FASE 1
    const musicaFase = play("musica_fase1", {
        volume: 0.5,   // Ajuste de 0.0 (mudo) a 1.0 (máximo)
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
            
            // Pausa esqueletos, o chefe Lich e todos os projéteis ativos na tela
            get("enemy").forEach(e => { e.paused = true; });
            get("boss").forEach(b => { b.paused = true; });
            get("projetilLich").forEach(p => { p.paused = true; });
            
            // Pausa a música de fundo mantendo o ponto atual
            musicaFase.paused = true; 
        } else {
            player.paused = false;
            
            // Retoma o movimento de todas as entidades
            get("enemy").forEach(e => { e.paused = false; });
            get("boss").forEach(b => { b.paused = false; });
            get("projetilLich").forEach(p => { p.paused = false; });
            
            // Retoma a música de fundo de onde parou
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

    const response = await fetch("frontend/assets/levels/level-1.tmj");
    const mapJson = await response.json();

    const mapWidth = mapJson.width;
    const tileW = mapJson.tilewidth;
    const tileH = mapJson.tileheight;

    const tileLayers = mapJson.layers.filter(layer => layer.type === "tilelayer");

    // NOVO: Lista exata dos IDs que devem ser tratados como chão ou paredes sólidas
    const blocosSolidos = [31, 29, 28, 30, 27, 24, 22, 38, 4, 35];

    tileLayers.forEach(layer => {
        const mapData = layer.data;

        mapData.forEach((tileId, index) => {
            if (tileId !== 0) {
                const x = (index % mapWidth) * tileW;
                const y = Math.floor(index / mapWidth) * tileH;
                
                // O Kaboom confere se o tileId atual está dentro da nossa lista de blocos sólidos
                const isSolid = blocosSolidos.includes(tileId);
                
                const componentes = [
                    sprite(`tile_${tileId}`),
                    pos(x, y),
                    // Blocos sólidos ficam na mesma profundidade do jogador, decorações vão pro fundo
                    z(isSolid ? 0 : -50) 
                ];

                // Adiciona a colisão APENAS se o tileId for um dos listados
                if (isSolid) {
                    componentes.push(area());
                    componentes.push(body({ isStatic: true }));
                    componentes.push("ground");
                }

                add(componentes);
            }
        });
    });

    const objectLayer = mapJson.layers.find(layer => layer.type === "objectgroup");
    let spawnPlayerX = 150, spawnPlayerY = 100;
    
    // Vamos criar uma lista (array) para guardar as posições de todos os inimigos
    let inimigosSpawns = [];
    let spawnLich = null; // Variável para guardar a posição do chefe

    if (objectLayer && objectLayer.objects) {
        // Pega o spawn do jogador
        const pObj = objectLayer.objects.find(obj => obj.name === "player-spawn");
        if (pObj) { spawnPlayerX = pObj.x; spawnPlayerY = pObj.y; }

        // Pega TODOS os objetos que têm o nome "enemy_spawn" no Tiled
        const eObjs = objectLayer.objects.filter(obj => obj.name === "enemy-spawn");
        
        // Se encontrou algum, adiciona na nossa lista de coordenadas
        if (eObjs.length > 0) {
            eObjs.forEach(e => {
                inimigosSpawns.push({ x: e.x, y: e.y });
            });
        } else {
            // Caso você esqueça de colocar no Tiled, coloca um padrão para não quebrar
            inimigosSpawns.push({ x: 500, y: 100 });
        }

        // ADICIONE ESTE BLOCO PARA CAPTURAR O LICH-SPAWN DO SEU JSON:
        const lichObj = objectLayer.objects.find(obj => obj.name === "lich-spawn");
        if (lichObj) {
        spawnLich = { x: lichObj.x, y: lichObj.y };
        }
    }

    add([ sprite("background_fase1"), pos(-200, -300), z(-100), scale(3) ]);

    const larguraTotalMapa = mapWidth * tileW;
    add([ rect(16, 2000), pos(-16, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(16, 2000), pos(larguraTotalMapa, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(larguraTotalMapa + 400, 100), pos(-200, 1100), area(), body({ isStatic: true }), opacity(0), "deathZone" ]);

    // INSTANCIAÇÃO DAS ENTIDADES MODULARIZADAS
    const player = criarJogador(spawnPlayerX, spawnPlayerY);
    // Cria um esqueleto para cada ponto "enemy_spawn" criado no Tiled Editor!
    inimigosSpawns.forEach(spawn => {
        criarEsqueleto(spawn.x, spawn.y, larguraTotalMapa);
    });
    // ADICIONE ESTE BLOCO PARA CRIAR O LICH SE ELE TIVER SIDO ENCONTRADO NO MAPA:
    if (spawnLich) {
        criarLich(spawnLich.x, spawnLich.y);
    }

    // HUD FIXO
    add([ rect(320, 90), pos(15, 15), color(0, 0, 0), opacity(0.6), fixed(), z(100) ]);
    add([ rect(164, 20), pos(25, 25), color(80, 80, 80), fixed(), z(101) ]);
    const hpBar = add([ rect(160, 16), pos(27, 27), color(220, 40, 40), fixed(), z(102) ]);
    add([ text(`VIDAS: ${currentLives}`, { size: 18 }), pos(25, 55), color(255, 215, 0), fixed(), z(101) ]);

    add([ rect(50, 50), pos(240, 25), color(40, 40, 50), outline(2, rgb(200, 200, 200)), fixed(), z(101) ]);
    add([ text("ITEM", { size: 10 }), pos(265, 30), anchor("center"), color(150, 150, 150), fixed(), z(102) ]);
    add([ text("Vazio", { size: 11 }), pos(265, 53), anchor("center"), color(100, 100, 100), fixed(), z(102) ]);

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
        // CORREÇÃO: Pausa o som atribuindo true à propriedade paused do objeto de áudio
        if (musicaFase) {
            musicaFase.paused = true;
        }
        go("death", { lives: currentLives - 1 });
    }

    player.onCollide("deathZone", () => triggerDeath());

    // NOVO: Quando o ataque do inimigo encosta no jogador (dano extra da espada do esqueleto)
    player.onCollide("ataqueInimigo", () => {
        currentHp = Math.max(0, currentHp - 40); // Tira 40 de HP no ataque
        hpBar.width = (currentHp / maxHp) * 160;
        if (currentHp <= 0) triggerDeath();
    });

    // NOVO: Quando o ataque do jogador encosta no esqueleto (Transforma em pilha de ossos!)
    onCollide("ataqueJogador", "enemy", (ataque, enemy) => {
        if (enemy.isDead) return; 

        play("som_quebrar", { volume: 0.7 });
        enemy.isDead = true; 
        
        enemy.use(sprite("esqueleto_caido")); 
        
        // ADICIONE OU AJUSTE A ESCALA DA PILHA DE OSSOS AQUI:
        enemy.use(scale(0.08)); // Mude este valor para deixar maior ou menor (ex: 0.35, 0.45)

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
            // Quando pausado, o Kaboom automaticamente congela o onUpdate, travando esse cronômetro!
            enemy.tempoRespawn -= dt();
            
            if (enemy.tempoRespawn <= 0) {
                if (enemy.exists()) {
                    enemy.isDead = false; 
                    enemy.isAttacking = false;
                    
                    enemy.use(sprite("esqueleto")); 
                    enemy.play("walk");
                    
                    // ADICIONE ESTA LINHA PARA RESTAURAR O TAMANHO NORMAL AO REVIVER:
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
                // Encerra esse cronômetro para ele não continuar rodando em loop
                controleRespawn.cancel();
            }
        });
    });

    // Quando o ataque para baixo do jogador encosta no esqueleto
    onCollide("ataqueBaixoJogador", "enemy", (ataque, enemy) => {
        if (enemy.isDead) return;

        play("som_quebrar", { volume: 0.7 });
        enemy.isDead = true; 

        enemy.use(sprite("esqueleto_caido")); 

        // ADICIONE OU AJUSTE A ESCALA DA PILHA DE OSSOS AQUI TAMBÉM:
        enemy.use(scale(0.08)); // Mude para o mesmo valor do ataque lateral

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

                    // ADICIONE ESTA LINHA PARA RESTAURAR O TAMANHO NORMAL AO REVIVER:
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
    });

    player.onCollide("projetilLich", (proj) => {
        // Cria a explosão na posição atual do projétil antes de destruí-lo
        criarExplosao(proj.pos);

        destroy(proj);
        currentHp = Math.max(0, currentHp - 30);
        hpBar.width = (currentHp / maxHp) * 160;
        if (currentHp <= 0) triggerDeath();
    });

    player.onCollide("raioLich", () => {
        // Tira 80 de dano (80% da vida total que é 100)
        currentHp = Math.max(0, currentHp - 80); 
        hpBar.width = (currentHp / maxHp) * 160;
        if (currentHp <= 0) triggerDeath();
    });

    // Dano do Ataque Lateral do Jogador no Lich
    onCollide("ataqueJogador", "boss", (ataque, boss) => {
        processarDanoBoss(boss);
    });

    // Dano do Ataque Para Baixo do Jogador no Lich
    onCollide("ataqueBaixoJogador", "boss", (ataque, boss) => {
        processarDanoBoss(boss);
    });

    // Função central para aplicar o dano de 5 HP por golpe
    function processarDanoBoss(boss) {
        if (boss.isDead) return;

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
            criarExplosao(boss.pos);
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

    // ATUALIZAÇÃO DA CÂMERA (Travada nos eixos X e Y)
    player.onUpdate(() => {
        const targetPos = player.pos;
        const currentCam = camPos();
        let newX = currentCam.x + (targetPos.x - currentCam.x) * 0.2;
        let newY = currentCam.y + (targetPos.y - currentCam.y) * 0.2;

        // Limites horizontais (já funcionavam)
        newX = Math.max(1280 / 2, Math.min(larguraTotalMapa - (1280 / 2), newX));

        // NOVOS: Limites verticais baseados na altura do mapa (20 tiles * 48 pixels = 960 pixels de altura total)
        const alturaTotalMapa = mapJson.height * tileH; 
        newY = Math.max(600 / 2, Math.min(alturaTotalMapa - (600 / 2), newY));

        camPos(Math.round(newX), Math.round(newY));
    });
}