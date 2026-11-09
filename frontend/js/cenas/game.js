import { criarJogador } from "../entidades/jogador.js";
import { criarEsqueleto } from "../entidades/esqueletos.js";
import { criarLobo } from "../entidades/lobo.js";
import { criarSpawnerCorvos } from "../entidades/corvos.js";
import { criarLich, criarExplosaoVerde, criarExplosaoAzul } from "../entidades/lich.js";
import { LEVELS, LEVEL_PADRAO } from "../levels.js";
import { carregarMapa } from "../mapa.js";
import { BALANCEAMENTO } from "../balanceamento.js";

export async function cenaJogo(data = { lives: 3 }) {
    setGravity(2400);

    // Qual fase carregar (ver levels.js). Sem "level" no data, abre a fase padrão.
    const idLevel = data.level ?? LEVEL_PADRAO;
    const level = LEVELS[idLevel];
    if (!level) throw new Error(`Level "${idLevel}" não existe em levels.js`);

    // --- CRONÔMETRO DA FASE E CONTROLE DE ESTADO ---
    let tempoDecorridoSegundos = 0;
    let jogoEncerrado = false;

    function formatarTempo(totalSegundos) {
        const min = Math.floor(totalSegundos / 60);
        const seg = Math.floor(totalSegundos % 60);
        return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
    }

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
    const fundoPause = add([
        rect(width(), height()),
        color(10, 10, 15),
        opacity(0.85),
        fixed(),
        z(900)
    ]);
    fundoPause.hidden = true;

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
    btnMenu.hidden = true;

    // Função para alternar o estado de pausa
    function togglePause() {
        if (jogoEncerrado) return; // Impede pausar se o jogo já acabou
        isPaused = !isPaused;

        fundoPause.hidden = !isPaused;
        tituloPause.hidden = !isPaused;
        btnResume.hidden = !isPaused;
        btnMenu.hidden = !isPaused;

        if (isPaused) {
            player.paused = true;
            get("enemy").forEach(e => { e.paused = true; });
            get("boss").forEach(b => { b.paused = true; });
            get("projetilLich").forEach(p => { 
                p.paused = true; 
                if (p.somLoop) p.somLoop.paused = true;
            });
            get("raioLich").forEach(r => { r.paused = true; });
            get("corvo").forEach(c => { c.paused = true; if (c.visual) c.visual.paused = true; });
            get("spawnerCorvos").forEach(s => { s.paused = true; });
            get("bolaDeFogoJogador").forEach(b => { b.paused = true; if (b.visual) b.visual.paused = true; });
            get("avisoRaio").forEach(a => { a.paused = true; }); 
            musicaFase.paused = true; 
        } else {
            player.paused = false;
            get("enemy").forEach(e => { e.paused = false; });
            get("boss").forEach(b => { b.paused = false; });
            get("projetilLich").forEach(p => { 
                p.paused = false; 
                if (p.somLoop) p.somLoop.paused = false;
            });
            get("raioLich").forEach(r => { r.paused = false; });
            get("corvo").forEach(c => { c.paused = false; if (c.visual) c.visual.paused = false; });
            get("spawnerCorvos").forEach(s => { s.paused = false; });
            get("bolaDeFogoJogador").forEach(b => { b.paused = false; if (b.visual) b.visual.paused = false; });
            get("avisoRaio").forEach(a => { a.paused = false; }); 
            musicaFase.paused = false; 
        }
    }

    onKeyPress("escape", () => { togglePause(); });
    onKeyPress("m", () => { if (isPaused) go("menu"); });

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
            player.ativarVoo(10);
            sistemaInventario.removerItemAtual();
            atualizarHUDInventario();
        } else if (item.tipo === "mana") {
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
        }
    });

    // CARREGA O MAPA
    const mapa = await carregarMapa(level);
    const { larguraTotalMapa, alturaTotalMapa } = mapa;

    let spawnPlayerX = mapa.spawnPlayer.x, spawnPlayerY = mapa.spawnPlayer.y;
    const esqueletosSpawns = mapa.spawnsEsqueletos;
    const lobosSpawns = mapa.spawnsLobos;
    const spawnLich = mapa.spawnLich;

    // FUNDO
    const fundo = level.fundo;
    if (fundo) {
        if (fundo.modo === "tela") {
            add([ sprite(fundo.sprite), pos(0, 0), scale(fundo.escala ?? 1), fixed(), z(-100) ]);
        } else {
            add([ sprite(fundo.sprite), pos(fundo.x ?? 0, fundo.y ?? 0), z(-100), scale(fundo.escala ?? 1) ]);
        }
    }

    // LIMITES DO MAPA
    add([ rect(16, alturaTotalMapa + 1040), pos(-16, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(16, alturaTotalMapa + 1040), pos(larguraTotalMapa, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(larguraTotalMapa + 400, 100), pos(-200, alturaTotalMapa + 140), area(), body({ isStatic: true }), opacity(0), "deathZone" ]);

    // INSTANCIAÇÃO DAS ENTIDADES
    const player = criarJogador(spawnPlayerX, spawnPlayerY, { hitboxEstreita: level.hitboxEstreita });
    camPos(
        Math.max(1280 / 2, Math.min(larguraTotalMapa - 1280 / 2, spawnPlayerX)),
        Math.max(600 / 2, Math.min(alturaTotalMapa - 600 / 2, spawnPlayerY))
    );

    let isSpawning = true;
    wait(1.5, () => { isSpawning = false; });

    esqueletosSpawns.forEach(spawn => { criarEsqueleto(spawn.x, spawn.y, larguraTotalMapa); });
    lobosSpawns.forEach(spawn => { criarLobo(spawn.x, spawn.y); });
    if (mapa.zonasCorvo) { criarSpawnerCorvos(mapa.zonasCorvo.spawn, mapa.zonasCorvo.fim); }
    if (spawnLich) { criarLich(spawnLich.x, spawnLich.y); }

    // === GERAÇÃO DOS ITENS NO MAPA ===
    add([ sprite("pocao-vida"), pos(spawnPlayerX + 80, spawnPlayerY), scale(0.2), area(), "item_coletavel", { nome: "Poção", tipo: "cura", spriteId: "pocao-vida" } ]);
    add([ sprite("asas"), pos(spawnPlayerX + 160, spawnPlayerY), scale(0.2), area(), "item_coletavel", { nome: "Asas", tipo: "voo", spriteId: "asas" } ]);
    add([ sprite("pocao-mana"), pos(spawnPlayerX + 240, spawnPlayerY), scale(0.2), area(), "item_coletavel", { nome: "Poção de Mana", tipo: "mana", spriteId: "pocao-mana" } ]);

    // HUD FIXO + CRONÔMETRO NA TELA
    add([ rect(350, 90), pos(15, 15), color(0, 0, 0), opacity(0.6), fixed(), z(100) ]);
    add([ rect(164, 20), pos(25, 25), color(80, 80, 80), fixed(), z(101) ]);
    const hpBar = add([ rect(160, 16), pos(27, 27), color(220, 40, 40), fixed(), z(102) ]);
    add([ text(`VIDAS: ${currentLives}`, { size: 16 }), pos(25, 53), color(255, 215, 0), fixed(), z(101) ]);

    // Texto do Cronômetro em tempo real na HUD (formato MM:SS)
    const hudTempo = add([ text("TEMPO: 00:00", { size: 16 }), pos(125, 53), color(100, 255, 218), fixed(), z(101) ]);
    onUpdate(() => {
        if (jogoEncerrado || isPaused) return;
        tempoDecorridoSegundos += dt();
        hudTempo.text = `TEMPO: ${formatarTempo(tempoDecorridoSegundos)}`;
    });

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

    add([ rect(50, 50), pos(300, 25), color(40, 40, 50), outline(2, rgb(200, 200, 200)), fixed(), z(101) ]);
    add([ text("ITEM", { size: 10 }), pos(325, 30), anchor("center"), color(150, 150, 150), fixed(), z(102) ]);

    let hudItemSprite = add([
        sprite("pocao-vida"),
        pos(325, 53),
        anchor("center"),
        scale(0.2),
        fixed(),
        z(102)
    ]);
    hudItemSprite.hidden = true;

    atualizarHUDInventario();

    function atualizarHUDInventario() {
        const itemAtual = sistemaInventario.obterItemAtual();
        if (itemAtual) {
            hudItemSprite.use(sprite(itemAtual.spriteId));
            hudItemSprite.hidden = false;
        } else {
            hudItemSprite.hidden = true;
        }
    }

    // --- HUD DA BARRA DE VIDA DO LICH ---
    const larguraBarraBoss = 400;
    const bossBarBg = add([ rect(larguraBarraBoss + 8, 24), pos(width() / 2, 35), anchor("center"), color(0, 0, 0), opacity(0.7), fixed(), z(100) ]);
    bossBarBg.hidden = true;
    const bossBarBack = add([ rect(larguraBarraBoss, 16), pos(width() / 2, 35), anchor("center"), color(80, 20, 20), fixed(), z(101) ]);
    bossBarBack.hidden = true;
    const bossHpBar = add([ rect(larguraBarraBoss, 16), pos(width() / 2 - larguraBarraBoss / 2, 35), color(220, 40, 40), fixed(), z(102) ]);
    bossHpBar.hidden = true;
    const bossText = add([ text("LICH - O CHEFE", { size: 14 }), pos(width() / 2, 18), anchor("center"), color(255, 255, 255), fixed(), z(103) ]);
    bossText.hidden = true;

    let barraBossAtiva = false;

    // =========================================================================
    // FUNÇÃO DE REGISTRO E COMUNICAÇÃO COM O SERVIDOR (API)
    // =========================================================================
    async function finalizarFase(statusVitoria) {
        if (jogoEncerrado) return;
        jogoEncerrado = true;

        const tempoTotal = Math.floor(tempoDecorridoSegundos);
        hudTempo.text = `TEMPO: ${formatarTempo(tempoTotal)}`;

        const dadosPartida = {
            status: statusVitoria ? "VITORIA" : "DERROTA",
            tempoSegundos: tempoTotal,
            username: localStorage.getItem("loggedUser") || localStorage.getItem("username") || "Jogador"
        };

        // Envia os dados para a rota do server.js
        try {
            await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosPartida)
            });
        } catch (error) {
            console.error("Erro ao sincronizar pontuação com a web:", error);
        }

        return tempoTotal;
    }

    function triggerDeath() {
        if (jogoEncerrado) return;
        
        const tempoFinal = Math.floor(tempoDecorridoSegundos);
        // Registra derrota no servidor antes de transacionar
        finalizarFase(false);

        if (musicaFase) {
            musicaFase.paused = true;
        }

        get("projetilLich").forEach(proj => {
            if (proj.somLoop) { proj.somLoop.paused = true; }
            destroy(proj);
        });

        play("som_morte_jogador", { volume: 0.8 });
        go("death", { lives: currentLives - 1, level: idLevel, tempo: tempoFinal });
    }

    function causarDanoJogador(quantidadeDano, posInimigoX) {
        if (player.isInvulnerable || jogoEncerrado) return;

        const faixasVoz = ["voz_hit_1", "voz_hit_2", "voz_hit_3"];
        const somEscolhido = faixasVoz[Math.floor(Math.random() * faixasVoz.length)];
        play(somEscolhido, { volume: 0.7 });

        currentHp = Math.max(0, currentHp - quantidadeDano);
        hpBar.width = (currentHp / maxHp) * 160;
        
        if (currentHp <= 0) {
            triggerDeath();
            return;
        }

        player.isInvulnerable = true;
        let piscadas = 0;
        const intervaloFlash = loop(0.1, () => {
            player.opacity = player.opacity === 1 ? 0.3 : 1;
            piscadas++;
            if (piscadas >= 6) {
                player.opacity = 1;
                player.isInvulnerable = false;
                intervaloFlash.cancel();
            }
        });

        player.isKnockbacked = true; 
        const direcaoPerigo = (player.pos.x > posInimigoX) ? 1 : -1;
        player.pos.x += direcaoPerigo * 60;
        player.pos.y -= 15;

        wait(0.15, () => {
            player.isKnockbacked = false;
        });
    }

    player.onCollide("deathZone", () => {
        if (!isSpawning) {
            triggerDeath();
        } else {
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

    player.onCollideUpdate("corvo", (corvo) => {
        if (!corvo.ativo || player.isInvulnerable) return;
        causarDanoJogador(BALANCEAMENTO.dano.corvo, corvo.pos.x);
        corvo.explodir();
    });

    player.onCollide("ataqueInimigo", (enemy) => {
        causarDanoJogador(40, enemy.pos.x);
    });

    function danificarEsqueleto(enemy, dano, dirEmpurrao, offsetAreaCaido) {
        if (enemy.isDead) return;
        enemy.hp -= dano;

        if (enemy.hp > 0) {
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

        play("som_quebrar", { volume: 0.7 });
        enemy.isDead = true; 
        if (enemy.flashCtrl) enemy.flashCtrl.cancel();
        enemy.opacity = 1;
        enemy.pos.x += dirEmpurrao * 25;
        enemy.pos.y -= 10;
        
        enemy.use(sprite("esqueleto_caido")); 
        enemy.use(scale(0.08));
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

        enemy.tempoRespawn = 10;
        const controleRespawn = enemy.onUpdate(() => {
            enemy.tempoRespawn -= dt();
            if (enemy.tempoRespawn <= 0) {
                if (enemy.exists()) {
                    enemy.isDead = false; 
                    enemy.isAttacking = false;
                    enemy.hp = enemy.maxHp;
                    
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
    }

    function danificarLobo(lobo, dano, dirEmpurrao) {
        if (lobo.isDead) return;
        lobo.hp -= dano;

        if (lobo.hp > 0) {
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

        lobo.pos.x += dirEmpurrao * 15; 
        add([
            text(`-${dano}`, { size: 14 }),
            pos(lobo.pos.x, lobo.pos.y - 40),
            color(255, 50, 50),
            lifespan(0.5, { fade: 0.5 })
        ]);
        lobo.trigger("death"); 
    }

    player.onCollide("projetilLich", (proj) => {
        causarDanoJogador(30, proj.pos.x);
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

    onCollide("bolaDeFogoJogador", "enemy", (bola, enemy) => {
        if (bola.acabou || enemy.isDead) return;
        if (enemy.isLobo) {
            danificarLobo(enemy, bola.dano, bola.dir);
        } else {
            danificarEsqueleto(enemy, bola.dano, bola.dir, 2);
        }
        bola.explodir();
    });

    onCollide("bolaDeFogoJogador", "corvo", (bola, corvo) => {
        if (bola.acabou || !corvo.ativo || corvo.explodindo) return;
        bola.explodir(); 
        corvo.explodir(); 
        add([
            text("HIT!", { size: 12 }),
            pos(corvo.pos.x, corvo.pos.y - 20),
            color(255, 150, 50),
            lifespan(0.4, { fade: 0.4 })
        ]);
    });

    // Dano dos ataques do Jogador no Chefe (Lich)
    onCollide("ataqueJogador", "boss", (ataque, boss) => {
        if (boss.isDead) return;
        processarDanoBoss(boss, BALANCEAMENTO.dano.espada, 30);
        destroy(ataque);
    });

    onCollide("ataqueBaixoJogador", "boss", (ataque, boss) => {
        if (boss.isDead) return;
        processarDanoBoss(boss, BALANCEAMENTO.dano.espada, 30);
        destroy(ataque);
    });

    onCollide("bolaDeFogoJogador", "boss", (bola, boss) => {
        if (bola.acabou || boss.isDead) return;
        processarDanoBoss(boss, bola.dano, 15, bola.dir);
        bola.explodir();
    });

    function processarDanoBoss(boss, dano = BALANCEAMENTO.dano.espada, empurrao = 30, direcao = (boss.pos.x > player.pos.x) ? 1 : -1) {
        if (boss.isDead) return;

        play("dano_lich", { volume: 0.9 });

        let piscadas = 0;
        const intervaloFlash = loop(0.1, () => {
            boss.opacity = boss.opacity === 1 ? 0.3 : 1;
            piscadas++;
            if (piscadas >= 4) {
                boss.opacity = 1;
                intervaloFlash.cancel();
            }
        });

        boss.pos.x += direcao * empurrao; 
        boss.pos.y -= 10; 

        if (!barraBossAtiva) {
            barraBossAtiva = true;
            bossBarBg.hidden = false;
            bossBarBack.hidden = false;
            bossHpBar.hidden = false;
            bossText.hidden = false;
        }

        boss.hp = Math.max(0, boss.hp - dano); 
        bossHpBar.width = (boss.hp / boss.maxHp) * larguraBarraBoss;

        add([
            text(`-${dano}`, { size: 14 }),
            pos(boss.pos.x, boss.pos.y - 40),
            color(255, 255, 0),
            lifespan(0.4, { fade: 0.4 })
        ]);

        if (boss.hp <= 0) {
            boss.isDead = true;

            const tempoFinal = Math.floor(tempoDecorridoSegundos);
            // --- REGISTRA VITÓRIA NO SERVIDOR E WEBPAGE ---
            finalizarFase(true);

            play("morte_lich", { volume: 0.9 });
            criarExplosaoAzul(boss.pos);
            destroy(boss);

            bossBarBg.hidden = true;
            bossBarBack.hidden = true;
            bossHpBar.hidden = true;
            bossText.hidden = true;

            add([
                text("CHEFE DERROTADO!", { size: 28 }),
                pos(center().x, center().y - 200),
                anchor("center"),
                color(100, 255, 100),
                fixed(),
                lifespan(4, { fade: 1 })
            ]);

            add([
                text(`TEMPO REGISTRADO: ${formatarTempo(tempoFinal)}`, { size: 22 }),
                pos(center().x, center().y - 160),
                anchor("center"),
                color(255, 215, 0),
                fixed(),
                lifespan(4, { fade: 1 })
            ]);

            // Redireciona para o dashboard/painel web após 3 segundos da vitória
            wait(3, () => {
                window.location.href = "/dashboard.html";
            });
        }
    }

    player.onCollide("enemy", (enemy) => {
        if (enemy.isDead) return;
        if (player.pos.y > enemy.pos.y && player.isGrounded() === false) {
            enemy.pos.y -= 40; 
            if (enemy.jump) { enemy.jump(600); }
        }
    });

    player.onCollide("boss", (boss) => {
        if (boss.isDead) return;
        if (player.pos.y > boss.pos.y) {
            boss.pos.y -= 50; 
        }
    });

    player.onUpdate(() => {
        const targetPos = player.pos;
        const currentCam = camPos();
        let newX = currentCam.x + (targetPos.x - currentCam.x) * 0.2;
        let newY = currentCam.y + (targetPos.y - currentCam.y) * 0.2;

        newX = Math.max(1280 / 2, Math.min(larguraTotalMapa - (1280 / 2), newX));
        newY = Math.max(600 / 2, Math.min(alturaTotalMapa - (600 / 2), newY));

        camPos(Math.round(newX), Math.round(newY));
    });
}