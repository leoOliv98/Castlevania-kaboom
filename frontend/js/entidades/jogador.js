export function criarJogador(spawnX, spawnY) {
    const player = add([
        sprite("player", { anim: "idle" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body({ maxVel: 800 }),
        scale(0.35),
        anchor("center"),
        "player"
    ]);

    const SPEED = 300;
    const JUMP_FORCE = 1100;

    onKeyDown("left", () => {
        player.move(-SPEED, 0);
        player.flipX = true;
        if (player.isGrounded() && player.curAnim() !== "walk") {
            player.play("walk");
        }
    });

    onKeyDown("right", () => {
        player.move(SPEED, 0);
        player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "walk") {
            player.play("walk");
        }
    });

    onKeyRelease("left", () => {
        if (!isKeyDown("right")) player.play("idle");
    });

    onKeyRelease("right", () => {
        if (!isKeyDown("left")) player.play("idle");
    });

    onKeyPress("up", () => {
        if (player.isGrounded()) {
            player.jump(JUMP_FORCE);
            player.play("idle");
        }
    });

    return player;
}