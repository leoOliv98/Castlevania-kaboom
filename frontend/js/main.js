import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
import { cenaMenu, cenaMorte, cenaGameOver } from "./cenas/menu.js";
import { cenaJogo } from "./cenas/game.js";

kaboom({
    background: [20, 20, 30],
    width: 1280, 
    height: 600,
    letterbox: true, 
    stretch: true,   
    scale: 1,  
});

// CARREGAMENTO DOS ASSETS
loadSprite("background_fase1", "frontend/assets/sprites/fundo-castelo.png");

loadSprite("player", "frontend/assets/sprites/Personagem-Principal-andando.png", {
    sliceX: 6,
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 }, 
        "walk": { from: 0, to: 5, speed: 12, loop: true }
    }
}); 

loadSprite("esqueleto", "frontend/assets/sprites/Esqueleto-andando.png", {
    sliceX: 8, 
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 },
        "walk": { from: 0, to: 7, speed: 8, loop: true }
    }
});

loadSprite("tile_18", "frontend/assets/levels/tilesets/musgo-topo-esquerda.png");
loadSprite("tile_15", "frontend/assets/levels/tilesets/musgo-topo-1.png");
loadSprite("tile_17", "frontend/assets/levels/tilesets/musgo-topo-direita.png");
loadSprite("tile_14", "frontend/assets/levels/tilesets/musgo-centro-esquerda.png");
loadSprite("tile_11", "frontend/assets/levels/tilesets/musgo-centro-1.png");
loadSprite("tile_13", "frontend/assets/levels/tilesets/musgo-centro-direita.png");
loadSprite("tile_16", "frontend/assets/levels/tilesets/musgo-topo-2.png");

// REGISTRO DAS CENAS
scene("menu", cenaMenu);
scene("death", cenaMorte);
scene("gameover", cenaGameOver);
scene("game", cenaJogo);

// INICIA O JOGO
go("menu");