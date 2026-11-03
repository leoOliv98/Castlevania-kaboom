export function criarJogador(spawnX, spawnY) {
    const player = add([
        sprite("player", { anim: "idle" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body({ maxVel: 800 }),
        scale(0.35),
        anchor("center"),
        "player",
        { isAttacking: false } 
    ]);

    const SPEED = 300;
    const JUMP_FORCE = 1100;

    // CONTROLES DE MOVIMENTO
    onKeyDown("left", () => {
        if (player.isAttacking || player.paused) return; 
        player.move(-SPEED, 0);
        player.flipX = true;
        ultimaDirecao = true;
        if (player.isGrounded() && player.curAnim() !== "walk") player.play("walk");
    });

    onKeyDown("right", () => {
        if (player.isAttacking || player.paused) return;
        player.move(SPEED, 0);
        player.flipX = false;
        ultimaDirecao = false;
        if (player.isGrounded() && player.curAnim() !== "walk") player.play("walk");
    });

    onKeyRelease("left", () => {
        if (!isKeyDown("right") && !player.isAttacking) player.play("idle");
    });

    onKeyRelease("right", () => {
        if (!isKeyDown("left") && !player.isAttacking) player.play("idle");
    });

    onKeyPress("up", () => {
        if (player.isGrounded() && !player.isAttacking) {
            player.jump(JUMP_FORCE);
            player.play("idle");
        }
    });

    // SISTEMA DE ATAQUE (Tecla Z ou Z + Baixo)
    onKeyPress("z", () => {
        if (player.isAttacking) return;

        // NOVO: Apenas verifica se a seta para baixo está pressionada, sem exigir que esteja no ar
        const querAtacarParaBaixo = isKeyDown("down");

        const estaViradoEsquerda = player.flipX;
        player.isAttacking = true;

        if (querAtacarParaBaixo) {
            // ATAQUE PARA BAIXO (No ar ou no chão)
            player.use(sprite("player_ataque_baixo")); 
            player.play("ataque_baixo");

            player.scale = vec2(0.4);
            player.flipX = estaViradoEsquerda;

            // Cria a Hitbox logo abaixo dos pés do personagem
            add([
                rect(40, 40),
                pos(player.pos.x, player.pos.y + 45),
                anchor("center"),
                area(),
                opacity(0), 
                lifespan(0.25), 
                "ataqueBaixoJogador" 
            ]);

            // Dá um leve impulso para cima simulando o recuo do impacto no chão/inimigo
            player.jump(500);

        } else {
            // ATAQUE NORMAL (Lateral)
            player.use(sprite("player_ataque")); 
            player.play("ataque");

            player.scale = vec2(0.4); 
            player.flipX = estaViradoEsquerda;

            const direcaoX = estaViradoEsquerda ? -40 : 40;
            
            add([
                rect(40, 50),
                pos(player.pos.x + direcaoX, player.pos.y),
                anchor("center"),
                area(),
                opacity(0), 
                lifespan(0.2), 
                "ataqueJogador" 
            ]);
        }
    });

    // FIM DA ANIMAÇÃO: Limpamos o bloco duplicado! Trata as duas animações perfeitamente.
    player.onAnimEnd((anim) => {
        if (anim === "ataque" || anim === "ataque_baixo") {
            player.isAttacking = false;
            player.use(sprite("player")); 
            player.play("idle");
            player.scale = vec2(0.35); 
            player.flipX = ultimaDirecao; 
        }
    });

    let ultimaDirecao = false;
    return player;
}