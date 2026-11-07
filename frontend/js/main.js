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
loadSprite("background_fase1", "frontend/assets/sprites/fundo-floresta.png");

loadSprite("player", "frontend/assets/sprites/Personagem-Principal-andando.png", {
    sliceX: 6,
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 }, 
        "walk": { from: 0, to: 5, speed: 12, loop: true }
    }
}); 

loadSprite("player_ataque", "frontend/assets/sprites/Personagem-Principal-atacando.png", {
    sliceX: 5, // MUDE AQUI: Coloque o número exato de quadros da animação de ataque
    sliceY: 1,
    anims: { "ataque": { from: 0, to: 4, speed: 15, loop: false } }
});

loadSprite("player_ataque_baixo", "frontend/assets/sprites/ataque-pulo-para-baixo.png", {
    sliceX: 4, // A imagem tem exatamente 4 quadros lado a lado
    sliceY: 1,
    anims: { 
        "ataque_baixo": { from: 0, to: 3, speed: 12, loop: false } 
    }
});

loadSprite("player_voando", "frontend/assets/sprites/mago-voando.png", {
    sliceX: 7,  // A imagem anexada possui 8 quadros de animação horizontalmente
    sliceY: 1,
    anims: {
        voar: { from: 0, to: 6, loop: true, speed: 12 }, 
    },
});

loadSprite("esqueleto", "frontend/assets/sprites/Esqueleto-andando.png", {
    sliceX: 8, 
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 },
        "walk": { from: 0, to: 7, speed: 8, loop: true }
    }
});

loadSprite("esqueleto_ataque", "frontend/assets/sprites/Esqueleto-atacando.png", {
    sliceX: 5, // MUDE AQUI: Coloque o número exato de quadros do esqueleto atacando
    sliceY: 1,
    anims: { "ataque": { from: 0, to: 4, speed: 10, loop: false } }
});

loadSprite("esqueleto_caido", "frontend/assets/sprites/esqueleto-caido.png");

loadSprite("lobo_correndo", "frontend/assets/sprites/lobo-correndo.png", {
    sliceX: 4, // Agora são 4 quadros na horizontal (colunas)
    sliceY: 2, // E 2 quadros na vertical (linhas)
    anims: {
        // A animação continua indo do quadro 0 ao 7. 
        // O Kaboom lê da esquerda para direita, de cima para baixo automaticamente.
        "walk": { from: 0, to: 7, speed: 12, loop: true } 
    }
});

loadSprite("lobo_atacando", "frontend/assets/sprites/lobo-atacando.png", {
    sliceX: 5,
    sliceY: 1,
    anims: {
        "ataque": { from: 0, to: 4, speed: 12, loop: false }
    }
});

loadSprite("lobo_morrendo", "frontend/assets/sprites/lobo-morrendo.png", {
    sliceX: 5,
    sliceY: 1,
    anims: {
        morte: { from: 0, to: 4, loop: false, speed: 10 }
    }
});

// Carregamento do Lich e seu projétil
loadSprite("lich", "frontend/assets/sprites/lich-voando.png", {
    sliceX: 5, 
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 },
        "walk": { from: 0, to: 4, speed: 5, loop: true }
    }
});
loadSprite("lich_ataque", "frontend/assets/sprites/lich-atacando-projetil.png", {
    sliceX: 4, // A imagem possui exatamente 4 quadros
    sliceY: 1,
    anims: {
        "ataque": { from: 0, to: 3, speed: 8, loop: false }
    }
});
loadSprite("projetil-lich", "frontend/assets/sprites/projetil-lich.png", {
    sliceX: 3,
    sliceY: 1,
    anims: {
        "voo": { from: 0, to: 2, speed: 12, loop: true }
    }
});
loadSprite("explosao_lich", "frontend/assets/sprites/explosao-caveira.png", {
    sliceX: 5, // A imagem tem 5 quadros de animação
    sliceY: 1,
    anims: {
        "explodir": { from: 0, to: 4, speed: 12, loop: false }
    }
});
loadSprite("explosao_azul", "frontend/assets/sprites/explosao-azul.png", {
    sliceX: 5, // A spritesheet possui 5 quadros horizontais
    sliceY: 1,
    anims: {
        "explodir": { from: 0, to: 4, speed: 12, loop: false }
    }
});

// CORVOS
loadSprite("corvo_voando", "frontend/assets/sprites/corvo-voando-sheet.png", {
    sliceX: 7,
    sliceY: 1,
    anims: {
        "voar": { from: 0, to: 6, speed: 12, loop: true }
    }
});
loadSprite("corvo_explodindo", "frontend/assets/sprites/corvo-explodindo-sheet.png", {
    sliceX: 7,
    sliceY: 1,
    anims: {
        "explodir": { from: 0, to: 6, speed: 14, loop: false }
    }
});

// ITENS
loadSprite("pocao-vida", "frontend/assets/sprites/pocao-vida.png");
loadSprite("asas", "frontend/assets/sprites/asas.png");
loadSprite("pocao-mana", "frontend/assets/sprites/pocao-mana.png");

// Conjurar bola de fogo (tecla X): 5 quadros de 362x175, com os pés sempre no centro de cada quadro
loadSprite("player_conjurar", "frontend/assets/sprites/Personagem-principal-ataque-cajado-sheet.png", {
    sliceX: 5,
    sliceY: 1,
    anims: {
        "conjurar": { from: 0, to: 4, speed: 14, loop: false }
    }
});

// Bola de fogo: quadro 0 = acendendo, 1 a 3 = voando, 4 = impacto (5 quadros de 342x175)
loadSprite("bola_fogo", "frontend/assets/sprites/projetil-bola-de-fogo-mago-sheet.png", {
    sliceX: 5,
    sliceY: 1,
    anims: {
        "voo": { from: 1, to: 3, speed: 14, loop: true }
    }
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

// CARREGAMENTO DOS ÁUDIOS
// FASE 1
loadSound("musica_fase1", "frontend/assets/sounds/level-1.mp3");

// PLAYER
loadSound("voz_hit_1", "frontend/assets/sounds/mago-sendo-acertado-1.mp3");
loadSound("voz_hit_2", "frontend/assets/sounds/mago-sendo-acertado-2.mp3");
loadSound("voz_hit_3", "frontend/assets/sounds/mago-sendo-acertado-3.mp3");
loadSound("som_ataque", "frontend/assets/sounds/player-ataque-espada.mp3");
loadSound("som_morte_jogador", "frontend/assets/sounds/mago-morrendo.mp3");

// ESQUELETO
loadSound("som_ataque_esqueleto", "frontend/assets/sounds/ataque-esqueleto.mp3");
loadSound("som_quebrar", "frontend/assets/sounds/esqueleto-quebrando.mp3");
loadSound("som_bola_de_fogo", "frontend/assets/sounds/magia-fogo.mp3");

//LOBO
loadSound("som_lobo_ataque", "frontend/assets/sounds/lobo-atacando.mp3");
loadSound("som_lobo_morte", "frontend/assets/sounds/lobo-morrendo.mp3");

// LICH
loadSound("risada_lich_1", "frontend/assets/sounds/risada-lich-1.mp3");
loadSound("risada_lich_2", "frontend/assets/sounds/risada-lich-2.mp3");
loadSound("risada_lich_3", "frontend/assets/sounds/risada-lich-3.mp3");
loadSound("som_carregando_raio", "frontend/assets/sounds/feixe-raio-lich.mp3");
loadSound("som_batida_raio", "frontend/assets/sounds/raio-batendo.mp3");
loadSound("risada_projetil_lich", "frontend/assets/sounds/risada-projetil-lich.mp3");
loadSound("projetil_lich_explodindo", "frontend/assets/sounds/projetil-lich-explodindo.mp3");
loadSound("dano_lich", "frontend/assets/sounds/dano-lich.mp3");
loadSound("morte_lich", "frontend/assets/sounds/morte-lich.mp3");

// REGISTRO DAS CENAS
scene("menu", cenaMenu);
scene("death", cenaMorte);
scene("gameover", cenaGameOver);
scene("game", cenaJogo);

// INICIA O JOGO
go("menu");