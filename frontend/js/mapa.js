// mapa.js
// Carrega um mapa do Tiled (.tmj) e cria no Kaboom: tiles, colisões e spawns.
// Quem decide COMO o mapa é lido é o campo "tipo" do level (ver levels.js).

import { ITENS } from "./itens.js";

const TAM_CHUNK_PX = 1024; // lado dos "pedaços" em que o visual é desenhado (o atlas do Kaboom aceita até 2048)

// Bits de espelhamento que o Tiled guarda nos bits altos do ID do tile
const FLAG_H = 0x80000000;
const FLAG_V = 0x40000000;
const FLAG_D = 0x20000000;
const MASCARA_GID = 0x1FFFFFFF;

// Cache por level: o visual (canvas -> sprites) e a colisão só são montados uma vez,
// mesmo que a cena seja recriada (morte, voltar ao menu...). Sprites do Kaboom são globais.
const cachePreparado = new Map();

// ---------------------------------------------------------------------------
// Funções puras (fáceis de testar)
// ---------------------------------------------------------------------------

export function decodificarGid(gidBruto) {
    return {
        gid: gidBruto & MASCARA_GID,
        h: (gidBruto & FLAG_H) !== 0,
        v: (gidBruto & FLAG_V) !== 0,
        d: (gidBruto & FLAG_D) !== 0,
    };
}

// Junta tiles sólidos vizinhos em retângulos grandes (unidades de tile).
// Ex.: um chão de 1000x2 tiles vira UM retângulo em vez de 2000 objetos.
export function mesclarSolidos(dados, largura, altura) {
    const retangulos = [];
    let abertos = new Map(); // "x0:x1" -> retângulo que continua na linha de baixo

    for (let y = 0; y < altura; y++) {
        const novos = new Map();
        let x = 0;
        while (x < largura) {
            if (!dados[y * largura + x]) { x++; continue; }
            const x0 = x;
            while (x < largura && dados[y * largura + x]) x++;

            const chave = x0 + ":" + x;
            const existente = abertos.get(chave);
            if (existente) {
                existente.h++;
                novos.set(chave, existente);
            } else {
                const r = { x: x0, y, w: x - x0, h: 1 };
                retangulos.push(r);
                novos.set(chave, r);
            }
        }
        abertos = novos;
    }
    return retangulos;
}

// Simplifica uma linha quebrada (Douglas-Peucker): remove pontos que desviam menos que "tol" px da reta
function simplificarLinha(pts, tol) {
    if (pts.length < 3) return pts;
    const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let maior = 0, idx = 0;
    for (let k = 1; k < pts.length - 1; k++) {
        const d = Math.abs(dy * (pts[k][0] - x1) - dx * (pts[k][1] - y1)) / len;
        if (d > maior) { maior = d; idx = k; }
    }
    if (maior <= tol) return [pts[0], pts[pts.length - 1]];
    const esq = simplificarLinha(pts.slice(0, idx + 1), tol);
    const dir = simplificarLinha(pts.slice(idx), tol);
    return esq.slice(0, -1).concat(dir);
}

// Acha "escadas" na colisão (colunas vizinhas cujo topo difere por no máximo maxDegrauPx) e as troca
// por rampas suaves. Devolve polígonos (em px, y SEM o ajuste de altura) e a máscara de sólidos
// restante (sem as colunas que viraram rampa), que continua indo para mesclarSolidos().
export function extrairRampas(solidos, largura, altura, tileW, tileH, maxDegrauPx = 16) {
    const maxDegrau = Math.max(1, Math.floor(maxDegrauPx / tileH)); // em linhas de tile

    // topo e fim (exclusivo) da primeira sequência sólida de cada coluna
    const topo = new Array(largura).fill(-1);
    const fim = new Array(largura).fill(-1);
    for (let c = 0; c < largura; c++) {
        let y = 0;
        while (y < altura && !solidos[y * largura + c]) y++;
        if (y >= altura) continue;
        topo[c] = y;
        let f = y;
        while (f < altura && solidos[f * largura + c]) f++;
        fim[c] = f;
    }

    // colunas dos dois lados de cada degrau (diferença de 1..maxDegrau tiles)
    const marcada = new Array(largura).fill(false);
    for (let c = 1; c < largura; c++) {
        if (topo[c] < 0 || topo[c - 1] < 0) continue;
        const d = Math.abs(topo[c] - topo[c - 1]);
        if (d > 0 && d <= maxDegrau) { marcada[c] = true; marcada[c - 1] = true; }
    }

    const restante = Uint8Array.from(solidos);
    const poligonos = [];

    for (let c = 0; c < largura;) {
        if (!marcada[c]) { c++; continue; }
        const a = c;
        while (c < largura && marcada[c]) c++;
        const b = c - 1; // região de colunas [a, b]

        // vértices: início e fim de cada "patamar" (colunas seguidas com o mesmo topo)
        const pontos = [];
        for (let i = a; i <= b;) {
            let j = i;
            while (j + 1 <= b && topo[j + 1] === topo[i]) j++;
            const y = topo[i] * tileH;
            const xe = i * tileW, xd = (j + 1) * tileW, meio = (xe + xd) / 2;
            const ini = i === a ? xe : Math.min(xe + tileW / 2, meio);
            const fimX = j === b ? xd : Math.max(xd - tileW / 2, meio);
            pontos.push([ini, y]);
            if (fimX > ini) pontos.push([fimX, y]);
            i = j + 1;
        }
        const linha = simplificarLinha(pontos, tileH / 2);

        // cada trecho da linha vira um trapézio convexo (superfície inclinada + laterais verticais)
        for (let k = 0; k < linha.length - 1; k++) {
            const [xa, ya] = linha[k], [xb, yb] = linha[k + 1];
            if (xb - xa < 1) continue;
            const colA = Math.max(a, Math.floor(xa / tileW));
            const colB = Math.min(b, Math.ceil(xb / tileW) - 1);
            let fundo = Math.max(ya, yb) + 2 * tileH;
            for (let cc = colA; cc <= colB; cc++) if (fim[cc] > 0) fundo = Math.max(fundo, fim[cc] * tileH);
            const yMin = Math.min(ya, yb);
            poligonos.push({
                x: xa,
                y: yMin,
                pts: [[0, ya - yMin], [xb - xa, yb - yMin], [xb - xa, fundo - yMin], [0, fundo - yMin]],
            });
        }

        // tira da máscara os tiles dessas colunas (a rampa assume o lugar deles)
        for (let cc = a; cc <= b; cc++) {
            for (let y = topo[cc]; y < fim[cc]; y++) restante[y * largura + cc] = 0;
        }
    }

    return { poligonos, restante };
}

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

export async function carregarMapa(level) {
    const resposta = await fetch(level.arquivo);
    if (!resposta.ok) throw new Error(`Não encontrei o mapa: ${level.arquivo}`);
    const json = await resposta.json();

    if (json.infinite) {
        throw new Error(`${level.arquivo}: mapas "infinitos" não são suportados. No Tiled: Mapa > Propriedades do Mapa > desmarque "Infinito".`);
    }

    const escala = level.escala ?? 1;
    const larguraTotalMapa = json.width * json.tilewidth * escala;
    const alturaTotalMapa = json.height * json.tileheight * escala;

    if (level.tipo === "tileset") {
        await construirTileset(json, level, escala);
    } else {
        throw new Error(`Tipo de level desconhecido em levels.js: "${level.tipo}"`);
    }

    return {
        larguraTotalMapa,
        alturaTotalMapa,
        ...lerObjetos(json, level, escala),
    };
}

// ---------------------------------------------------------------------------
// Spawns (objetos do Tiled) - igual para todos os tipos de level
// ---------------------------------------------------------------------------

function lerObjetos(json, level, escala) {
    let spawnPlayer = { x: 150, y: 100 };
    const spawnsEsqueletos = [];
    const spawnsLobos = [];
    const spawnsGuardioes = [];
    const itens = [];      // itens coletáveis: um para cada ponto com o nome de um item de itens.js
    let fimLevel = null;   // retângulo da saída da fase (objeto "fim-level")
    let spawnLich = null;
    let zonaCorvoSpawn = null; // retângulo (folhas da árvore onde os corvos nascem)
    let zonaCorvoFim = null;   // retângulo (folhas da árvore onde os corvos somem)
    const retangulo = (obj) => ({ x: obj.x * escala, y: obj.y * escala, w: obj.width * escala, h: obj.height * escala });

    json.layers
        .filter(l => l.type === "objectgroup")
        .forEach(camada => {
            (camada.objects || []).forEach(obj => {
                const p = { x: obj.x * escala, y: obj.y * escala };
                if (obj.name === "player-spawn") spawnPlayer = p;
                else if (obj.name === "esqueleto-spawn") spawnsEsqueletos.push(p);
                else if (obj.name === "lobo-spawn") spawnsLobos.push(p);
                else if (obj.name === "lich-spawn") spawnLich = p;
                else if (obj.name === "guardiao-spawn") spawnsGuardioes.push(p);
                else if (obj.name === "fim-level") fimLevel = retangulo(obj);
                else if (ITENS[obj.name]) itens.push({ id: obj.name, ...p });
                else if (obj.name === "corvo-spawn") zonaCorvoSpawn = retangulo(obj);
                else if (obj.name === "corvo-fim") zonaCorvoFim = retangulo(obj);
            });
        });

    // Mantém o comportamento antigo: se o level pede, coloca um esqueleto padrão
    if (spawnsEsqueletos.length === 0 && level.esqueletoPadrao) {
        spawnsEsqueletos.push({ ...level.esqueletoPadrao });
    }

    // Corvos só existem se o mapa tiver as DUAS zonas (retângulos no Tiled): "corvo-spawn" e "corvo-fim"
    if (!!zonaCorvoSpawn !== !!zonaCorvoFim) {
        console.warn(`[${level.id}] falta a zona "${zonaCorvoSpawn ? "corvo-fim" : "corvo-spawn"}": os corvos não vão aparecer.`);
    }
    const zonasCorvo = (zonaCorvoSpawn && zonaCorvoFim) ? { spawn: zonaCorvoSpawn, fim: zonaCorvoFim } : null;

    return { spawnPlayer, spawnsLobos, spawnsEsqueletos, spawnsGuardioes, spawnLich, zonasCorvo, itens, fimLevel };
}

// ---------------------------------------------------------------------------
// Tipo "tileset" (floresta e caverna): spritesheet + camada de colisão separada
// ---------------------------------------------------------------------------

async function construirTileset(json, level, escala) {
    let preparado = cachePreparado.get(level.id);
    if (!preparado) {
        preparado = await prepararTileset(json, level);
        cachePreparado.set(level.id, preparado);
    }

    // Visual: pedaços de imagem já desenhados
    preparado.chunks.forEach(c => {
        add([
            sprite(c.nome),
            pos(c.x * escala, c.y * escala),
            scale(escala),
            z(-50),
        ]);
    });

    // Colisão: retângulos invisíveis com a tag "ground" (que os esqueletos e o Lich já usam)
    const tileW = json.tilewidth * escala;
    const tileH = json.tileheight * escala;
    const ajusteY = (level.solidoOffsetY ?? 0) * escala; // desce a colisão (ver levels.js)
    preparado.retangulos.forEach(r => {
        add([
            rect(r.w * tileW, r.h * tileH),
            pos(r.x * tileW, r.y * tileH + ajusteY),
            area(),
            body({ isStatic: true }),
            opacity(0),
            "ground",
        ]);
    });

    // Rampas: superfícies inclinadas de verdade (polígonos estáticos), também com a tag "ground"
    preparado.poligonos.forEach(p => {
        add([
            pos(p.x * escala, p.y * escala + ajusteY),
            area({ shape: new Polygon(p.pts.map(([x, y]) => vec2(x * escala, y * escala))) }),
            body({ isStatic: true }),
            "ground",
        ]);
    });
}

async function prepararTileset(json, level) {
    const tileW = json.tilewidth;
    const tileH = json.tileheight;
    const larguraPx = json.width * tileW;
    const alturaPx = json.height * tileH;
    const camadasSolidas = level.camadasSolidas || [];

    // --- tilesets (maior firstgid primeiro, para achar o dono de um ID) ---
    const base = level.arquivo.substring(0, level.arquivo.lastIndexOf("/") + 1);
    const imagens = new Map();
    const tilesets = [];
    for (const ts of json.tilesets) {
        if (!ts.image) {
            throw new Error(`${level.arquivo}: o tileset "${ts.name}" é externo. No Tiled, use "Incorporar Tileset" para ele ficar dentro do .tmj.`);
        }
        const caminho = base + ts.image;
        if (!imagens.has(caminho)) imagens.set(caminho, await carregarImagem(caminho));
        tilesets.push({
            firstgid: ts.firstgid,
            colunas: ts.columns,
            tw: ts.tilewidth,
            th: ts.tileheight,
            margem: ts.margin || 0,
            espaco: ts.spacing || 0,
            img: imagens.get(caminho),
        });
    }
    tilesets.sort((a, b) => b.firstgid - a.firstgid);
    const acharTileset = gid => tilesets.find(t => t.firstgid <= gid);

    // --- visual: desenha as camadas em canvases de TAM_CHUNK_PX ---
    const canvases = new Map(); // "cx,cy" -> { canvas, ctx, cx, cy }
    function pegarChunk(cx, cy) {
        const chave = cx + "," + cy;
        let c = canvases.get(chave);
        if (!c) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(TAM_CHUNK_PX, larguraPx - cx * TAM_CHUNK_PX);
            canvas.height = Math.min(TAM_CHUNK_PX, alturaPx - cy * TAM_CHUNK_PX);
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;
            c = { canvas, ctx, cx, cy };
            canvases.set(chave, c);
        }
        return c;
    }

    const camadasVisuais = json.layers.filter(l =>
        l.type === "tilelayer" && l.visible !== false && !camadasSolidas.includes(l.name)
    );

    camadasVisuais.forEach(layer => {
        layer.data.forEach((gidBruto, index) => {
            if (gidBruto === 0) return;
            const { gid, h, v, d } = decodificarGid(gidBruto);
            const ts = acharTileset(gid);
            if (!ts) return;

            const local = gid - ts.firstgid;
            const sx = ts.margem + (local % ts.colunas) * (ts.tw + ts.espaco);
            const sy = ts.margem + Math.floor(local / ts.colunas) * (ts.th + ts.espaco);

            // O Tiled ancora tiles maiores que a grade no canto inferior esquerdo da célula
            const dx = (index % json.width) * tileW;
            const dy = (Math.floor(index / json.width) + 1) * tileH - ts.th;

            // Um tile grande pode atravessar a divisa de dois chunks: desenha em todos que ele toca
            const cx0 = Math.max(0, Math.floor(dx / TAM_CHUNK_PX));
            const cx1 = Math.floor((dx + ts.tw - 1) / TAM_CHUNK_PX);
            const cy0 = Math.max(0, Math.floor(dy / TAM_CHUNK_PX));
            const cy1 = Math.floor((dy + ts.th - 1) / TAM_CHUNK_PX);

            for (let cy = cy0; cy <= cy1; cy++) {
                for (let cx = cx0; cx <= cx1; cx++) {
                    const { ctx } = pegarChunk(cx, cy);
                    desenharTile(ctx, ts, sx, sy, dx - cx * TAM_CHUNK_PX, dy - cy * TAM_CHUNK_PX, h, v, d);
                }
            }
        });
    });

    // Registra cada chunk como sprite do Kaboom (só os que têm algo desenhado)
    const chunks = [];
    const carregando = [];
    canvases.forEach(({ canvas, cx, cy }) => {
        const nome = `mapa_${level.id}_${cx}_${cy}`;
        carregando.push(loadSprite(nome, canvas));
        chunks.push({ nome, x: cx * TAM_CHUNK_PX, y: cy * TAM_CHUNK_PX });
    });
    await Promise.all(carregando);

    // --- colisão: junta as camadas "solidas" numa máscara única ---
    let mascara = new Uint8Array(json.width * json.height);
    json.layers
        .filter(l => l.type === "tilelayer" && camadasSolidas.includes(l.name))
        .forEach(layer => layer.data.forEach((id, i) => { if (id) mascara[i] = 1; }));

    // escadas viram rampas suaves (precisa de Polygon no Kaboom; sem ele, ficam como escada)
    let poligonos = [];
    if (level.rampas && typeof Polygon === "function") {
        const r = extrairRampas(mascara, json.width, json.height, tileW, tileH, level.rampas.maxDegrau ?? 16);
        poligonos = r.poligonos;
        mascara = r.restante;
    }

    // o que sobrou vira retângulos grandes
    const retangulos = mesclarSolidos(mascara, json.width, json.height);

    if (camadasSolidas.length > 0 && retangulos.length === 0 && poligonos.length === 0) {
        console.warn(`[${level.id}] nenhuma camada de colisão encontrada (esperado: ${camadasSolidas.join(", ")}). O jogador vai cair no vazio!`);
    }

    return { chunks, retangulos, poligonos };
}

function desenharTile(ctx, ts, sx, sy, dx, dy, h, v, d) {
    if (!h && !v && !d) {
        ctx.drawImage(ts.img, sx, sy, ts.tw, ts.th, dx, dy, ts.tw, ts.th);
        return;
    }
    // Ordem do Tiled: diagonal, depois horizontal, depois vertical.
    // No canvas as transformações valem "de trás pra frente", por isso a ordem abaixo.
    ctx.save();
    ctx.translate(dx + ts.tw / 2, dy + ts.th / 2);
    if (v) ctx.scale(1, -1);
    if (h) ctx.scale(-1, 1);
    if (d) ctx.transform(0, 1, 1, 0, 0, 0);
    ctx.drawImage(ts.img, sx, sy, ts.tw, ts.th, -ts.tw / 2, -ts.th / 2, ts.tw, ts.th);
    ctx.restore();
}

function carregarImagem(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Não consegui carregar a imagem do tileset: ${src}`));
        img.src = src;
    });
}
