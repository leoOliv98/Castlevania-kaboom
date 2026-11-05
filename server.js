const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Disponibiliza a raiz para o Express encontrar o index.html e a pasta frontend
app.use(express.static(path.join(__dirname)));

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

// Essencial para a Vercel processar as serverless functions
module.exports = app;