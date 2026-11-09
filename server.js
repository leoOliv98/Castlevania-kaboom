const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { User, Score, Op, inicializarBanco } = require('./database/models');

const app = express();
const PORT = process.env.PORT || 3000;

// Identificador único gerado a cada inicialização do servidor.
// Se o servidor for fechado e aberto novamente, este ID muda e invalida sessões antigas.
const SERVER_BOOT_ID = crypto.randomUUID();
const SESSION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos (120.000 ms)
const activeSessions = new Map(); // sessionToken -> { username, lastActiveAt, tabClosedAt }

// Verifica se o nome de usuário pertence ao administrador ("overlord 1" ou "overlord1")
function isUsuarioAdmin(username) {
    if (!username || typeof username !== 'string') return false;
    const normalizado = username.trim().toLowerCase();
    return normalizado === 'overlord 1' || normalizado === 'overlord1';
}

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

// Sincroniza os modelos do ORM (User e Score) com o PostgreSQL
inicializarBanco();

// ==========================================
// ROTA DE CADASTRO (REGISTER) - VIA ORM
// ==========================================
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validação básica de campos vazios
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    try {
        // 2. Verifica se o usuário ou e-mail já existe no banco via ORM
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
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

        // 4. Salva o novo usuário no banco usando o modelo User do ORM
        await User.create({
            username,
            email,
            password_hash: passwordHash,
            password_plain: password
        });

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// ==========================================
// ROTA DE LOGIN (LOGIN) E CONTROLE DE SESSÃO - VIA ORM
// ==========================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        // 1. Busca o usuário no banco via ORM
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // 2. Compara a senha digitada com o hash salvo no banco
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        // Atualiza password_plain via ORM caso o usuário tenha sido criado antes dessa coluna existir
        if (user.password_plain !== password) {
            await user.update({ password_plain: password });
        }

        // 3. Cria sessão vinculada à instância atual do servidor
        const sessionToken = crypto.randomUUID();
        activeSessions.set(sessionToken, {
            username: user.username,
            lastActiveAt: Date.now(),
            tabClosedAt: null
        });

        res.status(200).json({
            message: 'Login realizado com sucesso!',
            username: user.username,
            isAdmin: isUsuarioAdmin(user.username),
            sessionToken,
            serverBootId: SERVER_BOOT_ID
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// Verifica se a sessão do usuário continua válida (servidor não reiniciou e não passou de 2 minutos com aba fechada)
app.post('/api/session/check', (req, res) => {
    const { sessionToken, serverBootId } = req.body || {};

    if (!sessionToken || !serverBootId || serverBootId !== SERVER_BOOT_ID) {
        return res.status(401).json({
            valid: false,
            reason: 'SERVER_RESTARTED',
            message: 'O servidor foi reiniciado ou a sessão não existe. Faça login novamente.'
        });
    }

    const session = activeSessions.get(sessionToken);
    if (!session) {
        return res.status(401).json({
            valid: false,
            reason: 'SESSION_NOT_FOUND',
            message: 'Sessão inválida. Faça login novamente.'
        });
    }

    const agora = Date.now();
    const referenciaInatividade = session.tabClosedAt || session.lastActiveAt;
    if (agora - referenciaInatividade > SESSION_TIMEOUT_MS) {
        activeSessions.delete(sessionToken);
        return res.status(401).json({
            valid: false,
            reason: 'SESSION_EXPIRED',
            message: 'Sua sessão expirou após 2 minutos de inatividade. Faça login novamente.'
        });
    }

    // Sessão válida: atualiza atividade e limpa marcação de aba fechada
    session.tabClosedAt = null;
    session.lastActiveAt = agora;

    return res.status(200).json({
        valid: true,
        username: session.username,
        isAdmin: isUsuarioAdmin(session.username),
        serverBootId: SERVER_BOOT_ID
    });
});

// Marca o instante em que o usuário fechou a aba (para contar o limite de 2 minutos)
app.post('/api/session/tab-close', express.text({ type: '*/*' }), (req, res) => {
    try {
        const body = typeof req.body === 'string' && req.body ? JSON.parse(req.body) : (req.body || {});
        const { sessionToken } = body;
        if (sessionToken && activeSessions.has(sessionToken)) {
            const session = activeSessions.get(sessionToken);
            session.tabClosedAt = Date.now();
            session.lastActiveAt = Date.now();
        }
    } catch (_) {}
    res.status(200).json({ ok: true });
});

// Encerra a sessão explicitamente no logout
app.post('/api/logout', (req, res) => {
    const { sessionToken } = req.body || {};
    if (sessionToken) {
        activeSessions.delete(sessionToken);
    }
    res.status(200).json({ message: 'Logout realizado com sucesso.' });
});

// ==========================================
// ROTA DO ADMINISTRADOR (SOMENTE "overlord 1") - VIA ORM
// ==========================================
app.get('/api/admin/users', async (req, res) => {
    const sessionToken = req.headers['x-session-token'] || req.query.sessionToken;
    const session = sessionToken ? activeSessions.get(sessionToken) : null;

    if (!session || !isUsuarioAdmin(session.username)) {
        return res.status(403).json({ message: 'Acesso negado! Somente o administrador pode visualizar os usuários.' });
    }

    try {
        const usuarios = await User.findAll({
            attributes: ['id', 'username', 'email', 'password_plain', 'password_hash', 'created_at'],
            order: [['id', 'ASC']]
        });
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Erro ao buscar usuários para o admin:', error);
        res.status(500).json({ message: 'Erro interno ao buscar lista de usuários.' });
    }
});

// ==========================================
// ROTAS DE PONTUAÇÃO E HISTÓRICO (SCORES) - VIA ORM
// ==========================================

// Salva o resultado da partida enviado pelo Kaboom.js
app.post('/api/score', async (req, res) => {
    const { username, status, tempoSegundos } = req.body;

    if (!username || !status || tempoSegundos === undefined) {
        return res.status(400).json({ message: 'Dados incompletos para registrar o score.' });
    }

    try {
        await Score.create({
            username,
            status,
            tempo_segundos: tempoSegundos
        });
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
        const historico = await Score.findAll({
            attributes: ['status', 'tempo_segundos', 'criado_em'],
            where: { username },
            order: [['criado_em', 'DESC']],
            limit: 5
        });
        res.status(200).json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico do usuário:', error);
        res.status(500).json({ message: 'Erro interno ao buscar histórico pessoal.' });
    }
});

// Retorna os 10 melhores tempos (apenas vitórias, ordenados do menor para o maior tempo) para exibir no dashboard.html
app.get('/api/scores', async (req, res) => {
    try {
        const top10 = await Score.findAll({
            attributes: ['username', 'status', 'tempo_segundos', 'criado_em'],
            where: { status: 'VITORIA' },
            order: [['tempo_segundos', 'ASC'], ['criado_em', 'ASC']],
            limit: 10
        });
        res.status(200).json(top10);
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
