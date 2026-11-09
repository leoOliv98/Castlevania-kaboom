import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
import { cenaMenu, cenaMorte, cenaGameOver, cenaVitoria } from "./cenas/menu.js";
import { cenaJogo } from "./cenas/game.js";
import { carregarFontes } from "./ui.js";

kaboom({
    background: [20, 20, 30],
    width: 1280, 
    height: 600,
    letterbox: true, 
    stretch: true,   
    scale: 1,  
});

// Fontes do jogo (ver ui.js)
carregarFontes();


// CARREGAMENTO DOS ASSETS
loadSprite("background_fase1", "frontend/assets/sprites/fundo-floresta.png");
loadSprite("background_fase2", "frontend/assets/sprites/fundo-caverna.png");

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

// GUARDIÃO (chefe): cada folha tem quadros de tamanho igual, com os pés sempre na mesma linha
loadSprite("guardiao_correndo_mascara", "frontend/assets/sprites/guardiao-correndo-mascara-sheet.png", {
    sliceX: 8,
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 },
        "correr": { from: 0, to: 7, speed: 12, loop: true }
    }
});
loadSprite("guardiao_correndo", "frontend/assets/sprites/guardiao-correndo-sheet.png", {
    sliceX: 8,
    sliceY: 1,
    anims: {
        "idle": { from: 0, to: 0 },
        "correr": { from: 0, to: 7, speed: 12, loop: true }
    }
});
// Espadada da fase 1: quadros 0-2 preparando, 3-4 o corte, 5 recuperando (o golpe sai no quadro 3)
loadSprite("guardiao_ataque_mascara", "frontend/assets/sprites/guardiao-ataque-mascara-sheet.png", {
    sliceX: 3,  // 3 colunas x 2 linhas (a imagem não passa de 2048 px); a animação segue a ordem 0 a 5
    sliceY: 2,
    anims: {
        "ataque": { from: 0, to: 5, speed: 10, loop: false }
    }
});
loadSprite("guardiao_ataque", "frontend/assets/sprites/guardiao-ataque-sheet.png", {
    sliceX: 3,
    sliceY: 2,
    anims: {
        "ataque": { from: 0, to: 5, speed: 10, loop: false }
    }
});
// Pulo da fase 2: 0 agachando, 1-3 subindo, 4-5 caindo, 6 impacto, 7 levantando (os quadros são escolhidos pelo código)
loadSprite("guardiao_salto", "frontend/assets/sprites/guardiao-salto-sheet.png", {
    sliceX: 8,
    sliceY: 1
});
loadSprite("guardiao_mascara", "frontend/assets/sprites/guardiao-mascara.png");

// ITENS
loadSprite("pocao-vida", "frontend/assets/sprites/pocao-vida.png");
loadSprite("asas", "frontend/assets/sprites/asas.png");
loadSprite("pocao-mana", "frontend/assets/sprites/pocao-mana.png");
loadSprite("chave", "frontend/assets/sprites/chave.png");

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

// CARREGAMENTO DOS ÁUDIOS
// ITENS
loadSound("item_pego", "frontend/assets/sounds/item-pego.mp3");
loadSound("item_usado", "frontend/assets/sounds/item-usado.mp3");

// FASE 1
loadSound("musica_fase1", "frontend/assets/sounds/level-1.mp3");
// FASE 2
loadSound("musica_fase2", "frontend/assets/sounds/level-2.mp3");

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

// LOBO
loadSound("som_lobo_ataque", "frontend/assets/sounds/lobo-atacando.mp3");
loadSound("som_lobo_morte", "frontend/assets/sounds/lobo-morrendo.mp3");

// CORVO
loadSound("som_corvo_morte", "frontend/assets/sounds/corvo-morrendo.mp3");

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
scene("vitoria", cenaVitoria);
scene("game", cenaJogo);

// INICIA O JOGO
go("menu");