import { criarJogador } from "../entidades/jogador.js";
import { criarEsqueleto } from "../entidades/esqueletos.js";
import { criarLobo } from "../entidades/lobo.js";
import { criarSpawnerCorvos } from "../entidades/corvos.js";
import { criarGuardiao } from "../entidades/guardiao.js";
import { criarLich, criarExplosaoVerde, criarExplosaoAzul } from "../entidades/lich.js";
import { LEVELS, LEVEL_PADRAO } from "../levels.js";
import { carregarMapa } from "../mapa.js";
import { BALANCEAMENTO } from "../balanceamento.js";
import { ITENS } from "../itens.js";

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
            get("corvo").forEach(c => { c.paused = true; if (c.visual) c.visual.paused = true; });
            get("spawnerCorvos").forEach(s => { s.paused = true; });
            get("guardiao").forEach(g => { g.paused = true; });
            get("mascaraGuardiao").forEach(m => { m.paused = true; });
            get("bolaDeFogoJogador").forEach(b => { b.paused = true; if (b.visual) b.visual.paused = true; });
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
            get("corvo").forEach(c => { c.paused = false; if (c.visual) c.visual.paused = false; });
            get("spawnerCorvos").forEach(s => { s.paused = false; });
            get("guardiao").forEach(g => { g.paused = false; });
            get("mascaraGuardiao").forEach(m => { m.paused = false; });
            get("bolaDeFogoJogador").forEach(b => { b.paused = false; if (b.visual) b.visual.paused = false; });
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
        } else if (item.tipo === "mana") {
            // Só gasta a poção se faltar mana; ela recupera TODA a mana
            if (player.mana < player.manaMax) {
                player.mana = player.manaMax;

                add([
                    text("MANA CHEIA!", { size: 16 }),
                    pos(player.pos.x, player.pos.y - 40),
                    color(90, 160, 255),
                    lifespan(1, { fade: 1 })
                ]);

                sistemaInventario.removerItemAtual();
                atualizarHUDInventario();
            }
        } else if (item.tipo === "chave") {
            // A chave não se "usa" daqui: ela é gasta sozinha quando o jogador encosta na saída da fase
            add([
                text("Leve a chave até a saída", { size: 14 }),
                pos(player.pos.x, player.pos.y - 40),
                anchor("center"),
                color(255, 220, 100),
                lifespan(1.2, { fade: 1.2 })
            ]);
        } else {
            player.gravityScale = 1; // Restaura a gravidade alterando a propriedade
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
    // Cria um esqueleto para cada ponto "enemy_spawn" criado no Tiled Editor!
    esqueletosSpawns.forEach(spawn => {
        criarEsqueleto(spawn.x, spawn.y, larguraTotalMapa);
    });
    lobosSpawns.forEach(spawn => {
        criarLobo(spawn.x, spawn.y);
    });
    // ADICIONE ESTE BLOCO PARA CRIAR O LICH SE ELE TIVER SIDO ENCONTRADO NO MAPA:
    // Corvos: nascem nas folhas de uma árvore e somem nas folhas de outra (zonas "corvo-spawn" e "corvo-fim" do Tiled)
    if (mapa.zonasCorvo) {
        criarSpawnerCorvos(mapa.zonasCorvo.spawn, mapa.zonasCorvo.fim);
    }
    if (spawnLich) {
        criarLich(spawnLich.x, spawnLich.y);
    }
    // Guardião mascarado (chefe de 2 fases): um para cada ponto "guardiao-spawn" do Tiled (o ponto marca os pés dele)
    mapa.spawnsGuardioes.forEach(spawn => {
        const guardiao = criarGuardiao(spawn.x, spawn.y);
        guardiao.on("morreu", () => {
            barraGuardiaoAtiva = false;
            [guardBarBg, guardBarBack, guardHpBar, guardMarca, guardTexto].forEach(e => { e.hidden = true; });
            add([
                text("GUARDIÃO DERROTADO!", { size: 28 }),
                pos(center().x, center().y - 200),
                anchor("center"),
                color(100, 255, 100),
                fixed(),
                lifespan(4, { fade: 1 })
            ]);
        });
    });

    // === ITENS E SAÍDA DA FASE ===
    // Os itens vêm da camada de objetos do Tiled: um ponto com o nome do item ("pocao-vida", "pocao-mana", "asas",
    // "chave"). O ponto é o CENTRO do item. Sprite, tamanho e tipo de cada um ficam em itens.js.
    function criarItem(id, x, y) {
        const def = ITENS[id];
        add([
            sprite(def.sprite),
            pos(x, y),
            anchor("center"),
            scale(def.escala),
            area(),
            "item_coletavel",
            { nome: def.nome, tipo: def.tipo, spriteId: def.sprite } // spriteId: referência do sprite para a HUD do inventário
        ]);
    }
    mapa.itens.forEach(item => criarItem(item.id, item.x, item.y));

    // Levels de teste que ainda não têm itens no Tiled (levels.js: itensDeTeste) soltam os três itens ao lado do jogador
    if (level.itensDeTeste) {
        criarItem("pocao-vida", spawnPlayerX + 80, spawnPlayerY);
        criarItem("asas", spawnPlayerX + 160, spawnPlayerY);
        criarItem("pocao-mana", spawnPlayerX + 240, spawnPlayerY);
    }

    // Saída da fase: o retângulo "fim-level" do Tiled (invisível). Ver player.onCollideUpdate("fimLevel") mais abaixo.
    if (mapa.fimLevel) {
        add([
            rect(mapa.fimLevel.w, mapa.fimLevel.h),
            pos(mapa.fimLevel.x, mapa.fimLevel.y),
            area(),
            opacity(0),
            "fimLevel"
        ]);
    }

    // HUD FIXO
    add([ rect(320, 90), pos(15, 15), color(0, 0, 0), opacity(0.6), fixed(), z(100) ]);
    add([ rect(164, 20), pos(25, 25), color(80, 80, 80), fixed(), z(101) ]);
    const hpBar = add([ rect(160, 16), pos(27, 27), color(220, 40, 40), fixed(), z(102) ]);
    add([ text(`VIDAS: ${currentLives}`, { size: 18 }), pos(25, 55), color(255, 215, 0), fixed(), z(101) ]);

    // Barra de mana (azul) logo abaixo das vidas + quantas bolas de fogo ainda dá para lançar
    add([ rect(164, 16), pos(25, 76), color(40, 40, 80), fixed(), z(101) ]);
    const manaBar = add([ rect(160, 12), pos(27, 78), color(70, 140, 255), fixed(), z(102) ]);
    const manaTexto = add([ text("", { size: 11 }), pos(192, 77), color(150, 190, 255), fixed(), z(102) ]);
    let ultimaManaExibida = -1;
    onUpdate(() => {
        if (player.mana === ultimaManaExibida) return;
        ultimaManaExibida = player.mana;
        manaBar.width = (player.mana / player.manaMax) * 160;
        manaTexto.text = `MANA ${player.mana}  (x${Math.floor(player.mana / BALANCEAMENTO.mana.custoBolaDeFogo)})`;
    });

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

    // --- HUD DA BARRA DE VIDA DO GUARDIÃO (aparece no primeiro golpe; o risco branco marca os 50% da fase 2) ---
    const larguraBarraGuardiao = 400;
    const guardBarBg = add([ rect(larguraBarraGuardiao + 8, 24), pos(width() / 2, 35), anchor("center"), color(0, 0, 0), opacity(0.7), fixed(), z(100) ]);
    const guardBarBack = add([ rect(larguraBarraGuardiao, 16), pos(width() / 2, 35), anchor("center"), color(60, 30, 80), fixed(), z(101) ]);
    const guardHpBar = add([ rect(larguraBarraGuardiao, 16), pos(width() / 2 - larguraBarraGuardiao / 2, 27), color(150, 60, 220), fixed(), z(102) ]);
    const guardMarca = add([ rect(2, 16), pos(width() / 2, 27), color(255, 255, 255), opacity(0.8), fixed(), z(103) ]);
    const guardTexto = add([ text("GUARDIÃO MASCARADO", { size: 14 }), pos(width() / 2, 18), anchor("center"), color(255, 255, 255), fixed(), z(103) ]);
    [guardBarBg, guardBarBack, guardHpBar, guardMarca, guardTexto].forEach(e => { e.hidden = true; });
    let barraGuardiaoAtiva = false;

    function danificarGuardiao(guardiao, dano, direcao) {
        if (guardiao.morto) return;
        guardiao.receberDano(dano, direcao);
        guardHpBar.width = (guardiao.hp / guardiao.maxHp) * larguraBarraGuardiao;
        if (!barraGuardiaoAtiva && !guardiao.morto) {
            barraGuardiaoAtiva = true;
            [guardBarBg, guardBarBack, guardHpBar, guardMarca, guardTexto].forEach(e => { e.hidden = false; });
        }
    }

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

    // Saída da fase. Se o level exige a chave (levels.js: exigeChave) e o jogador não tem, só aparece um aviso.
    // Com a chave (ou sem essa exigência), a chave é gasta e abre o próximo level (levels.js: proximoLevel).
    let faseConcluida = false;
    let ultimoAvisoSaida = -10;
    const temChave = () => sistemaInventario.itens.some(i => i.tipo === "chave");
    function gastarChave() {
        const i = sistemaInventario.itens.findIndex(item => item.tipo === "chave");
        if (i < 0) return;
        sistemaInventario.itens.splice(i, 1);
        sistemaInventario.indiceSelecionado = Math.max(0, Math.min(sistemaInventario.indiceSelecionado, sistemaInventario.itens.length - 1));
        atualizarHUDInventario();
    }
    player.onCollideUpdate("fimLevel", (saida) => {
        if (faseConcluida) return;

        if (level.exigeChave && !temChave()) {
            if (time() - ultimoAvisoSaida > 1.5) {
                ultimoAvisoSaida = time();
                add([
                    text("Precisa da chave!", { size: 16 }),
                    pos(saida.pos.x + saida.width / 2, saida.pos.y - 20),
                    anchor("center"),
                    color(255, 120, 120),
                    lifespan(1.2, { fade: 1.2 })
                ]);
            }
            return;
        }

        faseConcluida = true;
        if (level.exigeChave) gastarChave();
        player.paused = true;
        if (musicaFase) musicaFase.paused = true;
        add([
            text("FASE CONCLUÍDA!", { size: 36 }),
            pos(center().x, center().y - 100),
            anchor("center"),
            color(100, 255, 100),
            fixed(),
            z(900)
        ]);
        wait(2, () => {
            if (level.proximoLevel) go("game", { lives: currentLives, level: level.proximoLevel });
            else go("menu");
        });
    });

    // Corvo: ao encostar no jogador explode e causa dano. Se o jogador estiver piscando (invulnerável
    // depois de um golpe), o corvo atravessa sem explodir. Espada e bola de fogo não o afetam.
    // onCollideUpdate (e não onCollide) porque o corvo pode já estar encostado quando o jogador deixa de piscar.
    player.onCollideUpdate("corvo", (corvo) => {
        if (!corvo.ativo || player.isInvulnerable) return;
        causarDanoJogador(BALANCEAMENTO.dano.corvo, corvo.pos.x);
        corvo.explodir();
    });

    player.onCollide("ataqueInimigo", (enemy) => {
      causarDanoJogador(40, enemy.pos.x);
    });

    // Golpes do Guardião (espadada e pouso): cada caixa de dano traz o seu "dano" (ver balanceamento.js)
    player.onCollide("ataqueGuardiao", (golpe) => {
      causarDanoJogador(golpe.dano, golpe.pos.x);
    });

    // === DANO NOS ESQUELETOS ===
    // Esqueletos têm vida (BALANCEAMENTO.vida.esqueleto): a espada (5) derruba em 1 golpe e a bola de fogo (3) em 2.
    // Quando a vida chega a zero ele vira uma pilha de ossos e renasce depois de 10s (com a vida cheia).
    // offsetAreaCaido: ajuste de altura da área da pilha de ossos (2 no ataque lateral, 10 no ataque para baixo).
    function danificarEsqueleto(enemy, dano, dirEmpurrao, offsetAreaCaido) {
        if (enemy.isDead) return;

        enemy.hp -= dano;

        if (enemy.hp > 0) {
            // Sobreviveu: pisca, leva um empurrãozinho e mostra o dano
            play("som_quebrar", { volume: 0.3 });
            enemy.pos.x += dirEmpurrao * 8;

            if (enemy.flashCtrl) enemy.flashCtrl.cancel();
            let piscadas = 0;
            enemy.flashCtrl = loop(0.1, () => {
                enemy.opacity = enemy.opacity === 1 ? 0.3 : 1;
                piscadas++;
                if (piscadas >= 4) {
                    enemy.opacity = 1;
                    enemy.flashCtrl.cancel();
                }
            });

            add([
                text(`-${dano}`, { size: 14 }),
                pos(enemy.pos.x, enemy.pos.y - 40),
                color(255, 255, 0),
                lifespan(0.4, { fade: 0.4 })
            ]);
            return;
        }

        // Vida zerada: vira pilha de ossos
        play("som_quebrar", { volume: 0.7 });
        enemy.isDead = true; 
        if (enemy.flashCtrl) enemy.flashCtrl.cancel();
        enemy.opacity = 1;

        // Empurra o esqueleto para trás instantaneamente de forma segura
        enemy.pos.x += dirEmpurrao * 25; // Joga 25 pixels para trás
        enemy.pos.y -= 10;               // Dá um pequeno tranco para cima
        
        enemy.use(sprite("esqueleto_caido")); 

        // AJUSTE A ESCALA DA PILHA DE OSSOS AQUI:
        enemy.use(scale(0.08)); // Mude este valor para deixar maior ou menor (ex: 0.35, 0.45)

        enemy.use(area({ 
            width: 45, 
            height: 20, 
            offset: vec2(0, offsetAreaCaido), 
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
                    enemy.hp = enemy.maxHp; // renasce com a vida cheia
                    
                    enemy.use(sprite("esqueleto")); 
                    enemy.play("walk");
                    
                    // RESTAURA O TAMANHO NORMAL AO REVIVER:
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
    }

    function danificarLobo(lobo, dano, dirEmpurrao) {
        if (lobo.isDead) return;

        lobo.hp -= dano;

        if (lobo.hp > 0) {
            // Sobreviveu ao golpe: recuo leve e efeito de piscar
            lobo.pos.x += dirEmpurrao * 8;

            if (lobo.flashCtrl) lobo.flashCtrl.cancel();
            let piscadas = 0;
            lobo.flashCtrl = loop(0.1, () => {
                lobo.opacity = lobo.opacity === 1 ? 0.3 : 1;
                piscadas++;
                if (piscadas >= 4) {
                    lobo.opacity = 1;
                    lobo.flashCtrl.cancel();
                }
            });

            add([
                text(`-${dano}`, { size: 14 }),
                pos(lobo.pos.x, lobo.pos.y - 40),
                color(255, 255, 0),
                lifespan(0.4, { fade: 0.4 })
            ]);
            return;
        }

        // A vida chegou a zero: empurra para trás e aciona a morte
        lobo.pos.x += dirEmpurrao * 15; 
        add([
            text(`-${dano}`, { size: 14 }),
            pos(lobo.pos.x, lobo.pos.y - 40),
            color(255, 50, 50),
            lifespan(0.5, { fade: 0.5 })
        ]);
    
        // Isso dispara o evento lobo.on("death") criado no lobos.js
        lobo.trigger("death"); 
    }

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

    // Ataque lateral da espada
    onCollide("ataqueJogador", "enemy", (ataque, enemy) => {
        if (enemy.isDead) return; 
        const dirEmpurrao = (enemy.pos.x > player.pos.x) ? 1 : -1;
        
        if (enemy.isLobo) {
            danificarLobo(enemy, BALANCEAMENTO.dano.espada, dirEmpurrao);
        } else {
            danificarEsqueleto(enemy, BALANCEAMENTO.dano.espada, dirEmpurrao, 2);
        }
        destroy(ataque);
    });

    // Ataque para baixo da espada
    onCollide("ataqueBaixoJogador", "enemy", (ataque, enemy) => {
        if (enemy.isDead) return;
        const dirEmpurrao = (enemy.pos.x > player.pos.x) ? 1 : -1;
        
        if (enemy.isLobo) {
            danificarLobo(enemy, BALANCEAMENTO.dano.espada, dirEmpurrao);
        } else {
            danificarEsqueleto(enemy, BALANCEAMENTO.dano.espada, dirEmpurrao, 10);
        }
        destroy(ataque);
    });

    // Bola de fogo
    onCollide("bolaDeFogoJogador", "enemy", (bola, enemy) => {
        if (bola.acabou || enemy.isDead) return;
        
        if (enemy.isLobo) {
            danificarLobo(enemy, bola.dano, bola.dir);
        } else {
            danificarEsqueleto(enemy, bola.dano, bola.dir, 2);
        }
        bola.explodir();
    });

    // Bola de fogo vs Corvo
    onCollide("bolaDeFogoJogador", "corvo", (bola, corvo) => {
        // Ignora se a bola já explodiu, se o corvo ainda está invisível nas folhas ou se já está morrendo
        if (bola.acabou || !corvo.ativo || corvo.explodindo) return;
        
        bola.explodir();   // A bola de fogo some com um clarão
        corvo.explodir();  // O corvo morre instantaneamente (1 hit)
        
        // Opcional: Feedback visual do acerto
        add([
            text("HIT!", { size: 12 }),
            pos(corvo.pos.x, corvo.pos.y - 20),
            color(255, 150, 50),
            lifespan(0.4, { fade: 0.4 })
        ]);
    });

    // Espada (Ataque lateral) vs Corvo
    onCollide("ataqueJogador", "corvo", (ataque, corvo) => {
        if (!corvo.ativo || corvo.explodindo) return;
        corvo.explodir();
        
        add([
            text("HIT!", { size: 12 }),
            pos(corvo.pos.x, corvo.pos.y - 20),
            color(255, 150, 50),
            lifespan(0.4, { fade: 0.4 })
        ]);
    });

    // Espada (Ataque para baixo) vs Corvo
    onCollide("ataqueBaixoJogador", "corvo", (ataque, corvo) => {
        if (!corvo.ativo || corvo.explodindo) return;
        corvo.explodir();
        
        add([
            text("HIT!", { size: 12 }),
            pos(corvo.pos.x, corvo.pos.y - 20),
            color(255, 150, 50),
            lifespan(0.4, { fade: 0.4 })
        ]);
    });

    // Ataque lateral da espada vs Lich
    onCollide("ataqueJogador", "boss", (ataque, boss) => {
        if (boss.isDead) return;
        const dirEmpurrao = (boss.pos.x > player.pos.x) ? 1 : -1;
        processarDanoBoss(boss, BALANCEAMENTO.dano.espada, 30, dirEmpurrao);
        destroy(ataque);
    });

    // Ataque para baixo da espada vs Lich
    onCollide("ataqueBaixoJogador", "boss", (ataque, boss) => {
        if (boss.isDead) return;
        const dirEmpurrao = (boss.pos.x > player.pos.x) ? 1 : -1;
        processarDanoBoss(boss, BALANCEAMENTO.dano.espada, 30, dirEmpurrao);
        destroy(ataque);
    });

    // Bola de fogo vs Lich
    onCollide("bolaDeFogoJogador", "boss", (bola, boss) => {
        if (bola.acabou || boss.isDead) return;
        processarDanoBoss(boss, BALANCEAMENTO.dano.espada, 15, bola.dir); // Espada/fogo tirando o dano configurado
        bola.explodir();
    });

    // Espada e bola de fogo vs Guardião
    onCollide("ataqueJogador", "guardiao", (ataque, guardiao) => {
        if (guardiao.morto) return;
        danificarGuardiao(guardiao, BALANCEAMENTO.dano.espada, (guardiao.pos.x > player.pos.x) ? 1 : -1);
        destroy(ataque);
    });
    onCollide("ataqueBaixoJogador", "guardiao", (ataque, guardiao) => {
        if (guardiao.morto) return;
        danificarGuardiao(guardiao, BALANCEAMENTO.dano.espada, (guardiao.pos.x > player.pos.x) ? 1 : -1);
        destroy(ataque);
    });
    onCollide("bolaDeFogoJogador", "guardiao", (bola, guardiao) => {
        if (bola.acabou || guardiao.morto) return;
        danificarGuardiao(guardiao, bola.dano, bola.dir);
        bola.explodir();
    });

    // Função central de dano no Lich. Espada: 5 HP e empurra 30px; bola de fogo: 3 HP e empurra 15px.
    function processarDanoBoss(boss, dano = BALANCEAMENTO.dano.espada, empurrao = 30, direcao = (boss.pos.x > player.pos.x) ? 1 : -1) {
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
        boss.pos.x += direcao * empurrao;       // Joga o chefe para trás
        boss.pos.y -= 10;                      // Dá um pequeno tranco para cima

        // Se for o primeiro golpe, revela a barra de vida no topo da tela!
        if (!barraBossAtiva) {
            barraBossAtiva = true;
            bossBarBg.hidden = false;
            bossBarBack.hidden = false;
            bossHpBar.hidden = false;
            bossText.hidden = false;
        }

        boss.hp = Math.max(0, boss.hp - dano); // Tira a vida conforme o ataque
        
        // Atualiza a largura visual da barra vermelha proporcionalmente
        bossHpBar.width = (boss.hp / boss.maxHp) * larguraBarraBoss;

        // Efeitinho de texto de dano
        add([
            text(`-${dano}`, { size: 14 }),
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