export function criarLich(spawnX, spawnY) {
    const lich = add([
        sprite("lich"),
        pos(spawnX, spawnY),
        area({ width: 40, height: 70, offset: vec2(0, 5) }),
        body({ gravityScale: 0 }),
        scale(0.45),
        anchor("center"),
        "boss", // Mantém a tag de boss
        { 
            speed: 50, 
            tempoAtaque: 0,
            hp: 30,       // Vida total do Lich (resiste a 6 golpes)
            maxHp: 30,
            isDead: false
        }
    ]);

    lich.onUpdate(() => {
        if (lich.isDead) return;

        const player = get("player")[0];
        if (!player) return;

        const dirX = player.pos.x > lich.pos.x ? 1 : -1;
        lich.flipX = dirX < 0;

        lich.pos.x += dirX * lich.speed * dt();
        
        const flutuacaoY = Math.sin(time() * 3) * 30;
        const targetY = player.pos.y - 80 + flutuacaoY;
        lich.pos.y += (targetY - lich.pos.y) * 2 * dt();

        lich.tempoAtaque += dt();
        if (lich.tempoAtaque >= 3) {
            lich.tempoAtaque = 0;
            atirarProjetil(lich.pos, dirX);
        }
    });

    function posicaoOrigemProj(lichPos, direcao) {
        return vec2(lichPos.x + (direcao * 30), lichPos.y);
    }

    function atirarProjetil(posicaoLich, direcao) {
        const proj = add([
            sprite("projetil-lich", { anim: "voo" }),
            pos(posicaoOrigemProj(posicaoLich, direcao)),
            area({ width: 30, height: 15 }),
            anchor("center"),
            scale(0.2),
            "projetilLich",
            { 
                dir: direcao, 
                velocidade: 250 
            }
        ]);

        proj.flipX = (direcao < 0);

        proj.onUpdate(() => {
            proj.pos.x += proj.dir * proj.velocidade * dt();
        });

        wait(4, () => {
            if (proj.exists()) destroy(proj);
        });
    }

    return lich;
}

export function criarExplosao(posicao) {
    add([
        sprite("explosao_lich", { anim: "explodir" }),
        pos(posicao),
        anchor("center"),
        scale(0.3), 
        lifespan(0.4) 
    ]);
}