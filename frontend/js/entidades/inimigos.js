export function criarEsqueleto(spawnX, spawnY, larguraTotalMapa) {
    const enemy = add([
        sprite("esqueleto", { anim: "walk" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body(),
        scale(0.4),
        anchor("center"),
        "enemy",
        { dir: 1, speed: 70, isAttacking: false } // Novo estado
    ]);

    enemy.onUpdate(() => {
        // Se já está atacando, paralisa a caminhada
        if (enemy.isAttacking) return;

        // Pega as coordenadas do Jogador
        const player = get("player")[0];
        
        if (player) {
            const distX = player.pos.x - enemy.pos.x;
            const distY = Math.abs(player.pos.y - enemy.pos.y);

            // Verifica se o player está a menos de 60 pixels de distância e na mesma altura
            if (Math.abs(distX) < 60 && distY < 50) {
                enemy.isAttacking = true;
                enemy.use(sprite("esqueleto_ataque")); // Puxa sprite de ataque
                enemy.play("ataque");

                // Vira o esqueleto para a direção em que o jogador está
                enemy.dir = distX > 0 ? 1 : -1;
                enemy.flipX = enemy.dir < 0;

                // Hitbox do ataque do inimigo
                add([
                    rect(30, 50),
                    pos(enemy.pos.x + (enemy.dir * 40), enemy.pos.y),
                    anchor("center"),
                    area(),
                    opacity(0),
                    lifespan(0.3),
                    "ataqueInimigo"
                ]);
                return; // Para a lógica de patrulha
            }
        }

        // Lógica de Patrulha (Se não estiver perto do jogador)
        enemy.move(enemy.speed * enemy.dir, 0);

        if (enemy.pos.x > larguraTotalMapa - 100) {
            enemy.dir = -1;
            enemy.flipX = true;
        } else if (enemy.pos.x < 100) {
            enemy.dir = 1;
            enemy.flipX = false;
        }
    });

    enemy.onCollide("ground", (ground, col) => {
        if (col.isLeft() || col.isRight()) {
            enemy.dir *= -1;
            enemy.flipX = (enemy.dir < 0);
        }
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