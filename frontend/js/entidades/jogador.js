export function criarJogador(spawnX, spawnY) {
    let ultimaDirecao = false;

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

    // SISTEMA DE ATAQUE FÍSICO (Tecla Z ou Z + Baixo)
    onKeyPress("z", () => {
        if (player.isAttacking) return;

        const querAtacarParaBaixo = isKeyDown("down");
        const estaViradoEsquerda = player.flipX;
        player.isAttacking = true;

        if (querAtacarParaBaixo) {
            player.use(sprite("player_ataque_baixo")); 
            player.play("ataque_baixo");
            player.scale = vec2(0.4);
            player.flipX = estaViradoEsquerda;

            add([
                rect(40, 40),
                pos(player.pos.x, player.pos.y + 45),
                anchor("center"),
                area(),
                opacity(0), 
                lifespan(0.25), 
                "ataqueBaixoJogador" 
            ]);

            player.jump(500);
        } else {
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

    // SISTEMA DE MAGIA DE FOGO (Tecla X)
    onKeyPress("x", () => {
        if (player.isAttacking) return;

        const estaViradoEsquerda = player.flipX;
        player.isAttacking = true;

        // Usa o sprite do ataque de fogo e inicia a animação
        player.use(sprite("ataque_fogo"));
        player.play("cast");

        player.scale = vec2(0.4);
        player.flipX = estaViradoEsquerda;

        const offsetSpawnX = estaViradoEsquerda ? -30 : 30;
        const direcaoProjetil = estaViradoEsquerda ? -1 : 1;
        const velocidadeProjetil = 400;

        const bolaDeFogo = add([
            sprite("bola_fogo", { anim: "fly" }),
            pos(player.pos.x + offsetSpawnX, player.pos.y),
            anchor("center"),
            area(),
            scale(0.5),
            move(vec2(direcaoProjetil, 0), velocidadeProjetil),
            lifespan(1.2),
            "ataqueFogoJogador",
        ]);

        bolaDeFogo.flipX = estaViradoEsquerda;
    });

    // FIM DE QUALQUER ANIMAÇÃO DE ATAQUE (Z ou X)
    player.onAnimEnd((anim) => {
        if (anim === "ataque" || anim === "ataque_baixo" || anim === "cast") {
            player.isAttacking = false;
            player.use(sprite("player")); // Retorna ao sprite base correto
            player.play("idle");
            player.scale = vec2(0.35); 
            player.flipX = ultimaDirecao; 
        }
    });

    return player;
}