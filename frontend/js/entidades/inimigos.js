export function criarEsqueleto(spawnX, spawnY, larguraTotalMapa) {
    const enemy = add([
        sprite("esqueleto", { anim: "walk" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body(),
        scale(0.4),
        anchor("center"),
        "enemy",
        { dir: 1, speed: 70, isAttacking: false }
    ]);

    let ultimoPulo = 0;

    enemy.onUpdate(() => {
        if (enemy.isAttacking) return;

        const player = get("player")[0];
        
        if (player) {
            const distX = player.pos.x - enemy.pos.x;
            const distY = Math.abs(player.pos.y - enemy.pos.y);

            // Quando o jogador chega perto, o esqueleto ataca com aviso visual imediato
            if (Math.abs(distX) < 60 && distY < 50) {
                enemy.isAttacking = true;
                
                // Vira para o jogador
                enemy.dir = distX > 0 ? 1 : -1;
                enemy.flipX = enemy.dir < 0;

                const direcaoAtk = enemy.dir;

                enemy.use(sprite("esqueleto_ataque")); 
                enemy.play("ataque");
                enemy.flipX = (direcaoAtk < 0);

                wait(0.25, () => {
                    if (!enemy.exists()) return;

                    const offsetHitbox = direcaoAtk * 40;

                    add([
                        rect(30, 50),
                        pos(enemy.pos.x + offsetHitbox, enemy.pos.y),
                        anchor("center"),
                        area(),
                        opacity(0),
                        lifespan(0.2), 
                        "ataqueInimigo"
                    ]);
                });

                return; 
            }
        }

        // Lógica de Patrulha normal
        enemy.move(enemy.speed * enemy.dir, 0);

        // Detecção de buracos com Cooldown
        if (enemy.isGrounded() && (time() - ultimoPulo > 3)) {
            const aheadX = enemy.pos.x + (enemy.dir * 25);
            const aheadY = enemy.pos.y + 20; 

            const chaoAdiante = get("ground").some(g => g.hasPoint(vec2(aheadX, aheadY)));

            if (!chaoAdiante) {
                enemy.jump(850);
                ultimoPulo = time();
            }
        }

        if (enemy.pos.x > larguraTotalMapa - 100) {
            enemy.dir = -1;
            enemy.flipX = true;
        } else if (enemy.pos.x < 100) {
            enemy.dir = 1;
            enemy.flipX = false;
        }
    });

    // Inverte o movimento e dá um pulo ao colidir com uma parede lateral
    enemy.onCollide("ground", (ground, col) => {
        if (col.isLeft() || col.isRight()) {
            enemy.dir *= -1;
            enemy.flipX = (enemy.dir < 0);
            
            if (enemy.isGrounded() && (time() - ultimoPulo > 0.5)) {
                enemy.jump(900); 
                ultimoPulo = time();
            }
        }
    });

    // Inverte o movimento e pula também se esbarrar em outro esqueleto/inimigo
    enemy.onCollide("enemy", (outroInimigo, col) => {
        if (col.isLeft() || col.isRight()) {
            enemy.dir *= -1;
            enemy.flipX = (enemy.dir < 0);
        }
    });

    // NOVO: Se o esqueleto encostar na zona de morte lá embaixo, ele é destruído
    enemy.onCollide("deathZone", () => {
        destroy(enemy);
    });

    // FIM DA ANIMAÇÃO: Esqueleto volta a patrulhar
    enemy.onAnimEnd((anim) => {
        if (anim === "ataque") {
            enemy.isAttacking = false;
            enemy.use(sprite("esqueleto"));
            enemy.play("walk");
        }
    });

    return enemy;
}