import { LEVELS, ORDEM_LEVELS, LEVEL_PADRAO } from "../levels.js";

export function cenaMenu() {
    add([ rect(width(), height()), color(10, 10, 20), pos(0, 0) ]);
    add([ text("SUPER MAILSON", { size: 64, font: "sans-serif" }), pos(center().x, center().y - 80), anchor("center"), color(200, 30, 30) ]);
    add([ text("O Despertar do Mago", { size: 32, font: "sans-serif" }), pos(center().x, center().y - 20), anchor("center"), color(255, 255, 255) ]);

    const startText = add([ text("Pressione ENTER para Jogar", { size: 24 }), pos(center().x, center().y + 80), anchor("center"), color(150, 150, 150) ]);
    startText.onUpdate(() => { startText.opacity = wave(0.2, 1, time() * 3); });

    // Seleção de fase: tecla 1, 2, 3... abre o level correspondente (ordem definida em levels.js)
    ORDEM_LEVELS.forEach((id, i) => {
        add([
            text(`[${i + 1}] ${LEVELS[id].nome}`, { size: 18 }),
            pos(center().x, center().y + 125 + i * 28),
            anchor("center"),
            color(120, 120, 140)
        ]);
        onKeyPress(String(i + 1), () => go("game", { lives: 3, level: id }));
    });

    onKeyPress("enter", () => go("game", { lives: 3, level: LEVEL_PADRAO }));
    onKeyPress("space", () => go("game", { lives: 3, level: LEVEL_PADRAO }));
}

export function cenaMorte(data) {
    add([ rect(width(), height()), color(0, 0, 0), pos(0, 0) ]);
    add([ text("VOCÊ MORREU!", { size: 48 }), pos(center().x, center().y - 30), anchor("center"), color(220, 20, 20) ]);
    add([ text(`Vidas restantes: ${data.lives}`, { size: 24 }), pos(center().x, center().y + 30), anchor("center"), color(255, 255, 255) ]);

    wait(2, () => {
        // Volta para a MESMA fase em que o jogador morreu
        if (data.lives > 0) go("game", { lives: data.lives, level: data.level });
        else go("gameover");
    });
}

export function cenaGameOver() {
    add([ rect(width(), height()), color(20, 5, 5), pos(0, 0) ]);
    add([ text("GAME OVER", { size: 64 }), pos(center().x, center().y - 40), anchor("center"), color(180, 0, 0) ]);

    const restartText = add([ text("Pressione ENTER para voltar ao Menu", { size: 22 }), pos(center().x, center().y + 40), anchor("center"), color(200, 200, 200) ]);
    restartText.onUpdate(() => { restartText.opacity = wave(0.3, 1, time() * 4); });

    onKeyPress("enter", () => go("menu"));
    onKeyPress("space", () => go("menu"));
    
    // Adiciona o atalho da tecla ESC para voltar ao menu
    onKeyPress("escape", () => go("menu"));
}