import { BALANCEAMENTO } from "../balanceamento.js";

export function criarLich(spawnX, spawnY) {
    const lich = add([
        sprite("lich", { anim: "walk" }),
        pos(spawnX, spawnY),
        area({ width: 40, height: 70, offset: vec2(0, 5) }),
        body({ gravityScale: 0 }),
        scale(0.4),
        anchor("center"),
        "boss",
        { 
            speed: 50, 
            tempoAtaque: 0,
            tempoRisada: 0, // NOVO: Controla o intervalo para as risadas
            hp: BALANCEAMENTO.vida.lich,
            maxHp: BALANCEAMENTO.vida.lich,
            isDead: false,
            isAttacking: false 
        }
    ]);

    lich.onUpdate(() => {
        if (lich.isDead) return;

        // --- SISTEMA DE RISADAS ALEATÓRIAS A CADA ALGUNS SEGUNDOS ---
        if (!lich.paused) {
            lich.tempoRisada += dt();
            // Sorteia um intervalo entre 6 e 12 segundos para a risada
            if (!lich.intervaloRisadaAlvo) {
                lich.intervaloRisadaAlvo = rand(6, 12);
            }

            if (lich.tempoRisada >= lich.intervaloRisadaAlvo) {
                lich.tempoRisada = 0;
                lich.intervaloRisadaAlvo = rand(6, 12); // Reseta para o próximo ciclo

                const faixasRisada = ["risada_lich_1", "risada_lich_2", "risada_lich_3"];
                const risadaEscolhida = faixasRisada[Math.floor(Math.random() * faixasRisada.length)];
                play(risadaEscolhida, { volume: 0.6 });
            }
        }

        const player = get("player")[0];
        if (!player) return;

        const dirX = player.pos.x > lich.pos.x ? 1 : -1;
        lich.flipX = dirX < 0;

        if (!lich.isAttacking) {
            lich.pos.x += dirX * lich.speed * dt();
            
            const flutuacaoY = Math.sin(time() * 3) * 30;
            const targetY = player.pos.y - 80 + flutuacaoY;
            lich.pos.y += (targetY - lich.pos.y) * 2 * dt();
        }

        // Sistema de Ataque Misto (Projétil ou Raio)
        lich.tempoAtaque += dt();
        if (lich.tempoAtaque >= 3 && !lich.isAttacking) {
            lich.tempoAtaque = 0;
            
            const distanciaX = Math.abs(player.pos.x - lich.pos.x);

            if (distanciaX < 250) {
                iniciarAtaqueRaio(player.pos.x, player.pos.y);
            } else {
                iniciarAtaque(dirX);
            }
        }
    });

    function iniciarAtaque(direcao) {
        lich.isAttacking = true;
        lich.use(sprite("lich_ataque"));
        lich.play("ataque");
        lich.scale = vec2(0.6);
        lich.flipX = (direcao < 0);

        const direcaoAtaque = direcao;
        wait(0.2, () => {
            if (lich.exists() && !lich.isDead) {
                atirarProjetil(lich.pos, direcaoAtaque);
            }
        });
    }

    // Calcula por onde o raio cai sobre a coluna x. Ele vem do ALTO da tela e para no primeiro bloco que encontra,
    // então o jogador pode se proteger embaixo de uma plataforma (o raio bate em cima dela). Se não houver nada acima
    // dele, o raio vai até o chão. Usa hasPoint() (como o guardião): funciona com blocos de qualquer largura e rampas.
    function calcularRaio(x, y) {
        const solos = get("ground");
        const solido = (py) => solos.some(s => s.hasPoint(vec2(x, py)));
        const topo = y - 450;     // um pouco acima da borda de cima da tela (a tela tem 600 px de altura)

        // O alto da tela já está dentro da rocha (teto grosso): o raio bate na parte de baixo dela, e o jogador fica protegido
        if (solido(topo)) {
            let py = topo;
            while (solido(py) && py < y + 1400) py += 4;
            return { origemY: py - 60, limiteY: py };
        }
        for (let py = topo; py < y + 1400; py += 4) {
            if (solido(py)) return { origemY: topo, limiteY: py };   // primeiro bloco: plataforma, teto ou chão
        }
        return { origemY: topo, limiteY: y + 600 };
    }

    function iniciarAtaqueRaio(alvoX, alvoY) {
        lich.isAttacking = true;
        lich.use(sprite("lich_ataque"));
        lich.play("ataque");
        lich.scale = vec2(0.6);
        lich.flipX = (alvoX < lich.pos.x);

        let tempoEsperaDisparo = 0.2;

        const controleDisparo = onUpdate(() => {
            if (lich.paused) return; 
            
            tempoEsperaDisparo -= dt();
            if (tempoEsperaDisparo <= 0) {
                controleDisparo.cancel();
                if (lich.exists() && !lich.isDead) {
                    criarAvisoRaio(alvoX, alvoY);
                }
            }
        });
    }

    function criarAvisoRaio(alvoX, alvoY) {
        // O raio cai do alto e bate no primeiro bloco da coluna (ver calcularRaio)
        const { origemY, limiteY } = calcularRaio(alvoX, alvoY);

        // --- TOCA O SOM DE CARREGAMENTO DO RAIO (FEIXE) QUANDO O AVISO APARECE ---
        play("som_carregando_raio", { 
            volume: 0.7, 
            speed: 2 // <--- Ajuste este valor para controlar a velocidade do áudio
        });

        const aviso = add([
            rect(30, limiteY - origemY),
            pos(alvoX, origemY),
            color(0, 200, 255),
            opacity(0.3),
            "avisoRaio",
            { tempoVida: 0.5 } 
        ]);

        const controleAviso = aviso.onUpdate(() => {
            if (aviso.paused) return;

            aviso.tempoVida -= dt();
            if (aviso.tempoVida <= 0) {
                controleAviso.cancel();
                if (aviso.exists()) destroy(aviso);
                invocarRaioFisico(alvoX, origemY, limiteY);
            }
        });
    }

    function invocarRaioFisico(alvoX, origemRaioY, limiteY) {
        // --- TOCA O SOM DE IMPACTO QUANDO O RAIO BATE NO CHÃO ---
        play("som_batida_raio", { volume: 0.8 });

        const alturaDoRaio = limiteY - origemRaioY;
        const larguraRaio = 20;

        const raio = add([
            rect(larguraRaio, alturaDoRaio), 
            pos(alvoX, origemRaioY),
            color(0, 200, 255),     
            area(),                 
            "raioLich",             
            opacity(1),
            { tempoVida: 0.3 }
        ]);

        const controleRaio = raio.onUpdate(() => {
            if (raio.paused) return;

            raio.tempoVida -= dt();
            
            if (raio.tempoVida <= 0.1) {
                raio.opacity = Math.max(0, raio.tempoVida / 0.1);
            }

            if (raio.tempoVida <= 0) {
                controleRaio.cancel();
                if (raio.exists()) destroy(raio);
            }
        });

        criarExplosaoAzul(vec2(alvoX + (larguraRaio / 2), limiteY));
    }

    lich.onAnimEnd((anim) => {
        if (anim === "ataque" && !lich.isDead) {
            lich.use(sprite("lich"));
            lich.play("walk"); 
            lich.scale = vec2(0.4);
            lich.isAttacking = false;
        }
    });

    function posicaoOrigemProj(lichPos, direcao) {
        return vec2(lichPos.x + (direcao * 30), lichPos.y);
    }

    function atirarProjetil(posicaoLich, direcao) {
        // Toca a risada em loop e armazena na constante somRisada
        const somRisada = play("risada_projetil_lich", { 
            volume: 2, 
            loop: true 
        });

        const proj = add([
            sprite("projetil-lich", { anim: "voo" }),
            pos(posicaoOrigemProj(posicaoLich, direcao)),
            area({ width: 30, height: 15 }),
            anchor("center"),
            scale(0.2),
            "projetilLich",
            { 
                dir: direcao, 
                velocidade: 250,
                tempoVida: 4,
                somLoop: somRisada // Guarda a referência do som no objeto do projétil
            }
        ]);

        proj.flipX = (direcao < 0);

        proj.onUpdate(() => {
            proj.pos.x += proj.dir * proj.velocidade * dt();
            proj.tempoVida -= dt();
            
            if (proj.tempoVida <= 0) {
                if (proj.somLoop) proj.somLoop.paused = true;
                if (proj.exists()) destroy(proj);
            }
        });

        proj.destruirComExplosao = () => {
            if (proj.somLoop) proj.somLoop.paused = true;
            play("projetil_lich_explodindo", { volume: 0.8 });
            criarExplosaoVerde(proj.pos);
            destroy(proj);
        };
    }
    return lich;
}

export function criarExplosaoVerde(posicao) {
    add([
        sprite("explosao_lich", { anim: "explodir" }),
        pos(posicao),
        anchor("center"),
        scale(0.3), 
        lifespan(0.4) 
    ]);
}

export function criarExplosaoAzul(posicao) {
    add([
        sprite("explosao_azul", { anim: "explodir" }),
        pos(posicao),
        anchor("center"),
        scale(0.3), 
        lifespan(0.4) 
    ]);
}