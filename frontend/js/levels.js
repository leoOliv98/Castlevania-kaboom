// levels.js
// Registro de todas as fases do jogo. Para adicionar um level novo:
//   1. salve o .tmj em frontend/assets/levels/
//   2. adicione uma entrada em LEVELS (abaixo) e o id em ORDEM_LEVELS
// O menu e a cena do jogo leem tudo daqui.
//
// Campos:
//   nome           -> texto exibido no menu
//   arquivo        -> caminho do .tmj
//   tipo           -> "tiles-individuais": cada tile é uma imagem (sprites tile_1..tile_38 do main.js)
//                     "tileset":           tiles vêm de um spritesheet embutido no .tmj (ex.: floresta.png)
//   blocosSolidos  -> (só "tiles-individuais") IDs de tile que colidem
//   camadasSolidas -> (só "tileset") nomes das camadas do Tiled que são SÓ colisão (não são desenhadas)
//   escala         -> multiplica o mapa inteiro (tiles, colisão e spawns). Padrão 1
//   musica         -> nome do som carregado no main.js
//   fundo          -> sprite de fundo. modo "mundo": parado no mapa (x, y, escala)
//                                      modo "tela":  fixo na tela, não rola com a câmera
//   esqueletoPadrao -> (opcional) onde nasce um esqueleto se o mapa não tiver nenhum "esqueleto-spawn"
//   solidoOffsetY  -> (só "tileset") desce toda a colisão N px. Os tiles de grama têm um respiro
//                     transparente no topo; sem isso o jogador parece flutuar sobre o chão
//   rampas         -> (só "tileset") { maxDegrau: 16 } transforma escadas da camada de colisão (degraus de
//                     até 16px) em rampas suaves. false/ausente = deixa como escada
//   hitboxEstreita -> true = o jogador usa tronco largo e pés estreitos, para andar em rampas sem
//                     ficar "no ar" pela quina da caixa de colisão

export const LEVELS = {
    "level-1": {
        nome: "Castelo",
        arquivo: "frontend/assets/levels/level-1.tmj",
        tipo: "tiles-individuais",
        blocosSolidos: [31, 29, 28, 30, 27, 24, 22, 38, 4, 35],
        escala: 1,
        musica: "musica_fase1",
        fundo: { sprite: "background_fase1", modo: "mundo", x: -200, y: -300, escala: 3 },
        esqueletoPadrao: { x: 500, y: 100 },
    },

    "level-teste": {
        nome: "Floresta (teste)",
        arquivo: "frontend/assets/levels/level-teste.tmj",
        tipo: "tileset",
        camadasSolidas: ["solidos"],
        escala: 1,
        musica: "musica_fase1",
        fundo: { sprite: "background_fase1", modo: "tela", escala: 1.25 },
        solidoOffsetY: 5,
        rampas: { maxDegrau: 16 },
        hitboxEstreita: true,
        // sem esqueletoPadrao: o level só tem esqueletos se você colocar objetos "esqueleto-spawn" no Tiled
    },
};

// Ordem em que aparecem no menu (teclas 1, 2, 3...)
export const ORDEM_LEVELS = ["level-1", "level-teste"];

// Level que o ENTER do menu abre
export const LEVEL_PADRAO = "level-1";

// Garante que cada level conhece o próprio id (usado como chave de cache)
Object.entries(LEVELS).forEach(([id, level]) => { level.id = id; });
