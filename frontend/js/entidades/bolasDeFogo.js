// bolasDeFogo.js
// Projétil do mago (tecla X). São dois objetos que andam juntos:
//   - a caixa de colisão (invisível, tag "bolaDeFogoJogador"), que é quem encosta nos inimigos;
//   - o sprite animado (quadro 0 = acende, 1 a 3 = voando, 4 = impacto), que só segue a caixa.
// O dano e as reações ficam no game.js (onCollide), como nos outros ataques do jogador.

import { BALANCEAMENTO } from "../balanceamento.js";

export function criarBolaDeFogo(x, y, direcao) {
    const cfg = BALANCEAMENTO.bolaDeFogo;

    const visual = add([
        sprite("bola_fogo", { frame: 0 }), // começa na chama pequena, acendendo
        pos(x, y),
        anchor("center"),
        scale(cfg.escala),
        z(5),
    ]);
    visual.flipX = direcao < 0;

    const bola = add([
        rect(cfg.hitbox, cfg.hitbox),
        pos(x, y),
        anchor("center"),
        area(),
        opacity(0),
        "bolaDeFogoJogador",
        {
            dir: direcao,
            dano: BALANCEAMENTO.dano.bolaDeFogo,
            visual: visual,        // o togglePause() do game.js pausa os dois
            distancia: 0,
            tempo: 0,
            voando: false,
            acabou: false,
        },
    ]);

    // Some e solta um clarão (quadro 4 do sprite). escalaEfeito = 0 -> some sem clarão.
    bola.explodir = (escalaEfeito = 0.8) => {
        if (bola.acabou) return;
        bola.acabou = true;
        if (escalaEfeito > 0) {
            add([
                sprite("bola_fogo", { frame: 4 }),
                pos(bola.pos.x, bola.pos.y),
                anchor("center"),
                scale(cfg.escala * escalaEfeito),
                z(5),
                lifespan(0.22, { fade: 0.22 }),
            ]);
        }
        destroy(visual);
        destroy(bola);
    };

    bola.onUpdate(() => {
        bola.move(direcao * cfg.velocidade, 0);
        bola.distancia += cfg.velocidade * dt();
        bola.tempo += dt();

        // depois de um instante troca a chama acendendo pela animação de voo
        if (!bola.voando && bola.tempo > 0.07) {
            visual.play("voo");
            bola.voando = true;
        }
        visual.pos = vec2(bola.pos.x, bola.pos.y);

        if (bola.distancia >= cfg.alcance) bola.explodir(0.5); // fim do alcance: apaga com um clarão pequeno
    });

    // Bateu na parede / no chão
    bola.onCollide("ground", () => bola.explodir());

    return bola;
}
