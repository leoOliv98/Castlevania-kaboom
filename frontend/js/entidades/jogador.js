// Hitbox "tronco largo, pés estreitos" (coordenadas em px do sprite, centro = posição do jogador).
// A caixa retangular padrão tem 66px de largura: numa rampa a quina da frente encosta primeiro e o
// resto do corpo fica no ar. Com os pés estreitos o jogador acompanha a rampa de perto.
// "escalaAtual" mantém o tamanho no mundo igual nas escalas 0.35 (normal) e 0.4 (ataque).
function formaHitboxEstreita(escalaAtual) {
    if (typeof Polygon !== "function") return null; // sem Polygon no Kaboom: usa a caixa padrão
    const k = 0.35 / escalaAtual;
    const pts = [[-75, -110], [75, -110], [75, 10], [28, 110], [-28, 110], [-75, 10]];
    return new Polygon(pts.map(([x, y]) => vec2(x * k, y * k)));
}

export function criarJogador(spawnX, spawnY, opcoes = {}) {
    const formaInicial = opcoes.hitboxEstreita ? formaHitboxEstreita(0.35) : null;
    const player = add([
        sprite("player"),
        pos(spawnX, spawnY),
        anchor("center"),
        scale(0.35), // <--- DEFINIDO AQUI: Garante que ele já nasce no tamanho correto!
        area(formaInicial ? { shape: formaInicial } : {}),
        body(),
        "player",
        {
            isInvulnerable: false,
            isKnockbacked: false,
            isFlying: false,
            tempoVoo: 0,
            
            ativarVoo(segundos) {
                this.isFlying = true;
                this.tempoVoo = segundos;
                this.use(body({ gravityScale: 0 }));
                
                add([
                    text("Voo Ativado! (10s)", { size: 14 }),
                    pos(this.pos.x, this.pos.y - 30),
                    color(150, 200, 255),
                    lifespan(1, { fade: 1 })
                ]);
            }
        }
    ]);

    player.onUpdate(() => {
        // Se estiver voando, diminui o tempo usando o delta time (dt)
        if (player.isFlying) {
            player.tempoVoo -= dt(); 
            
            if (player.tempoVoo <= 0) {
                player.isFlying = false;
                player.use(body({ gravityScale: 1 })); // Religa a gravidade
                
                add([
                    text("Voo Esgotado!", { size: 14 }),
                    pos(player.pos.x, player.pos.y - 30),
                    color(200, 200, 200),
                    lifespan(1, { fade: 1 })
                ]);
            }
        }
    });

    const JUMP_FORCE = 1100;
    const VELOCIDADE_BASE = 200;
    const VELOCIDADE_VOO = 350; // Um pouco mais rápido no ar

    onKeyDown("left", () => {
        if (player.paused || player.isKnockbacked) return;
        const vel = player.isFlying ? VELOCIDADE_VOO : VELOCIDADE_BASE;
        player.move(-vel, 0);
        player.flipX = true;
        
        // CORREÇÃO: Dispara a animação de andar se estiver no chão
        if (player.isGrounded() && player.curAnim() !== "walk" && !player.isAttacking) {
            player.play("walk");
        }
    });

    onKeyDown("right", () => {
        if (player.paused || player.isKnockbacked) return;
        const vel = player.isFlying ? VELOCIDADE_VOO : VELOCIDADE_BASE;
        player.move(vel, 0);
        player.flipX = false;
        
        // CORREÇÃO: Dispara a animação de andar se estiver no chão
        if (player.isGrounded() && player.curAnim() !== "walk" && !player.isAttacking) {
            player.play("walk");
        }
    });

    onKeyDown("up", () => {
        if (player.paused || player.isKnockbacked) return;
        
        if (player.isFlying) {
            // Movimento livre para cima
            player.move(0, -VELOCIDADE_VOO);
        } 
    });

    onKeyDown("down", () => {
        if (player.paused || player.isKnockbacked) return;
        
        if (player.isFlying) {
            // Movimento livre para baixo
            player.move(0, VELOCIDADE_VOO);
        }
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
        
        play("som_ataque", { volume: 0.6 });   

        const querAtacarParaBaixo = isKeyDown("down");
        const estaViradoEsquerda = player.flipX;
        player.isAttacking = true;

        if (querAtacarParaBaixo) {
            // ATAQUE PARA BAIXO (No ar ou no chão)
            player.use(sprite("player_ataque_baixo")); 
            player.play("ataque_baixo");

            player.scale = vec2(0.4); 
            ajustarHitbox(0.4);
            player.flipX = estaViradoEsquerda;

            // HITBOX EXPANDIDA PARA O ATAQUE PARA BAIXO
            add([
                rect(80, 60),
                pos(player.pos.x, player.pos.y + 20), // <--- aumentado o Y para a hitbox do ataque ficar mais abaixo do jogador
                anchor("center"),
                area(),
                opacity(0),
                lifespan(0.2),
                "ataqueBaixoJogador" 
            ]);

            player.jump(500);

        } else {
            // ATAQUE NORMAL (Lateral)
            player.use(sprite("player_ataque")); 
            player.play("ataque");

            player.scale = vec2(0.4); 
            ajustarHitbox(0.4);
            player.flipX = estaViradoEsquerda;

            const larguraAtaque = 70;
            const direcaoX = estaViradoEsquerda ? -(larguraAtaque / 2 + 10) : (larguraAtaque / 2 + 10);
            
            // Hitbox simétrica com ajuste de altura para o tronco
            add([
                rect(larguraAtaque, 40), 
                pos(player.pos.x + direcaoX, player.pos.y),
                anchor("center"),
                area(),
                opacity(0),     // Visível para ajuste fino
                lifespan(0.2), 
                "ataqueJogador" 
            ]);
        }
    });

    // FIM DA ANIMAÇÃO: Limpamos o bloco duplicado! Trata as duas animações perfeitamente.
    // Troca de escala (ataque) => recalcula a hitbox para o tamanho no mundo não mudar
    function ajustarHitbox(escalaAtual) {
        if (!opcoes.hitboxEstreita) return;
        const forma = formaHitboxEstreita(escalaAtual);
        if (forma) player.area.shape = forma;
    }

    player.onAnimEnd((anim) => {
        if (anim === "ataque" || anim === "ataque_baixo") {
            player.isAttacking = false;
            player.use(sprite("player")); 
            player.play("idle");
            player.scale = vec2(0.35); 
            ajustarHitbox(0.35);
            player.flipX = ultimaDirecao; 
        }
    });

    let ultimaDirecao = false;
    return player;
}