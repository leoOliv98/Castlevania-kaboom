// levels.js
// Registro de todas as fases do jogo. Para adicionar um level novo:
//   1. salve o .tmj em frontend/assets/levels/
//   2. adicione uma entrada em LEVELS (abaixo)
// A cena do jogo lê tudo daqui. O jogo sempre começa em LEVEL_PADRAO e segue pela cadeia de "proximoLevel".
//
// Campos:
//   nome           -> nome do level (só para você se orientar)
//   arquivo        -> caminho do .tmj
//   tipo           -> "tileset": tiles vêm de um spritesheet embutido no .tmj (ex.: floresta.png, caverna.png)
//   camadasSolidas -> nomes das camadas do Tiled que são SÓ colisão (não são desenhadas)
//   escala         -> multiplica o mapa inteiro (tiles, colisão e spawns). Padrão 1
//   musica         -> nome do som carregado no main.js
//   fundo          -> sprite de fundo. modo "mundo": parado no mapa (x, y, escala)
//                                      modo "tela":  fixo na tela, não rola com a câmera
//   esqueletoPadrao -> (opcional) onde nasce um esqueleto se o mapa não tiver nenhum "esqueleto-spawn"
//   solidoOffsetY  -> desce toda a colisão N px. Os tiles de grama têm um respiro
//                     transparente no topo; sem isso o jogador parece flutuar sobre o chão
//   rampas         -> { maxDegrau: 16 } transforma escadas da camada de colisão (degraus de
//                     até 16px) em rampas suaves. false/ausente = deixa como escada
//   hitboxEstreita -> true = o jogador usa tronco largo e pés estreitos, para andar em rampas sem
//                     ficar "no ar" pela quina da caixa de colisão
//   proximoLevel   -> (opcional) id do level que abre quando o jogador entra no objeto "fim-level" do Tiled.
//                     Sem isso, o "fim-level" volta para o menu
//   exigeChave     -> true = o "fim-level" só funciona se o jogador tiver a chave (item "chave" do Tiled)
//   fimAoDerrotarLich -> true = derrotar o Lich destrói os esqueletos e encerra o jogo (tela de vitória, depois menu)

export const LEVELS = {
    // Floresta: o level definitivo (começo do jogo)
    "level-1": {
        nome: "Floresta",
        arquivo: "frontend/assets/levels/level-1.tmj",
        tipo: "tileset",
        camadasSolidas: ["solidos"],
        escala: 1,
        musica: "musica_fase1",
        fundo: { sprite: "background_fase1", modo: "tela", escala: 1.25 },
        solidoOffsetY: 5,
        rampas: { maxDegrau: 16 },
        hitboxEstreita: true,
        exigeChave: true,              // a saída ("fim-level") só abre com a chave
        proximoLevel: "level-2",       // depois da floresta vem a caverna
        // sem esqueletoPadrao: o level só tem esqueletos se você colocar objetos "esqueleto-spawn" no Tiled
    },

    // Caverna de lava
    "level-2": {
        nome: "Caverna",
        arquivo: "frontend/assets/levels/level-2.tmj",
        tipo: "tileset",
        camadasSolidas: ["solidos"],
        escala: 1,
        musica: "musica_fase2",        // provisório: troque quando tiver a música da caverna (loadSound no main.js)
        // 1920 px de largura x 0.667 = 1280 (a largura da tela); o fim da imagem é só escuridão e fica fora da tela
        fundo: { sprite: "background_fase2", modo: "tela", escala: 1280 / 1920 },
        solidoOffsetY: 0,              // ajuste fino: se o jogador parecer flutuar (ou afundar) no chão, mude este valor
        rampas: { maxDegrau: 16 },
        hitboxEstreita: true,
        fimAoDerrotarLich: true,       // chefe final: ao derrotar o Lich, o jogo termina com a tela de vitória
        // exigeChave / proximoLevel: coloque quando o mapa tiver o objeto "fim-level" (e a "chave", se for exigir)
    },
};

// Level que o ENTER do menu abre
export const LEVEL_PADRAO = "level-1";

// Garante que cada level conhece o próprio id (usado como chave de cache)
Object.entries(LEVELS).forEach(([id, level]) => { level.id = id; });
