// corvos.js
// Corvo: voa como as medusas do Castlevania (reto na horizontal, subindo e descendo em onda),
// nasce nas folhas de uma árvore e some nas folhas de outra. Não colide com o cenário: só com o jogador.
//
// As duas árvores são marcadas no Tiled com retângulos na camada de objetos:
//   "corvo-spawn" -> cobre as folhas da árvore onde os corvos NASCEM (ponto sorteado dentro do retângulo)
//   "corvo-fim"   -> cobre as folhas da árvore onde os corvos SOMEM (assim que o centro entra no retângulo)
// Todos os números (velocidade, onda, tempo entre corvos...) estão em balanceamento.js.
//
// Cada corvo são dois objetos que andam juntos (como a bola de fogo):
//   - a caixa de colisão (invisível, tag "corvo"), pequena, só do corpo;
//   - o sprite animado, que segue a caixa e troca de camada para passar ATRÁS das folhas.

import { BALANCEAMENTO } from "../balanceamento.js";

const entre = (a, b) => a + Math.random() * (b - a);
const dentro = (zona, p, margem = 0) =>
    p.x >= zona.x - margem && p.x <= zona.x + zona.w + margem &&
    p.y >= zona.y - margem && p.y <= zona.y + zona.h + margem;

export function criarCorvo(zonaSpawn, zonaFim) {
    const cfg = BALANCEAMENTO.corvo;

    // Trajeto: de um ponto sorteado nas folhas de origem até um ponto sorteado nas folhas de destino
    const origem = { x: entre(zonaSpawn.x, zonaSpawn.x + zonaSpawn.w), y: entre(zonaSpawn.y, zonaSpawn.y + zonaSpawn.h) };
    const destino = { x: entre(zonaFim.x, zonaFim.x + zonaFim.w), y: entre(zonaFim.y, zonaFim.y + zonaFim.h) };
    const dirX = destino.x >= origem.x ? 1 : -1;       // a arte do corvo olha para a direita; espelha se for para a esquerda
    const distancia = Math.max(1, Math.abs(destino.x - origem.x));
    const fase = Math.random() * Math.PI * 2;           // cada corvo começa a onda em um ponto diferente

    const visual = add([
        sprite("corvo_voando", { anim: "voar" }),
        pos(origem.x, origem.y),
        anchor("center"),
        scale(cfg.escala),
        opacity(0),                                     // aparece aos poucos, saindo das folhas
        z(cfg.zAtras),
    ]);
    visual.flipX = dirX < 0;

    const corvo = add([
        rect(cfg.hitbox.largura, cfg.hitbox.altura),
        pos(origem.x, origem.y),
        anchor("center"),
        area(),
        opacity(0),
        "corvo",
        {
            visual: visual,        // o togglePause() do game.js pausa os dois
            ativo: false,          // só acerta o jogador depois de aparecer por inteiro e antes de sumir
            explodindo: false,
            sumindo: false,
            andou: 0,
            tempo: 0,
            tempoSumindo: 0,
        },
    ]);

    // Chamado pelo game.js quando acerta o jogador: troca o sprite pela explosão e tira a caixa de colisão.
    corvo.explodir = () => {
        if (corvo.explodindo) return;
        corvo.explodindo = true;
        corvo.ativo = false;

        play("som_corvo_morte", { volume: 0.5 });

        visual.use(sprite("corvo_explodindo"));
        visual.flipX = false;
        visual.scale = vec2(cfg.escalaExplosao);
        visual.opacity = 1;
        visual.z = cfg.zExplosao;
        visual.play("explodir");
        visual.onAnimEnd(() => destroy(visual));

        destroy(corvo); // o sprite fica onde o corvo estava e some quando a explosão acaba
    };

    corvo.onUpdate(() => {
        corvo.tempo += dt();
        corvo.andou += cfg.velocidade * dt();

        // Trajeto: linha reta de origem a destino + onda senoidal (uma sequência de arcos).
        // O "envelope" zera a onda no começo e no fim, para o corvo sair e chegar exatamente nas folhas.
        const u = Math.min(1, corvo.andou / distancia);
        const envelope = Math.max(0, Math.min(1, u / 0.15, (1 - u) / 0.15));
        const onda = cfg.amplitude * envelope * Math.sin((corvo.andou / cfg.comprimentoDeOnda) * Math.PI * 2 + fase);
        corvo.pos = vec2(origem.x + dirX * corvo.andou, origem.y + (destino.y - origem.y) * u + onda);
        visual.pos = vec2(corvo.pos.x, corvo.pos.y);

        // Atrás do desenho do mapa enquanto está nas folhas (ou perto delas); na frente do resto do tempo
        const nasFolhas = dentro(zonaSpawn, corvo.pos, cfg.margemFolhagem) || dentro(zonaFim, corvo.pos, cfg.margemFolhagem);
        visual.z = nasFolhas ? cfg.zAtras : cfg.zFrente;

        if (!corvo.sumindo) {
            // aparece aos poucos; só vira perigoso quando está visível por inteiro
            visual.opacity = Math.min(1, corvo.tempo / cfg.fadeEntrada);
            corvo.ativo = corvo.tempo >= cfg.fadeEntrada;

            // chegou nas folhas do destino: some
            if (u >= 1 || dentro(zonaFim, corvo.pos)) {
                corvo.sumindo = true;
                corvo.ativo = false;
            }
        } else {
            corvo.tempoSumindo += dt();
            visual.opacity = Math.max(0, 1 - corvo.tempoSumindo / cfg.fadeSaida);
            if (corvo.tempoSumindo >= cfg.fadeSaida) {
                destroy(visual);
                destroy(corvo);
            }
        }
    });

    return corvo;
}

// Objeto invisível que sorteia o tempo até o próximo corvo (mínimo e máximo em balanceamento.js).
// Fica com a tag "spawnerCorvos" para o togglePause() poder pará-lo.
export function criarSpawnerCorvos(zonaSpawn, zonaFim) {
    const cfg = BALANCEAMENTO.corvo;
    const sorteiaEspera = () => entre(cfg.intervaloSpawn.min, cfg.intervaloSpawn.max);

    const spawner = add([
        "spawnerCorvos",
        { espera: cfg.intervaloSpawn.min }
    ]);

    spawner.onUpdate(() => {
        spawner.espera -= dt();
        if (spawner.espera > 0) return;

        if (get("corvo").length < cfg.maxSimultaneos) {
            criarCorvo(zonaSpawn, zonaFim);
            spawner.espera = sorteiaEspera();
        } else {
            spawner.espera = 0.25; // já tem corvos demais: tenta de novo daqui a pouco
        }
    });

    return spawner;
}
