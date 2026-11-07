// inventario.js
const sistemaInventario = {
    itens: [],
    indiceSelecionado: 0,

    // Função para adicionar um item novo ao encostar nele
    adicionarItem(nome, tipo, spriteId) {
        const jaPossui = this.itens.find(i => i.nome === nome);
        
        if (!jaPossui) {
            this.itens.push({ nome: nome, tipo: tipo, spriteId: spriteId }); // Guarda o spriteId
            console.log(`Coletou: ${nome}`);
            return true;
        }
        return false;
    },

    // Pega as informações do item atualmente selecionado
    obterItemAtual() {
        if (this.itens.length === 0) return null;
        return this.itens[this.indiceSelecionado];
    },

    // Alterna para o próximo item
    avancarSelecao() {
        if (this.itens.length > 1) {
            this.indiceSelecionado = (this.indiceSelecionado + 1) % this.itens.length;
        }
    },

    // Remove o item após usar (ex: poção consumível)
    removerItemAtual() {
        this.itens.splice(this.indiceSelecionado, 1);
        this.indiceSelecionado = Math.max(0, this.indiceSelecionado - 1);
    }
};