// guardiao.js
// Chefe "Guardião mascarado", em 2 fases. Todos os números (vida, velocidades, distâncias, danos, tempos)
// estão em balanceamento.js, no bloco "guardiao".
//
// FASE 1 (com máscara): fica parado até o jogador chegar perto. Aí corre atrás dele e, ao chegar no alcance,
//   dá uma espadada. Depois do golpe faz uma pausa (1 s) e volta a perseguir.
// FASE 2 (sem máscara, a 50% da vida): a máscara cai no chão (só enfeite, sem colisão). Ele persegue o jogador
//   de qualquer distância. Se o jogador estiver bem perto, dá a mesma espadada da fase 1; se estiver a uma
//   distância média, dá um pulo alto e despenca em cima dele. Se o jogador estiver embaixo dele quando ele
//   aterrissa, leva dano. Depois do golpe ou do pouso, pausa e volta a perseguir.
//
// Colocação no Tiled: um objeto de ponto chamado "guardiao-spawn" (na camada de objetos, como o "lobo-spawn").
// O ponto marca onde ficam os PÉS do guardião: se estiver no ar, ele cai até o chão.
//
// Dano nele: o game.js chama guardiao.receberDano(dano, direcao) para a espada e para a bola de fogo.
// Dano nos jogador: caixas invisíveis com a tag "ataqueGuardiao" (e o campo "dano"), tratadas no game.js.

import { flutuar } from "../ui.js";
import { BALANCEAMENTO } from "../balanceamento.js";
import { criarExplosaoAzul } from "./lich.js";

// Sons já existentes no projeto, usados como "quebra-galho". Troque por sons próprios quando tiver.
const SONS = {
    golpe: "som_ataque",          // espadada
    pouso: "som_batida_raio",     // impacto do pouso
    dano: "dano_lich",            // levou dano
    morte: "morte_lich",          // morreu
};

const sinal = (n) => (n >= 0 ? 1 : -1);
const limitar = (n, a, b) => Math.max(a, Math.min(b, n));

function formaCaixa(w, h) {
    if (typeof Polygon === "function") {
        return new Polygon([vec2(-w / 2, -h / 2), vec2(w / 2, -h / 2), vec2(w / 2, h / 2), vec2(-w / 2, h / 2)]);
    }
    return new Rect(vec2(-w / 2, -h / 2), w, h);
}

export function criarGuardiao(spawnX, spawnPesY) {
    const cfg = BALANCEAMENTO.guardiao;
    const G = cfg.gravidade;                                  // tem que ser igual ao setGravity() do game.js
    const meiaAltura = (cfg.hitbox.altura / 2) * cfg.escala;  // do centro até os pés (px no mundo)
    const meiaLargura = (cfg.hitbox.largura / 2) * cfg.escala;

    const g = add([
        sprite("guardiao_correndo_mascara"),
        pos(spawnX, spawnPesY - meiaAltura),
        anchor("center"),
        scale(cfg.escala),
        // Caixa de colisão centrada no sprite, em px da arte (a escala é aplicada por cima). Vai como "shape"
        // (como no jogador): o area() do Kaboom 3000 ignora width/height, e aí a caixa seria o quadro inteiro
        // do sprite e o chefe ficaria "flutuando". A tag "player" é ignorada na física do Kaboom porque o bloqueio
        // do jogador é feito à mão, em bloquearJogador() (a física entre dois body() dinâmicos não é confiável).
        area({ shape: formaCaixa(cfg.hitbox.largura, cfg.hitbox.altura), collisionIgnore: ["player"] }),
        body(),
        opacity(1),
        "guardiao",
        {
            hp: BALANCEAMENTO.vida.guardiao,
            maxHp: BALANCEAMENTO.vida.guardiao,
            fase: 1,
            estado: "parado",   // parado | perseguindo | atacando | agachando | no-ar | pousando | pausa | transicao | morrendo
            t: 0,               // tempo no estado atual
            morto: false,
        },
    ]);

    const origem = { x: spawnX, y: spawnPesY - meiaAltura };
    let golpeou = false;          // a espadada desse ataque já criou a caixa de dano?
    let vx = 0;                   // velocidade horizontal do pulo
    let yAnterior = 0;            // para medir a velocidade vertical do pulo
    let chaoAdiante = true;       // resultado do último teste de "tem chão à frente?"
    let proximoTesteChao = 0;
    let maskSolta = false;
    let flashCtrl = null;
    let spriteAtual = "guardiao_correndo_mascara";

    // ------------------------------------------------------------------ colisão com o jogador
    // Com colisaoComJogador ligado, o chefe é uma parede para o jogador: ele não passa, precisa pular por cima.
    //  - Só vale no chão (não durante o pulo do chefe, senão ele pousaria "na cabeça" do jogador em vez de acertá-lo).
    //  - Quem está acima do topo do chefe passa por cima; quem desce em cima dele escorrega para o lado.
    //  - O empurrão é suave (no máximo 500 px/s), então ninguém "teletransporta" se estiver sobreposto, por exemplo
    //    logo depois do pouso. O jogador anda a 200 px/s, então na prática é uma parede.
    const MEIA_LARGURA_JOGADOR = 24;
    const MEIA_ALTURA_JOGADOR = 38;
    function bloquearJogador(player) {
        if (!cfg.colisaoComJogador || g.morto) return;
        if (g.estado === "agachando" || g.estado === "no-ar" || g.estado === "pousando") return;
        const folga = meiaLargura + MEIA_LARGURA_JOGADOR;
        const dx = player.pos.x - g.pos.x;
        if (Math.abs(dx) >= folga) return;
        const topoChefe = g.pos.y - meiaAltura, pesChefe = g.pos.y + meiaAltura;
        const pesJogador = player.pos.y + MEIA_ALTURA_JOGADOR, topoJogador = player.pos.y - MEIA_ALTURA_JOGADOR;
        if (pesJogador <= topoChefe + 4 || topoJogador >= pesChefe) return;   // por cima (ou por baixo): não encosta
        const alvo = g.pos.x + (dx >= 0 ? 1 : -1) * folga;
        const passo = 500 * dt();
        player.pos.x += Math.max(-passo, Math.min(passo, alvo - player.pos.x));
    }

    // ------------------------------------------------------------------ utilidades
    const nomeCorrendo = () => (g.fase === 1 ? "guardiao_correndo_mascara" : "guardiao_correndo");

    // Troca o sprite sem perder para que lado ele está virado (use(sprite()) zera o flipX)
    function usar(nome, anim) {
        const virado = g.flipX;
        g.use(sprite(nome));
        spriteAtual = nome;
        g.flipX = virado;
        if (anim) g.play(anim);
    }

    function virarPara(x) { g.flipX = x < g.pos.x; }
    const dir = () => (g.flipX ? -1 : 1);
    const pesY = () => g.pos.y + meiaAltura;

    function mudar(estado) { g.estado = estado; g.t = 0; }

    function temChaoAdiante(d) {
        if (time() < proximoTesteChao) return chaoAdiante;
        proximoTesteChao = time() + 0.1;
        const px = g.pos.x + d * (meiaLargura + 28), py = pesY();
        // testa alguns pontos logo abaixo dos pés (e não um só), para não depender de milímetros
        chaoAdiante = get("ground").some((s) => [8, 24, 48].some((dy) => s.hasPoint(vec2(px, py + dy))));
        return chaoAdiante;
    }

    function andar(d, velocidade) {
        if (!temChaoAdiante(d)) return false;   // não despenca em buraco
        g.move(d * velocidade, 0);
        return true;
    }

    function ficarParadoAnimando() {
        if (g.curAnim() !== "idle" || spriteAtual !== nomeCorrendo()) usar(nomeCorrendo(), "idle");
    }

    function comecarPerseguicao() {
        mudar("perseguindo");
        usar(nomeCorrendo(), "correr");
    }

    function comecarPausa() {
        mudar("pausa");
        usar(nomeCorrendo(), "idle");
    }

    // ------------------------------------------------------------------ fase 1: espadada
    function comecarAtaque(player) {
        mudar("atacando");
        golpeou = false;
        virarPara(player.pos.x);
        // fase 1 usa a folha com máscara; a fase 2 usa cfg.espada.spriteFase2 (ver balanceamento.js)
        usar(g.fase === 1 ? "guardiao_ataque_mascara" : cfg.espada.spriteFase2, "ataque");
    }

    function golpeDeEspada() {
        golpeou = true;
        play(SONS.golpe, { volume: 0.8 });
        const e = cfg.espada;
        add([
            rect(e.alcance, e.altura),
            pos(g.pos.x + dir() * (10 + e.alcance / 2), g.pos.y),
            anchor("center"),
            area(),
            opacity(0),
            lifespan(e.duracao),
            "ataqueGuardiao",
            { dano: BALANCEAMENTO.dano.guardiaoEspada },
        ]);
    }

    g.onAnimEnd((anim) => {
        if (anim === "ataque" && g.estado === "atacando" && !g.morto) comecarPausa();
    });

    // ------------------------------------------------------------------ fase 2: pulo
    function comecarPulo(player) {
        mudar("agachando");
        virarPara(player.pos.x);
        usar("guardiao_salto");
        g.frame = 0;
    }

    function lancarPulo() {
        mudar("no-ar");
        g.jump(cfg.pulo.forca);
        yAnterior = g.pos.y;
    }

    function pousar() {
        mudar("pousando");
        g.frame = 6;
        play(SONS.pouso, { volume: 0.7 });
        if (typeof shake === "function") shake(cfg.pulo.tremor);
        const p = cfg.pulo.pouso;
        // Caixa de dano no chão, em volta dos pés: quem estiver embaixo/ao lado do chefe no pouso leva dano
        add([
            rect(p.largura, p.altura),
            pos(g.pos.x, pesY() - p.altura / 2 + 4),
            anchor("center"),
            area(),
            opacity(0),
            lifespan(p.duracao),
            "ataqueGuardiao",
            { dano: BALANCEAMENTO.dano.guardiaoPouso },
        ]);
    }

    // ------------------------------------------------------------------ máscara que cai
    function soltarMascara() {
        if (maskSolta) return;
        maskSolta = true;
        const lado = g.flipX ? -1 : 1;
        const mascara = add([
            sprite("guardiao_mascara"),
            pos(g.pos.x + lado * 10, g.pos.y - 51 * cfg.escala),
            anchor("center"),
            scale(cfg.escala),
            z(-1),                           // atrás do chefe; sem area(): não colide nem dá para pegar
            "mascaraGuardiao",
            { vx: -lado * 70, vy: -260, noChao: false, giro: rand(0, 1) < 0.5 },
        ]);
        mascara.flipX = lado < 0;
        const chaoY = pesY();                // os pés do chefe estão no chão
        mascara.onUpdate(() => {
            if (mascara.noChao) return;
            mascara.vy += G * dt();
            mascara.pos.x += mascara.vx * dt();
            mascara.pos.y += mascara.vy * dt();
            mascara.vx *= 0.985;
            const meia = (mascara.height || 52) * cfg.escala / 2;
            if (mascara.pos.y + meia >= chaoY + 2) {
                mascara.pos.y = chaoY + 2 - meia;
                mascara.noChao = true;
            }
        });
    }

    function comecarTransicao() {
        g.fase = 2;
        golpeou = true;
        mudar("transicao");
        usar("guardiao_correndo", "idle");
        soltarMascara();
        g.trigger("fase2");
    }

    // ------------------------------------------------------------------ dano e morte
    g.receberDano = (dano, direcao = 1) => {
        if (g.morto) return;
        g.hp = Math.max(0, g.hp - dano);

        if (flashCtrl) flashCtrl.cancel();
        let piscadas = 0;
        flashCtrl = loop(0.1, () => {
            if (!g.exists()) { flashCtrl.cancel(); return; }
            g.opacity = g.opacity === 1 ? 0.3 : 1;
            if (++piscadas >= 4) { g.opacity = 1; flashCtrl.cancel(); }
        });
        play(SONS.dano, { volume: 0.5 });
        flutuar(`-${dano}`, g.pos.x, g.pos.y - 90, [255, 255, 0], 14, 0.4);

        if (g.hp <= 0) { morrer(); return; }
        if (g.fase === 1 && g.hp <= g.maxHp * cfg.fase2NaVida) comecarTransicao();
    };

    function morrer() {
        g.morto = true;
        mudar("morrendo");
        g.opacity = 1;
        if (flashCtrl) flashCtrl.cancel();
        if (g.fase === 1) { g.fase = 2; soltarMascara(); }
        usar("guardiao_correndo", "idle");
        play(SONS.morte, { volume: 0.9 });
        for (let i = 0; i < 4; i++) {
            wait(0.25 * i, () => {
                if (g.exists()) criarExplosaoAzul(vec2(g.pos.x + rand(-40, 40), g.pos.y + rand(-70, 50)));
            });
        }
        g.trigger("morreu");
    }

    // ------------------------------------------------------------------ cérebro
    g.onUpdate(() => {
        g.t += dt();

        if (g.estado === "morrendo") {
            g.opacity = Math.max(0, 1 - g.t / cfg.tempoDesaparecer);
            if (g.opacity <= 0) destroy(g);
            return;
        }

        const player = get("player")[0];
        if (!player) return;
        const dx = player.pos.x - g.pos.x;
        const dy = player.pos.y - g.pos.y;
        bloquearJogador(player);

        switch (g.estado) {
            case "parado": {
                ficarParadoAnimando();
                virarPara(player.pos.x);     // fica de olho no jogador
                if (Math.abs(dx) < cfg.distanciaAtivacao && Math.abs(dy) < cfg.alturaAtivacao) comecarPerseguicao();
                break;
            }

            case "perseguindo": {
                virarPara(player.pos.x);
                const d = sinal(dx);
                if (g.fase === 1) {
                    if (Math.abs(dx) < cfg.espada.distanciaInicio && Math.abs(dy) < cfg.espada.alturaMaxima) {
                        comecarAtaque(player);
                        break;
                    }
                    if (Math.abs(dx) > 8 && !andar(d, cfg.velocidadeFase1)) ficarParadoAnimando();
                    else if (g.curAnim() !== "correr" || spriteAtual !== nomeCorrendo()) usar(nomeCorrendo(), "correr");
                } else {
                    // jogador bem perto: espadada (a mesma da fase 1); mais longe: pulo
                    if (cfg.espada.naFase2 && g.isGrounded() && Math.abs(dx) < cfg.espada.distanciaInicio && Math.abs(dy) < cfg.espada.alturaMaxima) {
                        comecarAtaque(player);
                        break;
                    }
                    if (g.t >= cfg.pulo.perseguirMinimo && g.isGrounded() && Math.abs(dx) < cfg.pulo.distanciaInicio) {
                        comecarPulo(player);
                        break;
                    }
                    if (Math.abs(dx) > 8 && andar(d, cfg.velocidadeFase2)) {
                        if (g.curAnim() !== "correr" || spriteAtual !== nomeCorrendo()) usar(nomeCorrendo(), "correr");
                    } else ficarParadoAnimando();
                }
                break;
            }

            case "atacando": {
                // a espadada sai quando a animação chega no quadro do golpe
                if (!golpeou && g.frame >= cfg.espada.quadroGolpe) golpeDeEspada();
                break;
            }

            case "agachando": {
                virarPara(player.pos.x);     // ainda acompanha o jogador enquanto se prepara
                g.frame = 0;
                if (g.t >= cfg.pulo.agachar) lancarPulo();
                break;
            }

            case "no-ar": {
                const p = cfg.pulo;
                const tempoTotal = (2 * p.forca) / G;               // duração do pulo em terreno plano
                const vyCima = (yAnterior - g.pos.y) / Math.max(dt(), 0.0001);
                yAnterior = g.pos.y;

                // até "travaMira" o chefe ainda corrige a mira; depois segue reto até onde travou
                if (g.t < p.travaMira) {
                    vx = limitar(dx / Math.max(0.2, tempoTotal - g.t), -p.velHorizontalMax, p.velHorizontalMax);
                    virarPara(player.pos.x);
                }
                g.move(vx, 0);

                g.frame = vyCima > 700 ? 1 : vyCima > 150 ? 2 : vyCima > -150 ? 3 : vyCima > -700 ? 4 : 5;

                if (g.t > 0.2 && g.isGrounded()) pousar();
                break;
            }

            case "pousando": {
                g.frame = g.t < cfg.pulo.quadroPouso ? 6 : 7;
                if (g.t >= cfg.pulo.quadroPouso + cfg.pulo.recuperar) comecarPausa();
                break;
            }

            case "pausa": {
                if (g.t >= cfg.pausaAposAtaque) comecarPerseguicao();
                break;
            }

            case "transicao": {
                // fica parado um instante, sem a máscara, antes de partir pra cima do jogador
                if (g.t >= cfg.tempoTransicao) comecarPerseguicao();
                break;
            }
        }
    });

    // Caiu no abismo: volta pro ponto de origem (o chefe não some da luta)
    g.onCollide("deathZone", () => {
        if (g.morto) return;
        g.pos.x = origem.x;
        g.pos.y = origem.y;
        comecarPausa();
    });

    return g;
}
