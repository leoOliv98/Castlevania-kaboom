export function cenaMenu() {
    add([ rect(width(), height()), color(10, 10, 20), pos(0, 0) ]);
    add([ text("SUPER MAILSON", { size: 64, font: "sans-serif" }), pos(center().x, center().y - 80), anchor("center"), color(200, 30, 30) ]);
    add([ text("O Despertar do Mago", { size: 32, font: "sans-serif" }), pos(center().x, center().y - 20), anchor("center"), color(255, 255, 255) ]);

    const startText = add([ text("Pressione ENTER para Jogar", { size: 24 }), pos(center().x, center().y + 80), anchor("center"), color(150, 150, 150) ]);
    startText.onUpdate(() => { startText.opacity = wave(0.2, 1, time() * 3); });

    onKeyPress("enter", () => go("game", { lives: 3 }));
    onKeyPress("space", () => go("game", { lives: 3 }));
}

export function cenaMorte(data) {
    add([ rect(width(), height()), color(0, 0, 0), pos(0, 0) ]);
    add([ text("VOCÊ MORREU!", { size: 48 }), pos(center().x, center().y - 30), anchor("center"), color(220, 20, 20) ]);
    add([ text(`Vidas restantes: ${data.lives}`, { size: 24 }), pos(center().x, center().y + 30), anchor("center"), color(255, 255, 255) ]);

    wait(2, () => {
        if (data.lives > 0) go("game", { lives: data.lives });
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