// ui.js
// Visual dos textos do jogo: fontes, sombra, textos flutuantes (dano, avisos) e pedaços reaproveitados nas telas.
// As fontes ficam em frontend/assets/fonts/ (as duas são livres, licença OFL, e vão com o jogo):
//   - FONTE_TITULO (Gloock):       títulos e nomes de chefe, serifa pesada e sombria
//   - FONTE_TEXTO  (Pixelify Sans): HUD, avisos e números de dano, combina com a pixel art

export const FONTE_TITULO = "titulo";
export const FONTE_TEXTO = "texto";

// Chamar uma vez no main.js, logo depois do kaboom()
export function carregarFontes() {
    loadFont(FONTE_TITULO, "frontend/assets/fonts/Gloock-Regular.ttf");
    loadFont(FONTE_TEXTO, "frontend/assets/fonts/PixelifySans-Medium.ttf");
}

// Paleta usada nas telas
export const CORES = {
    ouro: [255, 200, 90],
    brasa: [255, 140, 40],
    sangue: [200, 40, 40],
    pergaminho: [225, 205, 170],
    cinza: [150, 140, 135],
    sombra: [8, 4, 4],
};

const AUMENTO_TEXTO = 1.3;   // a fonte pixel é pequena: os "size" dos textos pequenos são multiplicados por isso

const rgbDe = (c) => Array.isArray(c) ? rgb(c[0], c[1], c[2]) : c;

// Texto com sombra. Devolve o texto principal; "obj.todos" tem [sombra, texto] (para ocultar/mostrar/piscar juntos).
// opcoes: x, y, tam, cor, fonte, fixo, z, ancora, duracao (some sozinho), sobe (px/s), sombraPx
export function rotulo(str, opcoes = {}) {
    const {
        x = 0, y = 0, tam = 16, cor = [255, 255, 255], fonte = FONTE_TEXTO,
        fixo = false, z: zBase = 0, ancora = "center", duracao = 0, sobe = 0,
        sombraPx = Math.max(2, Math.round(tam / 14)), largura, alinhar,
    } = opcoes;

    const base = (corTexto, dx, dy, zz, op) => {
        const comp = [
            text(str, { size: tam, font: fonte, ...(largura ? { width: largura } : {}), ...(alinhar ? { align: alinhar } : {}) }),
            pos(x + dx, y + dy),
            anchor(ancora),
            color(rgbDe(corTexto)),
            opacity(op),
            z(zz),
        ];
        if (fixo) comp.push(fixed());
        if (duracao > 0) comp.push(lifespan(duracao, { fade: duracao }));
        const obj = add(comp);
        if (sobe) obj.onUpdate(() => { obj.pos.y -= sobe * dt(); });
        return obj;
    };

    const sombra = base(CORES.sombra, sombraPx, sombraPx, zBase, 0.85);
    const principal = base(cor, 0, 0, zBase + 1, 1);
    principal.todos = [sombra, principal];
    principal.sombra = sombra;
    return principal;
}

// Texto que sobe e some: números de dano, "HIT!", "+40", avisos sobre a cabeça do jogador...
export function flutuar(str, x, y, cor = [255, 255, 0], tam = 14, duracao = 0.5) {
    return rotulo(str, {
        x, y, cor, tam: Math.round(tam * AUMENTO_TEXTO), duracao: Math.max(duracao, 0.5),
        sobe: 32, z: 50, fonte: FONTE_TEXTO,
    });
}

// Aviso grande no meio da tela (fixo), como "FASE CONCLUÍDA!"
export function avisoCentral(str, cor, tam = 36, y = null, duracao = 0) {
    return rotulo(str, {
        x: center().x, y: y ?? (center().y - 100), cor, tam, fonte: FONTE_TITULO,
        fixo: true, z: 900, duracao,
    });
}

// Faz um rótulo (e a sombra dele) piscar
export function piscar(obj, minimo = 0.3, maximo = 1, velocidade = 3) {
    obj.onUpdate(() => {
        const o = wave(minimo, maximo, time() * velocidade);
        obj.todos.forEach((t, i) => { t.opacity = i === 0 ? o * 0.85 : o; });
    });
}

// Fundo das telas: uma das imagens de fundo do jogo bem escurecida, com a borda mais escura ainda
export function fundoTematico(spriteFundo, escuridao = 0.62) {
    if (spriteFundo) {
        add([ sprite(spriteFundo), pos(0, 0), scale(width() / 1920), z(-100) ]);
    } else {
        add([ rect(width(), height()), color(8, 6, 10), z(-100) ]);
    }
    add([ rect(width(), height()), color(5, 3, 8), opacity(escuridao), z(-99) ]);
    // bordas escuras (vinheta simples)
    for (let i = 0; i < 6; i++) {
        const faixa = 18 + i * 22, op = 0.5 - i * 0.08;
        add([ rect(width(), faixa), pos(0, 0), color(0, 0, 0), opacity(op), z(-98) ]);
        add([ rect(width(), faixa), pos(0, height() - faixa), color(0, 0, 0), opacity(op), z(-98) ]);
    }
}

// Brasas subindo (fundo das telas). cor: [r, g, b]
export function brasas(quantidade = 36, cor = [255, 140, 40]) {
    for (let i = 0; i < quantidade; i++) {
        const tam = choose([2, 2, 3, 4]);
        const b = add([
            rect(tam, tam), pos(rand(0, width()), rand(0, height())), color(rgbDe(cor)), opacity(rand(0.3, 0.9)), z(-90),
            { vel: rand(14, 46), deriva: rand(-10, 10), fase: rand(0, 6.28) },
        ]);
        b.onUpdate(() => {
            b.pos.y -= b.vel * dt();
            b.pos.x += (b.deriva + Math.sin(time() * 1.5 + b.fase) * 8) * dt();
            if (b.pos.y < -10) { b.pos.y = height() + 10; b.pos.x = rand(0, width()); }
        });
    }
}

// Linha decorativa (separador de título)
export function filete(x, y, largura, cor = CORES.brasa) {
    add([ rect(largura, 3), pos(x, y), anchor("center"), color(rgbDe(cor)), opacity(0.85), z(1) ]);
    add([ rect(10, 10), pos(x, y), anchor("center"), rotate(45), color(rgbDe(cor)), z(2) ]);
}

// Barra de vida de chefe no topo da tela (a mesma para todos os chefes, só mudam o nome e as cores).
//   nome, corFundo (parte vazia), corBarra (vida), marcaEm (opcional: fração da vida onde fica um risco branco, ex.: 0.5)
// Devolve { mostrar(), esconder(), definir(fracao) }; começa escondida.
export function criarBarraChefe({ nome, corFundo, corBarra, marcaEm = null }) {
    const larg = 400, cx = width() / 2, esq = cx - larg / 2;
    const partes = [
        add([ rect(larg + 8, 24), pos(cx, 35), anchor("center"), color(0, 0, 0), opacity(0.7), fixed(), z(100) ]),
        add([ rect(larg, 16), pos(cx, 35), anchor("center"), color(rgbDe(corFundo)), fixed(), z(101) ]),
    ];
    const vida = add([ rect(larg, 16), pos(esq, 27), color(rgbDe(corBarra)), fixed(), z(102) ]);
    partes.push(vida);
    if (marcaEm !== null) partes.push(add([ rect(2, 16), pos(esq + larg * marcaEm - 1, 27), color(255, 255, 255), opacity(0.8), fixed(), z(103) ]));
    partes.push(add([ text(nome, { size: 20, font: FONTE_TITULO }), pos(cx, 13), anchor("center"), color(255, 255, 255), fixed(), z(103) ]));
    partes.forEach(p => { p.hidden = true; });
    return {
        mostrar() { partes.forEach(p => { p.hidden = false; }); },
        esconder() { partes.forEach(p => { p.hidden = true; }); },
        definir(fracao) { vida.width = Math.max(0, Math.min(1, fracao)) * larg; },
    };
}
