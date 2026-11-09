import { LEVEL_PADRAO } from "../levels.js";
import { rotulo, piscar, fundoTematico, brasas, filete, CORES, FONTE_TITULO, FONTE_TEXTO } from "../ui.js";

// Linha de controles: tecla em destaque + o que ela faz
function linhaControle(x, y, tecla, acao) {
    rotulo(tecla, { x, y, tam: 22, cor: CORES.ouro, ancora: "right" });
    rotulo(acao, { x: x + 14, y, tam: 20, cor: CORES.pergaminho, ancora: "left" });
}

export function cenaMenu() {
    fundoTematico("background_fase2", 0.6);
    brasas(40);

    const cx = center().x;

    // Título
    rotulo("DEVES", { x: cx, y: 120, tam: 88, cor: CORES.ouro, fonte: FONTE_TITULO, sombraPx: 6 });
    filete(cx, 190, 520);
    rotulo("O Despertar do Mago", { x: cx, y: 228, tam: 34, cor: CORES.pergaminho, fonte: FONTE_TEXTO });

    // Chamada para jogar
    const iniciar = rotulo("Pressione ENTER para começar", { x: cx, y: 318, tam: 30, cor: [255, 255, 255] });
    piscar(iniciar, 0.25, 1, 3);

    // Painel de controles
    add([ rect(700, 178), pos(cx, 450), anchor("center"), color(8, 4, 6), opacity(0.72), z(0) ]);
    add([ rect(700, 178), pos(cx, 450), anchor("center"), outline(2, rgb(...CORES.brasa)), opacity(0), z(1) ]);
    rotulo("CONTROLES", { x: cx, y: 383, tam: 22, cor: CORES.brasa, fonte: FONTE_TITULO });

    linhaControle(440, 418, "SETAS", "Mover e pular");
    linhaControle(440, 450, "Z", "Atacar com a espada");
    linhaControle(440, 482, "Z + BAIXO", "Golpe para baixo");
    linhaControle(800, 418, "X", "Bola de fogo");
    linhaControle(800, 450, "A", "Trocar de item");
    linhaControle(800, 482, "S", "Usar o item");
    rotulo("ESC pausa o jogo", { x: cx, y: 508, tam: 16, cor: CORES.cinza });

    // Permite digitar "godmod" já na tela do menu para começar o jogo com imortalidade e asas infinitas
    let bufferGodmodMenu = "";
    let avisoGodmodMenu = null;
    if (window.godmodAtivo) {
        avisoGodmodMenu = rotulo("GODMOD ATIVO (Imortal + Asas Infinitas)", { x: cx, y: 272, tam: 20, cor: CORES.ouro });
    }
    onCharInput((ch) => {
        bufferGodmodMenu = (bufferGodmodMenu + ch.toLowerCase()).slice(-6);
        if (bufferGodmodMenu === "godmod" && !window.godmodAtivo) {
            window.godmodAtivo = true;
            if (!avisoGodmodMenu) {
                avisoGodmodMenu = rotulo("GODMOD ATIVO (Imortal + Asas Infinitas)", { x: cx, y: 272, tam: 20, cor: CORES.ouro });
            }
        }
    });

    // A fase é sempre a primeira: não há seleção de level
    const comecar = () => go("game", { lives: 3, level: LEVEL_PADRAO });
    onKeyPress("enter", comecar);
    onKeyPress("space", comecar);
}

function formatarTempo(totalSegundos = 0) {
    const min = Math.floor(totalSegundos / 60);
    const seg = Math.floor(totalSegundos % 60);
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

export function cenaMorte(data) {
    fundoTematico(null);
    add([ rect(width(), height()), color(90, 0, 0), opacity(0.28), z(-97) ]);
    brasas(16, [200, 40, 30]);

    const cx = center().x;
    rotulo("VOCÊ MORREU", { x: cx, y: center().y - 60, tam: 80, cor: CORES.sangue, fonte: FONTE_TITULO, sombraPx: 5 });
    filete(cx, center().y - 5, 380, CORES.sangue);
    rotulo(`Vidas restantes: ${data.lives}`, { x: cx, y: center().y + 35, tam: 30, cor: CORES.pergaminho });
    if (data.tempo !== undefined) {
        rotulo(`Tempo registrado: ${formatarTempo(data.tempo)}`, { x: cx, y: center().y + 75, tam: 24, cor: CORES.ouro });
    }
    if (data.lives > 0) {
        const t = rotulo("Levante-se, mago...", { x: cx, y: center().y + 120, tam: 22, cor: CORES.cinza });
        piscar(t, 0.3, 1, 2);
    }

    wait(2, () => {
        // Volta para a MESMA fase em que o jogador morreu
        if (data.lives > 0) go("game", { lives: data.lives, level: data.level, tempo: data.tempo });
        else go("gameover", { tempo: data.tempo });
    });
}

export function cenaVitoria(data = {}) {
    fundoTematico("background_fase2", 0.7);
    brasas(46, CORES.ouro);

    const cx = center().x;
    rotulo("VITÓRIA!", { x: cx, y: 135, tam: 96, cor: CORES.ouro, fonte: FONTE_TITULO, sombraPx: 6 });
    filete(cx, 210, 480);
    rotulo("O Lich foi derrotado e a caverna está em paz.", { x: cx, y: 255, tam: 28, cor: [255, 255, 255] });
    if (data.lives !== undefined) {
        rotulo(`Vidas restantes: ${data.lives}`, { x: cx, y: 310, tam: 24, cor: CORES.pergaminho });
    }
    if (data.tempo !== undefined) {
        rotulo(`Tempo registrado: ${formatarTempo(data.tempo)}`, { x: cx, y: 355, tam: 28, cor: CORES.ouro });
    }
    rotulo("Obrigado por jogar!", { x: cx, y: 415, tam: 26, cor: CORES.brasa, fonte: FONTE_TITULO });

    const dica = rotulo("Pressione ENTER para voltar ao menu", { x: cx, y: 500, tam: 22, cor: CORES.cinza });
    piscar(dica, 0.3, 1, 3);

    const voltar = () => go("menu");
    onKeyPress("enter", voltar);
    onKeyPress("space", voltar);
    onKeyPress("escape", voltar);
    wait(12, voltar);   // se ninguém apertar nada, volta sozinho
}

export function cenaGameOver(data = {}) {
    fundoTematico(null);
    add([ rect(width(), height()), color(70, 0, 0), opacity(0.3), z(-97) ]);
    brasas(14, [160, 30, 30]);

    const cx = center().x;
    rotulo("GAME OVER", { x: cx, y: center().y - 80, tam: 96, cor: [170, 20, 20], fonte: FONTE_TITULO, sombraPx: 6 });
    filete(cx, center().y - 15, 420, CORES.sangue);
    rotulo("A escuridão venceu desta vez...", { x: cx, y: center().y + 30, tam: 26, cor: CORES.pergaminho });
    if (data.tempo !== undefined) {
        rotulo(`Tempo registrado: ${formatarTempo(data.tempo)}`, { x: cx, y: center().y + 75, tam: 24, cor: CORES.ouro });
    }

    const dica = rotulo("Pressione ENTER para voltar ao menu", { x: cx, y: center().y + 130, tam: 22, cor: CORES.cinza });
    piscar(dica, 0.3, 1, 4);

    onKeyPress("enter", () => go("menu"));
    onKeyPress("space", () => go("menu"));
    onKeyPress("escape", () => go("menu"));
}
