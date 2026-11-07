import { BALANCEAMENTO } from "../balanceamento.js";

// frontend/entidades/lobos.js
export function criarLobo(spawnX, spawnY) {
    const lobo = add([
        sprite("lobo_correndo", { anim: "walk" }),
        pos(spawnX, spawnY),
        area({ width: 45, height: 30, offset: vec2(0, 10) }),
        body(),
        anchor("bot"), 
        scale(0.5), 
        "enemy", 
        {
            dir: 1,
            speed: 170, 
            isAttacking: false,
            isDead: false,
            isLobo: true,
            hp: BALANCEAMENTO.vida.lobo,
            maxHp: BALANCEAMENTO.vida.lobo
        }
    ]);

    // Adicionado: Evento de morte do lobo com animação e áudio
    lobo.on("death", () => {
        if (lobo.isDead) return;
        
        // Marca como morto (isso já paralisa a perseguição e os ataques no onUpdate)
        lobo.isDead = true; 
        
        play("som_lobo_morte", { volume: 0.6 });

        // 1. Troca para a textura de morte
        lobo.use(sprite("lobo_morrendo"));
        
        // 2. Garante que a escala e o espelhamento voltem ao normal 
        // --- AUMENTE A ESCALA AQUI (Exemplo: 0.75) ---
        lobo.use(scale(0.75)); 
        
        lobo.flipX = lobo.dir < 0;
        
        // 3. Remove a tag "enemy" da física e ignora o jogador para o corpo não atrapalhar a movimentação
        lobo.use(area({ collisionIgnore: ["player", "ataqueJogador", "ataqueBaixoJogador"] }));

        // 4. Inicia a animação de morte
        lobo.play("morte");
        
        // 5. Destrói o lobo do cenário apenas quando a animação de morte terminar
        lobo.onAnimEnd((anim) => {
            if (anim === "morte") {
                // Aguarda um pequeno instante de 0.5s com o corpo no chão antes de sumir
                wait(0.5, () => {
                    destroy(lobo);
                });
            }
        });
    });

    lobo.onUpdate(() => {
        if (lobo.isDead) return;

        // Quando o lobo está atacando e está no ar, aplicamos um movimento contínuo no eixo X
        if (lobo.isAttacking) {
            if (!lobo.isGrounded()) {
                lobo.move(300 * lobo.dir, 0); 
            }
            return; 
        }

        const player = get("player")[0];
        if (player) {
            const distX = player.pos.x - lobo.pos.x;
            const distY = Math.abs(player.pos.y - lobo.pos.y);

            lobo.dir = distX > 0 ? 1 : -1;
            lobo.flipX = lobo.dir < 0;

            // Condição para engajar no ataque com pulo
            if (Math.abs(distX) < 200 && distY < 200 && lobo.isGrounded()) {
                lobo.isAttacking = true;
                
                lobo.use(sprite("lobo_atacando"));
                lobo.flipX = lobo.dir < 0;
                lobo.use(scale(0.75));
                
                lobo.play("ataque");
                lobo.jump(450); 

                // Toca o som de ataque do lobo recém-carregado
                play("som_lobo_ataque", { volume: 0.5 });

                wait(0.2, () => {
                    if (!lobo.exists() || lobo.isDead) return;

                    // Criação da hitbox do ataque
                    add([
                        rect(120, 90), 
                        pos(lobo.pos.x + (lobo.dir * 20), lobo.pos.y - 70), 
                        anchor("center"),
                        area(),
                        opacity(0), 
                        lifespan(0.25),
                        "ataqueInimigo"
                    ]);
                });
                return;
            }
        }

        const velAtual = lobo.isGrounded() ? lobo.speed : lobo.speed * 1.5;
        lobo.move(velAtual * lobo.dir, 0);
    });

    lobo.onAnimEnd((anim) => {
        if (anim === "ataque" && !lobo.isDead) {
            lobo.isAttacking = false;
            lobo.use(sprite("lobo_correndo"));
            lobo.flipX = lobo.dir < 0;
            lobo.use(scale(0.5));
            lobo.play("walk");
        }
    });

    return lobo;
}