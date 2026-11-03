export function criarJogador(spawnX, spawnY) {
    const player = add([
        sprite("player", { anim: "idle" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body({ maxVel: 800 }),
        scale(0.35),
        anchor("center"),
        "player",
        { isAttacking: false } // Novo estado para controlar o ataque
    ]);

    const SPEED = 300;
    const JUMP_FORCE = 1100;

    // CONTROLES DE MOVIMENTO (Bloqueados se estiver atacando ou pausado)
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

    // SISTEMA DE ATAQUE (Tecla Z)
    onKeyPress("z", () => {
        // Removemos a checagem !player.isGrounded() para permitir o ataque pulando
        if (player.isAttacking) return;

        const estaViradoEsquerda = player.flipX;

        player.isAttacking = true;
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
    });

    // FIM DA ANIMAÇÃO: Volta para a imagem normal, restaura a escala e a direção correta
    player.onAnimEnd((anim) => {
        if (anim === "ataque") {
            player.isAttacking = false;
            player.use(sprite("player")); 
            player.play("idle");
            player.scale = vec2(0.35); // Restaura o tamanho padrão de quando ele anda/fica parado
            player.flipX = ultimaDirecao; 
        }
    });

    // Variável para lembrar a última direção que o jogador olhava (false = direita, true = esquerda)
    let ultimaDirecao = false;
    return player;
}