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
        guardiaoEspada: 30,        // espadada do Guardião (fase 1)
        guardiaoPouso: 40,         // pouso do pulo do Guardião (fase 2)
    },
    vida: {
        esqueleto: 5,              // a espada (5) derruba em 1 golpe; a bola de fogo (3) em 2
        lobo: 5,
        lich: 80,                  // a espada (5) derruba em 16 golpes
        guardiao: 60,              // a 50% (30) ele perde a máscara e passa para a fase 2
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
    guardiao: {
        escala: 0.92,              // tamanho do sprite: o chefe fica com o dobro da altura do jogador (~150 px contra ~76)
        hitbox: { largura: 90, altura: 168 },   // caixa de colisão, em px da arte (a escala é aplicada por cima)
        colisaoComJogador: true,   // true = o jogador não passa por ele, precisa pular por cima; false = atravessa
        gravidade: 2400,           // tem que ser igual ao setGravity() do game.js (usado para calcular o pulo)
        fase2NaVida: 0.5,          // fração da vida em que ele perde a máscara e entra na fase 2
        velocidadeFase1: 170,      // px/s correndo atrás do jogador (o jogador anda a 200)
        velocidadeFase2: 235,      // px/s na fase 2 (mais rápido que o jogador)
        distanciaAtivacao: 520,    // fase 1: o jogador precisa chegar a essa distância (horizontal) para ele acordar
        alturaAtivacao: 260,       // ...e estar a no máximo essa diferença de altura
        pausaAposAtaque: 1.0,      // segundos parado depois de espadada ou pouso, antes de voltar a perseguir
        tempoTransicao: 1.2,       // segundos parado quando a máscara cai (começo da fase 2)
        tempoDesaparecer: 1.8,     // segundos desaparecendo depois de morrer
        espada: {
            distanciaInicio: 160,  // começa a espadada quando o jogador está a menos disso (horizontal)
            alturaMaxima: 140,     // ...e a menos disso de diferença de altura
            quadroGolpe: 3,        // quadro da animação em que a espada acerta (0 a 5; o 3 é o corte para a frente)
            alcance: 165,          // comprimento da caixa de dano, a partir do chefe (px)
            altura: 110,           // altura da caixa de dano (px)
            duracao: 0.22,         // segundos que a caixa de dano fica ativa
            naFase2: true,         // true = na fase 2 ele também dá a espadada quando o jogador está perto
            spriteFase2: "guardiao_ataque",   // folha de ataque usada na fase 2. Quando tiver a versão SEM máscara,
                                                      // carregue no main.js (ex.: "guardiao_ataque") e troque o nome aqui
        },
        pulo: {
            distanciaInicio: 380,  // fase 2: pula no jogador quando ele está a menos disso (horizontal)
            perseguirMinimo: 0.4,  // segundos correndo antes de poder pular (evita pular logo depois de uma pausa)
            agachar: 0.4,          // segundos agachado antes de saltar (é o aviso para o jogador)
            forca: 1160,           // força do salto (altura ~ forca² / (2 * gravidade) = ~280 px)
            velHorizontalMax: 520, // velocidade horizontal máxima no ar (px/s)
            travaMira: 0.25,       // segundos depois de saltar em que ele ainda corrige a mira; depois segue reto
            quadroPouso: 0.15,     // segundos no quadro de impacto
            recuperar: 0.25,       // segundos levantando depois do pouso
            tremor: 6,             // tremor de tela no pouso
            pouso: { largura: 170, altura: 70, duracao: 0.15 },  // caixa de dano do pouso, em volta dos pés
        },
    },
};
