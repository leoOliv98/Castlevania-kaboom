// balanceamento.js
// Números de combate num lugar só, para ajustar nos testes sem caçar pelo código.

export const BALANCEAMENTO = {
    mana: {
        maxima: 100,
        custoBolaDeFogo: 5,        // 100 / 5 = 20 bolas de fogo até a mana acabar
    },
    dano: {
        espada: 5,                 // ataque lateral e ataque para baixo
        bolaDeFogo: 3,
        corvo: 20,                 // dano no jogador quando o corvo acerta e explode
    },
    vida: {
        esqueleto: 5,              // a espada (5) derruba em 1 golpe; a bola de fogo (3) em 2
        lobo: 5,
    },
    bolaDeFogo: {
        velocidade: 560,           // px por segundo
        alcance: 900,              // px até a bola se apagar sozinha
        escala: 0.5,               // tamanho do sprite (a arte tem ~80px de bola)
        hitbox: 38,                // lado da caixa de colisão (px)
    },
    corvo: {
        velocidade: 150,           // px por segundo, na horizontal
        amplitude: 110,            // altura da onda (px para cima e para baixo da linha reta)
        comprimentoDeOnda: 480,    // px andados na horizontal por onda completa
        escala: 0.55,              // tamanho do sprite voando
        escalaExplosao: 0.7,       // tamanho do sprite da explosão
        hitbox: { largura: 46, altura: 30 },   // caixa de colisão (só o corpo, sem as asas)
        intervaloSpawn: { min: 1, max: 3 },    // segundos até nascer o próximo (sorteado entre min e max)
        maxSimultaneos: 6,         // no máximo tantos corvos ao mesmo tempo no mapa
        margemFolhagem: 60,        // distância (px) da zona de folhas em que o corvo ainda passa ATRÁS do cenário
        fadeEntrada: 0.4,          // segundos para aparecer (e não pode acertar o jogador nesse tempo)
        fadeSaida: 0.3,            // segundos para sumir dentro das folhas
        zAtras: -55,               // atrás do desenho do mapa (que fica em -50), na frente do fundo (-100)
        zFrente: 4,                // na frente de tudo
        zExplosao: 6,
    },
};
