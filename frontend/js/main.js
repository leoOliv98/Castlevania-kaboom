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

loadSprite("player_ataque", "frontend/assets/sprites/Personagem-Principal-atacando.png", {
    sliceX: 5, // MUDE AQUI: Coloque o número exato de quadros da animação de ataque
    sliceY: 1,
    anims: { "ataque": { from: 0, to: 4, speed: 15, loop: false } }
});

loadSprite("esqueleto_ataque", "frontend/assets/sprites/Esqueleto-atacando.png", {
    sliceX: 5, // MUDE AQUI: Coloque o número exato de quadros do esqueleto atacando
    sliceY: 1,
    anims: { "ataque": { from: 0, to: 4, speed: 10, loop: false } }
});

// LISTA DE TODOS OS TILES DO CASTELO (Mapeados exatamente na ordem do Tiled Editor)
const tilesets = [
    "arco-direita", "arco-esquerda", "candelabro", "chao-castelo-centro",
    "chao-castelo-centro-esquerda-1", "chao-castelo-topo-1", "chao-castelo-topo-2",
    "chao-castelo-topo-direita-1", "chao-castelo-topo-esquerda", "gargula",
    "janela-baixo", "janela-grande-baixo-direita", "janela-grande-baixo-esquerda",
    "janela-grande-topo-direita", "janela-grande-topo-esquerda", "janela-topo",
    "janela-vermelha-baixo-castelo", "janela-vermelha-topo-castelo", "janelinha",
    "musgo-baixo-1", "musgo-baixo-2", "musgo-baixo-direita", "musgo-baixo-esquerda",
    "musgo-centro-1", "musgo-centro-2", "musgo-centro-direita", "musgo-centro-esquerda",
    "musgo-topo-1", "musgo-topo-2", "musgo-topo-direita", "musgo-topo-esquerda",
    "parede-castelo-quebrada", "parede-lisa-castelo", "parede-tijolo-castelo",
    "parede-tijolo-castelo-2", "parede-vermelha2-castelo", "parede-vermelha-castelo",
    "parede-vermelha-topo-castelo"
];

// Carrega os 38 tiles dinamicamente gerando os nomes "tile_1" até "tile_38"
tilesets.forEach((nomeImagem, index) => {
    const tileId = index + 1; // O Tiled soma 1 no ID das imagens
    loadSprite(`tile_${tileId}`, `frontend/assets/levels/tilesets/${nomeImagem}.png`);
});

// REGISTRO DAS CENAS
scene("menu", cenaMenu);
scene("death", cenaMorte);
scene("gameover", cenaGameOver);
scene("game", cenaJogo);

// INICIA O JOGO
go("menu");