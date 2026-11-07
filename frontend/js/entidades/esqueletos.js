import { BALANCEAMENTO } from "../balanceamento.js";

export function criarEsqueleto(spawnX, spawnY, larguraTotalMapa) {
    const enemy = add([
        sprite("esqueleto", { anim: "walk" }),
        pos(spawnX, spawnY),
        area({ width: 30, height: 50, offset: vec2(0, 5) }),
        body(),
        scale(0.4),
        anchor("center"),
        opacity(1), // permite piscar quando leva um golpe e sobrevive
        "enemy",
        { 
            dir: 1, 
            speed: 70, 
            isAttacking: false,
            isDead: false, // NOVO: Flag para controlar se está vivo ou em pilha de ossos
            hp: BALANCEAMENTO.vida.esqueleto,    // a espada tira 5 e a bola de fogo 3 (ver balanceamento.js)
            maxHp: BALANCEAMENTO.vida.esqueleto
        }
    ]);

    let ultimoPulo = 0;

    enemy.onUpdate(() => {
        // NOVO: Se estiver morto, cancela toda a inteligência (não anda, não ataca, não vira)
        if (enemy.isDead) return;

        if (enemy.isAttacking) return;

        const player = get("player")[0];
        
        if (player) {
            const distX = player.pos.x - enemy.pos.x;
            const distY = Math.abs(player.pos.y - enemy.pos.y);

            if (Math.abs(distX) < 60 && distY < 50) {
                enemy.isAttacking = true;
                
                enemy.dir = distX > 0 ? 1 : -1;
                enemy.flipX = enemy.dir < 0;

                const direcaoAtk = enemy.dir;

                enemy.use(sprite("esqueleto_ataque")); 
                enemy.play("ataque");
                enemy.flipX = (direcaoAtk < 0);

                wait(0.25, () => {
                    // Impede o ataque se o esqueleto foi destruído ou MORTO durante o aviso
                    if (!enemy.exists() || enemy.isDead) return;
                    
                    play("som_ataque_esqueleto", { volume: 0.6 });

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

        const velocidadeAtual = enemy.isGrounded() ? enemy.speed : enemy.speed * 2.5;
        enemy.move(velocidadeAtual * enemy.dir, 0);

        if (enemy.isGrounded() && (time() - ultimoPulo > 2.5)) {
            const aheadX = enemy.pos.x + (enemy.dir * 50);
            const aheadY = enemy.pos.y + 10; 

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

    enemy.onCollideUpdate("ground", (ground, col) => {
        // NOVO: Se estiver morto, ele não inverte a direção nem pula ao bater na parede
        if (enemy.isDead) return; 

        if ((col.isLeft() && enemy.dir === -1) || (col.isRight() && enemy.dir === 1)) {
            enemy.dir *= -1;
            enemy.flipX = (enemy.dir < 0);
            
            if (enemy.isGrounded() && (time() - ultimoPulo > 0.5)) {
                enemy.jump(900); 
                ultimoPulo = time();
            }
        }
    });

    enemy.onCollide("enemy", (outroInimigo, col) => {
        if (enemy.isDead) return; // Mortos não desviam

        if ((col.isLeft() && enemy.dir === -1) || (col.isRight() && enemy.dir === 1)) {
            enemy.dir *= -1;
            enemy.flipX = (enemy.dir < 0);
        }
    });

    enemy.onCollide("deathZone", () => {
        destroy(enemy); // A zona de morte ainda destrói permanentemente
    });

    enemy.onAnimEnd((anim) => {
        if (anim === "ataque" && !enemy.isDead) { // Só volta a andar se não morreu
            play("som_ataque_esqueleto", { volume: 0.6 });

            enemy.isAttacking = false;
            enemy.use(sprite("esqueleto"));
            enemy.play("walk");
        }
    });

    return enemy;
}