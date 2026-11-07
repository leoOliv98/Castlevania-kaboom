const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Permite que seu frontend (HTML) faça requisições para esta API

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'gamehost_db',
    password: 'deves2020',
    port: 5432,
});

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
// INICIA O SERVIDOR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});