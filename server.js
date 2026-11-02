const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Disponibiliza toda a pasta atual (incluindo 'frontend' e arquivos na raiz) para o navegador
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`Servidor rodando com sucesso! Acesse em: http://localhost:${PORT}`);
});