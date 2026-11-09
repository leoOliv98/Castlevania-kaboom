const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares essenciais
app.use(express.json());
app.use(cors());

// ==========================================
// SERVE OS ARQUIVOS ESTÁTICOS ORGANIZADOS
// ==========================================
// Páginas e recursos do portal web (sem conflito de nomes com o jogo)
app.use(express.static(path.join(__dirname, 'web', 'pages')));
app.use('/css', express.static(path.join(__dirname, 'web', 'css')));
app.use('/js', express.static(path.join(__dirname, 'web', 'js')));
app.use('/web', express.static(path.join(__dirname, 'web')));

// Scripts e assets do jogo (Kaboom.js)
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// Rota raiz abre a tela de login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'pages', 'login.html'));
});

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1', // (Lembre-se de mudar para 'db' caso rode via Docker Compose depois)
    database: 'gamehost_db',
    password: 'deves2020',
    port: 5432,
});

// Garante que as tabelas necessárias existam no banco
async function inicializarBanco() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                tempo_segundos INTEGER NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (error) {
        console.error('Aviso: Não foi possível verificar/criar tabelas no banco:', error.message);
    }
}
inicializarBanco();

// ==========================================
// ROTA DE CADASTRO (REGISTER)
// ==========================================
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validação básica de campos vazios
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    try {
        // 2. Verifica se o usuário ou e-mail já existe no banco
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            const existingUser = userExists.rows[0];
            if (existingUser.username === username) {
                return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
            }
        }

        // 3. Criptografa a senha antes de salvar no banco
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 4. Salva o novo usuário no banco
        await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
            [username, email, passwordHash]
        );

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// ==========================================
// ROTA DE LOGIN (LOGIN)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        // 1. Verifica se o usuário existe no banco
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const user = result.rows[0];

        // 2. Compara a senha digitada com o hash salvo no banco
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        // 3. Login bem sucedido
        res.status(200).json({
            message: 'Login realizado com sucesso!',
            username: user.username
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
}); 

// ==========================================
// ROTAS DE PONTUAÇÃO E HISTÓRICO (SCORES)
// ==========================================

// Salva o resultado da partida enviado pelo Kaboom.js
app.post('/api/score', async (req, res) => {
    const { username, status, tempoSegundos } = req.body;

    if (!username || !status || tempoSegundos === undefined) {
        return res.status(400).json({ message: 'Dados incompletos para registrar o score.' });
    }

    try {
        await pool.query(
            'INSERT INTO scores (username, status, tempo_segundos) VALUES ($1, $2, $3)',
            [username, status, tempoSegundos]
        );
        res.status(201).json({ message: 'Pontuação registrada com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar score:', error);
        res.status(500).json({ message: 'Erro interno ao salvar pontuação.' });
    }
}); 
// Retorna as últimas 5 partidas de um usuário específico
app.get('/api/scores/user/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const result = await pool.query(
            `SELECT status, tempo_segundos, criado_em 
             FROM scores 
             WHERE username = $1 
             ORDER BY criado_em DESC 
             LIMIT 5`,
            [username]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar histórico do usuário:', error);
        res.status(500).json({ message: 'Erro interno ao buscar histórico pessoal.' });
    }
});

// Retorna os 10 melhores tempos (apenas vitórias, ordenados do menor para o maior tempo) para exibir no dashboard.html
app.get('/api/scores', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT username, status, tempo_segundos, criado_em
             FROM scores
             WHERE status = 'VITORIA'
             ORDER BY tempo_segundos ASC, criado_em ASC
             LIMIT 10`
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar scores:', error);
        res.status(500).json({ message: 'Erro interno ao buscar histórico.' });
    }
});

// ==========================================
// INICIA O SERVIDOR ÚNICO
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor único rodando em http://localhost:${PORT}`);
    });
}

module.exports = app;
