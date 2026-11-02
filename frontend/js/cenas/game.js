import { criarJogador } from "../entidades/jogador.js";
import { criarEsqueleto } from "../entidades/inimigos.js";

export async function cenaJogo(data = { lives: 3 }) {
    setGravity(2400);

    let currentHp = 100;
    const maxHp = 100;
    let currentLives = data.lives;

    const response = await fetch("frontend/assets/levels/level-1.tmj");
    const mapJson = await response.json();

    const tileLayer = mapJson.layers.find(layer => layer.type === "tilelayer");
    const mapData = tileLayer.data;
    const mapWidth = mapJson.width;
    const tileW = mapJson.tilewidth;
    const tileH = mapJson.tileheight;

    mapData.forEach((tileId, index) => {
        if (tileId !== 0) {
            const x = (index % mapWidth) * tileW;
            const y = Math.floor(index / mapWidth) * tileH;
            add([
                sprite(`tile_${tileId}`),
                pos(x, y),
                area(),
                body({ isStatic: true }),
                "ground"
            ]);
        }
    });

    const objectLayer = mapJson.layers.find(layer => layer.type === "objectgroup");
    let spawnPlayerX = 150, spawnPlayerY = 100;
    let spawnEnemyX = 500, spawnEnemyY = 100;

    if (objectLayer && objectLayer.objects) {
        const pObj = objectLayer.objects.find(obj => obj.name === "player_spawn");
        if (pObj) { spawnPlayerX = pObj.x; spawnPlayerY = pObj.y; }
        const eObj = objectLayer.objects.find(obj => obj.name === "enemy_spawn");
        if (eObj) { spawnEnemyX = eObj.x; spawnEnemyY = eObj.y; }
    }

    add([ sprite("background_fase1"), pos(-200, -300), z(-100), scale(3) ]);

    const larguraTotalMapa = mapWidth * tileW;
    add([ rect(16, 2000), pos(-16, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(16, 2000), pos(larguraTotalMapa, -500), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(larguraTotalMapa + 400, 100), pos(-200, 1100), area(), body({ isStatic: true }), opacity(0), "deathZone" ]);

    // INSTANCIAÇÃO DAS ENTIDADES MODULARIZADAS
    const player = criarJogador(spawnPlayerX, spawnPlayerY);
    const deslocamentoX = 450; 
    const enemy = criarEsqueleto(spawnEnemyX + deslocamentoX, spawnEnemyY, larguraTotalMapa);

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

    player.onCollide("enemy", () => {
        currentHp = Math.max(0, currentHp - 30);
        hpBar.width = (currentHp / maxHp) * 160;
        if (currentHp <= 0) triggerDeath();
    });

    // ATUALIZAÇÃO DA CÂMERA
    player.onUpdate(() => {
        const targetPos = player.pos;
        const currentCam = camPos();
        let newX = currentCam.x + (targetPos.x - currentCam.x) * 0.2;
        let newY = currentCam.y + (targetPos.y - currentCam.y) * 0.2;

        newX = Math.max(1280 / 2, Math.min(larguraTotalMapa - (1280 / 2), newX));
        camPos(newX, Math.round(newY));
    });
}