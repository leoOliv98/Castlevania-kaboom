import { BALANCEAMENTO } from "../balanceamento.js";
import { criarBolaDeFogo } from "./bolasDeFogo.js";

// Hitbox "tronco largo, pés estreitos" (coordenadas em px do sprite, centro = posição do jogador).
// A caixa retangular padrão tem 66px de largura: numa rampa a quina da frente encosta primeiro e o
// resto do corpo fica no ar. Com os pés estreitos o jogador acompanha a rampa de perto.
// "escalaAtual" mantém o tamanho no mundo igual nas escalas 0.35 (normal), 0.4 (espada) e 0.44 (conjurar).
function formaHitboxEstreita(escalaAtual) {
    if (typeof Polygon !== "function") return null; // sem Polygon no Kaboom: usa a caixa padrão
    const k = 0.35 / escalaAtual;
    const pts = [[-75, -110], [75, -110], [75, 10], [28, 110], [-28, 110], [-75, 10]];
    return new Polygon(pts.map(([x, y]) => vec2(x * k, y * k)));
}

export function criarJogador(spawnX, spawnY, opcoes = {}) {
    const formaInicial = opcoes.hitboxEstreita ? formaHitboxEstreita(0.35) : null;
    let direcaoAoAtacar = false; // lado para onde o jogador estava virado ao começar o ataque

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

            // Mana: cada bola de fogo gasta BALANCEAMENTO.mana.custoBolaDeFogo (ver balanceamento.js)
            mana: BALANCEAMENTO.mana.maxima,
            manaMax: BALANCEAMENTO.mana.maxima,
            conjurando: false,
            bolaLancada: false,
            
            ativarVoo(segundos) {
                this.isFlying = true;
                this.tempoVoo = segundos;
                
                // --- O GRANDE TRUQUE ---
                // Como não podemos acessar 'this.vel', enganamos o motor de física 
                // forçando-o a sobrescrever o pulo original de -1100 com um pulo de força microscópica.
                // Usamos 0.01 em vez de 0 absoluto para evitar que a engine ignore valores nulos.
                this.jump(0.01); 

                // Agora sim, desliga a gravidade com a inércia estabilizada
                this.gravityScale = 0; 
                
                const estavaVirado = this.flipX; 
                this.use(sprite("player_voando")); 
                this.play("voar");
                this.scale = vec2(0.44); 
                
                ajustarHitbox(0.44);
                
                // Descola 2 pixels do chão/rampa fisicamente
                this.pos.y -= 2;

                this.flipX = estavaVirado; 
                
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

                // Religa a gravidade sem quebrar a física
                player.gravityScale = 1;
                
                // --- CORREÇÃO AQUI: Só força a troca de sprite se NÃO estiver atacando ---
                if (!player.isAttacking) {
                    const estavaVirado = player.flipX;
                    player.use(sprite("player")); 
                    player.play("idle");
                    player.scale = vec2(0.35); // Retorna à escala original
                    ajustarHitbox(0.35);       // Recalcula a caixa de colisão
                    player.flipX = estavaVirado;
                }
                
                add([
                    text("Voo Esgotado!", { size: 14 }),
                    pos(player.pos.x, this.pos ? this.pos.y - 30 : player.pos.y - 30),
                    color(200, 200, 200),
                    lifespan(1, { fade: 1 })
                ]);
            }
        }
    });

    // A bola de fogo sai da ponta do cajado quando a animação chega ao quadro do disparo
    const QUADRO_DISPARO = 3;
    const PONTA_CAJADO = { x: 57, y: -10 }; // px no mundo, a partir do centro do jogador (medido na arte)
    player.onUpdate(() => {
        if (player.conjurando && !player.bolaLancada && player.frame >= QUADRO_DISPARO) {
            player.bolaLancada = true;
            const dir = direcaoAoAtacar ? -1 : 1;
            criarBolaDeFogo(player.pos.x + dir * PONTA_CAJADO.x, player.pos.y + PONTA_CAJADO.y, dir);
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
        
        // CORREÇÃO: Dispara a animação de andar se estiver no chão E NÃO ESTIVER VOANDO
        if (player.isGrounded() && !player.isFlying && player.curAnim() !== "walk" && !player.isAttacking) {
            player.play("walk");
        }
    });

    onKeyDown("right", () => {
        if (player.paused || player.isKnockbacked) return;
        const vel = player.isFlying ? VELOCIDADE_VOO : VELOCIDADE_BASE;
        player.move(vel, 0);
        player.flipX = false;
        
        // CORREÇÃO: Dispara a animação de andar se estiver no chão E NÃO ESTIVER VOANDO
        if (player.isGrounded() && !player.isFlying && player.curAnim() !== "walk" && !player.isAttacking) {
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
        if (!isKeyDown("right") && !player.isAttacking && !player.isFlying) player.play("idle");
    });

    onKeyRelease("right", () => {
        if (!isKeyDown("left") && !player.isAttacking && !player.isFlying) player.play("idle");
    });

    onKeyPress("up", () => {
        // CORREÇÃO: Adicionamos o "!player.isFlying" para impedir que
        // o jogador dispare a força de pulo da física enquanto usa as asas
        if (player.isGrounded() && !player.isAttacking && !player.isFlying) {
            player.jump(JUMP_FORCE);
            player.play("idle");
        }
    });

    // SISTEMA DE ATAQUE FÍSICO (Tecla Z ou Z + Baixo)
    onKeyPress("z", () => {
        if (player.paused || player.isAttacking) return;
        
        play("som_ataque", { volume: 0.6 });   

        const querAtacarParaBaixo = isKeyDown("down");
        const estaViradoEsquerda = player.flipX;
        direcaoAoAtacar = estaViradoEsquerda; // para voltar virado pro mesmo lado quando o ataque acabar
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

            if (!player.isFlying) {
                player.jump(500);
            }

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

    // BOLA DE FOGO (Tecla X): gasta mana, toca a animação de conjurar e a bola sai no quadro do disparo
    const ESCALA_CONJURAR = 0.44; // a arte do cajado tem 175px de altura (a de andar tem 220)
    let avisoManaEm = -10;
    onKeyPress("x", () => {
        if (player.paused || player.isKnockbacked || player.isAttacking) return;

        const custo = BALANCEAMENTO.mana.custoBolaDeFogo;
        if (player.mana < custo) {
            // sem mana: avisa (no máximo 1 aviso a cada 0.6s para não encher a tela)
            if (time() - avisoManaEm > 0.6) {
                avisoManaEm = time();
                add([
                    text("Sem mana!", { size: 14 }),
                    pos(player.pos.x, player.pos.y - 50),
                    color(120, 170, 255),
                    lifespan(0.8, { fade: 0.8 })
                ]);
            }
            return;
        }
        player.mana -= custo;

        play("som_bola_de_fogo", { volume: 0.6 });

        const estaViradoEsquerda = player.flipX;
        direcaoAoAtacar = estaViradoEsquerda;
        player.isAttacking = true;
        player.conjurando = true;
        player.bolaLancada = false;

        player.use(sprite("player_conjurar"));
        player.play("conjurar");
        player.scale = vec2(ESCALA_CONJURAR);
        ajustarHitbox(ESCALA_CONJURAR, true); // a arte é larga (o fogo sai do corpo): força a hitbox estreita
        player.flipX = estaViradoEsquerda;
    });

    // Troca de escala (ataque) => recalcula a hitbox para o tamanho no mundo não mudar.
    // forcarEstreita: usa a hitbox estreita mesmo em levels que não a ligaram (frames largos, como o de conjurar).
    function ajustarHitbox(escalaAtual, forcarEstreita = false) {
        if (opcoes.hitboxEstreita || forcarEstreita) {
            const forma = formaHitboxEstreita(escalaAtual);
            if (forma) { player.area.shape = forma; return; }
        }
        if (!opcoes.hitboxEstreita) player.area.shape = null; // volta para a caixa padrão do sprite
    }

    player.onAnimEnd((anim) => {
        if (anim === "ataque" || anim === "ataque_baixo" || anim === "conjurar") {
            player.isAttacking = false;
            player.conjurando = false;
            
            // Verifica se o jogador deveria continuar voando
            if (player.isFlying) {
                player.use(sprite("player_voando")); 
                player.play("voar");
                player.scale = vec2(0.44); 
                ajustarHitbox(0.44);
            } else {
                player.use(sprite("player")); 
                player.play("idle");
                player.scale = vec2(0.35); 
                ajustarHitbox(0.35);
            }
            
            player.flipX = direcaoAoAtacar; 
        }
    });

    return player;
}
