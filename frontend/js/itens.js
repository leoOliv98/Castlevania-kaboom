// itens.js
// Itens coletáveis do jogo. Para colocar um item num level: no Tiled, na camada de objetos, crie um objeto de PONTO
// com o nome do item (a chave da tabela abaixo: "pocao-vida", "pocao-mana", "asas", "chave"). O ponto é o CENTRO do item.
//
// Para criar um item novo: carregue o sprite no main.js, acrescente uma linha aqui e (se ele tiver um efeito)
// trate o "tipo" na tecla S do game.js.
//
//   nome   -> nome no inventário (não pode repetir: o inventário não guarda dois itens com o mesmo nome)
//   tipo   -> o que o item faz (usado no game.js)
//   sprite -> nome do sprite carregado no main.js
//   escala -> tamanho do sprite no mundo (e na caixinha do HUD, que usa 0.2)

export const ITENS = {
    "pocao-vida": { nome: "Poção",         tipo: "cura",  sprite: "pocao-vida", escala: 0.2 },
    "pocao-mana": { nome: "Poção de Mana", tipo: "mana",  sprite: "pocao-mana", escala: 0.2 },
    "asas":       { nome: "Asas",          tipo: "voo",   sprite: "asas",       escala: 0.2 },
    "chave":      { nome: "Chave",         tipo: "chave", sprite: "chave",      escala: 0.22 },
};
