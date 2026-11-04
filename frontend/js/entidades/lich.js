export function criarLich(spawnX, spawnY) {
    const lich = add([
        sprite("lich"),
        pos(spawnX, spawnY),
        area({ width: 40, height: 70, offset: vec2(0, 5) }),
        body({ gravityScale: 0 }),
        scale(0.45),
        anchor("center"),
        "boss",
        { 
            speed: 50, 
            tempoAtaque: 0,
            hp: 30,
            maxHp: 30,
            isDead: false,
            isAttacking: false 
        }
    ]);

    lich.onUpdate(() => {
        if (lich.isDead) return;

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
            
            // Calcula a distância no eixo X entre o chefe e o jogador
            const distanciaX = Math.abs(player.pos.x - lich.pos.x);

            // Se o jogador estiver perto (menos de 250px), usa o Raio. Se estiver longe, Projétil.
            if (distanciaX < 250) {
                iniciarAtaqueRaio(player.pos.x);
            } else {
                iniciarAtaque(dirX);
            }
        }
    });

    // ATAQUE 1: PROJÉTIL (Já existente)
    function iniciarAtaque(direcao) {
        lich.isAttacking = true;
        lich.use(sprite("lich_ataque"));
        lich.play("ataque");
        lich.scale = vec2(0.7);
        lich.flipX = (direcao < 0);

        const direcaoAtaque = direcao;
        wait(0.2, () => {
            if (lich.exists() && !lich.isDead) {
                atirarProjetil(lich.pos, direcaoAtaque);
            }
        });
    }

    // ATAQUE 2: NOVO ATAQUE DE RAIO VERTICAL
    function iniciarAtaqueRaio(alvoX) {
        lich.isAttacking = true;
        lich.use(sprite("lich_ataque"));
        lich.play("ataque");
        lich.scale = vec2(0.7);
        // O chefe vira para onde vai soltar o raio
        lich.flipX = (alvoX < lich.pos.x);

        wait(0.2, () => {
            if (lich.exists() && !lich.isDead) {
                // Cria um aviso visual no chão ou perto da área (opcional, mas bom para game feel)
                const aviso = add([
                    rect(30, 800), // Um pilar longo transparente
                    pos(alvoX, -200), // Começa lá de cima do mapa
                    color(0, 200, 255),
                    opacity(0.3), // Apenas um "fantasma" verde
                    lifespan(0.5) // Fica por meio segundo avisando onde o raio vai cair
                ]);

                // Depois de 0.5s de aviso, o raio cai!
                wait(0.5, () => {
                    invocarRaioFisico(alvoX);
                });
            }
        });
    }

    function invocarRaioFisico(alvoX) {
        // Encontra todos os blocos do teto/chão ("ground") que estão próximos ao eixo X do ataque
        const blocosSolidos = get("ground");
        let limiteY = 1200; // Ponto mais baixo do mapa por padrão
        const origemRaioY = -200; // O raio vem lá do alto (fora da tela)

        // Vamos procurar qual bloco sólido está bloqueando o caminho vertical do raio!
        blocosSolidos.forEach(bloco => {
            // Se o bloco estiver cruzando com a linha de tiro do raio no eixo X
            if (bloco.pos.x <= alvoX + 15 && bloco.pos.x + 48 >= alvoX - 15) { 
                // E se esse bloco estiver mais alto que o nosso limite Y atual
                if (bloco.pos.y < limiteY) {
                    limiteY = bloco.pos.y; // O novo limite de impacto do raio passa a ser o teto desse bloco!
                }
            }
        });

        const alturaDoRaio = limiteY - origemRaioY;

        // Cria o Raio Visual e Hitbox
        const raio = add([
            rect(20, alturaDoRaio), // Estica o retângulo até bater no bloco!
            pos(alvoX, origemRaioY),
            color(0, 200, 255),     // Azul
            area(),                 // Tem colisão!
            "raioLich",             // Tag para dar dano no jogador
            opacity(1),
            lifespan(0.3, { fade: 0.1 }) // Fica ativo por 0.3 segundos e depois desaparece suavemente
        ]);

        // Cria uma explosão na ponta onde o raio bateu no bloco/chão
        criarExplosao(vec2(alvoX, limiteY));
    }


    lich.onAnimEnd((anim) => {
        if (anim === "ataque" && !lich.isDead) {
            lich.use(sprite("lich"));
            lich.scale = vec2(0.45);
            lich.isAttacking = false;
        }
    });

    function posicaoOrigemProj(lichPos, direcao) {
        return vec2(lichPos.x + (direcao * 30), lichPos.y);
    }

    function atirarProjetil(posicaoLich, direcao) {
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
                tempoVida: 4 
            }
        ]);

        proj.flipX = (direcao < 0);

        proj.onUpdate(() => {
            proj.pos.x += proj.dir * proj.velocidade * dt();
            proj.tempoVida -= dt();
            if (proj.tempoVida <= 0) {
                if (proj.exists()) destroy(proj);
            }
        });
    }

    return lich;
}

export function criarExplosao(posicao) {
    add([
        sprite("explosao_lich", { anim: "explodir" }),
        pos(posicao),
        anchor("center"),
        scale(0.3), 
        lifespan(0.4) 
    ]);
}