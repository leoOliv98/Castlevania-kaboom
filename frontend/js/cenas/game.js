import { criarJogador } from "../entidades/jogador.js";
import { criarEsqueleto } from "../entidades/inimigos.js";

export async function cenaJogo(data = { lives: 3 }) {
    setGravity(2400);

    let currentHp = 100;
    const maxHp = 100;
    let currentLives = data.lives; 
    let isPaused = false; 


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

    // Função para alternar o estado de pausa (Corrigida para múltiplos inimigos)
    function togglePause() {
        isPaused = !isPaused;

        // Alterna a visibilidade dos elementos de pausa
        fundoPause.hidden = !isPaused;
        tituloPause.hidden = !isPaused;
        btnResume.hidden = !isPaused;
        btnMenu.hidden = !isPaused;

        if (isPaused) {
            player.paused = true;
            get("enemy").forEach(e => {
                e.paused = true;
            });
        } else {
            player.paused = false;
            get("enemy").forEach(e => {
                e.paused = false;
            });
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
    }

    add([ sprite("background_fase1"), pos(-200, -300), z(-100), scale(3) ]);

    const larguraTotalMapa = mapWidth * tileW;
    add([ rect(16, 2000), pos(-16, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(16, 2000), pos(larguraTotalMapa, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(larguraTotalMapa + 400, 100), pos(-200, 1100), area(), body({ isStatic: true }), opacity(0), "deathZone" ]);

    // INSTANCIAÇÃO DAS ENTIDADES MODULARIZADAS
    const player = criarJogador(spawnPlayerX, spawnPlayerY);
    //const deslocamentoX = 450; 
    // Cria um esqueleto para cada ponto "enemy_spawn" criado no Tiled Editor!
    inimigosSpawns.forEach(spawn => {
        criarEsqueleto(spawn.x, spawn.y, larguraTotalMapa);
    });

    // HUD FIXO
    add([ rect(320, 90), pos(15, 15), color(0, 0, 0), opacity(0.6), fixed(), z(100) ]);
    add([ rect(164, 20), pos(25, 25), color(80, 80, 80), fixed(), z(101) ]);
    const hpBar = add([ rect(160, 16), pos(27, 27), color(220, 40, 40), fixed(), z(102) ]);
    add([ text(`VIDAS: ${currentLives}`, { size: 18 }), pos(25, 55), color(255, 215, 0), fixed(), z(101) ]);

    add([ rect(50, 50), pos(240, 25), color(40, 40, 50), outline(2, rgb(200, 200, 200)), fixed(), z(101) ]);
    add([ text("ITEM", { size: 10 }), pos(265, 30), anchor("center"), color(150, 150, 150), fixed(), z(102) ]);
    add([ text("Vazio", { size: 11 }), pos(265, 53), anchor("center"), color(100, 100, 100), fixed(), z(102) ]);

    function triggerDeath() {
        go("death", { lives: currentLives - 1 });
    }

    player.onCollide("deathZone", () => triggerDeath());

    // NOVO: Quando o ataque do inimigo encosta no jogador (dano extra da espada do esqueleto)
    player.onCollide("ataqueInimigo", () => {
        currentHp = Math.max(0, currentHp - 40); // Tira 40 de HP no ataque
        hpBar.width = (currentHp / maxHp) * 160;
        if (currentHp <= 0) triggerDeath();
    });

    // NOVO: Quando o ataque do jogador encosta no esqueleto (Mata o esqueleto!)
    onCollide("ataqueJogador", "enemy", (ataque, enemy) => {
        destroy(enemy); // O esqueleto é destruído
        
        // Opcionalzinho de charme: Cria um efeitinho na morte
        add([
            text("MORTIS", { size: 12 }),
            pos(enemy.pos.x, enemy.pos.y - 20),
            color(200, 50, 50),
            lifespan(0.5, { fade: 0.5 }) // Texto some flutuando
        ]);
    });

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