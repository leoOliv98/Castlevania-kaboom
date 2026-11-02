export function criarEsqueleto(spawnX, spawnY, larguraTotalMapa) {
    const enemy = add([
        sprite("esqueleto", { anim: "walk" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body(),
        scale(0.4),
        anchor("center"),
        "enemy",
        { dir: 1, speed: 70 }
    ]);

    enemy.onUpdate(() => {
        enemy.move(enemy.speed * enemy.dir, 0);

        if (enemy.pos.x > larguraTotalMapa - 100) {
            enemy.dir = -1;
            enemy.flipX = true;
        } else if (enemy.pos.x < 100) {
            enemy.dir = 1;
            enemy.flipX = false;
        }
    });

    // Inverte o movimento apenas ao colidir com uma parede lateral
    enemy.onCollide("ground", (ground, col) => {
        if (col.isLeft() || col.isRight()) {
            enemy.dir *= -1;
            enemy.flipX = (enemy.dir < 0);
        }
    });

    return enemy;
}