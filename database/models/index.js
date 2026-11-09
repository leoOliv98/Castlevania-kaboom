// database/models/index.js
// Inicializa a conexão com o PostgreSQL, instancia o ORM e registra os modelos User e Score

const { Pool } = require('pg');
const { ORM, Op } = require('../orm');
const defineUserModel = require('./User');
const defineScoreModel = require('./Score');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'gamehost_db',
    password: process.env.DB_PASSWORD || 'deves2020',
    port: Number(process.env.DB_PORT) || 5432,
});

const orm = new ORM(pool);

const User = defineUserModel(orm);
const Score = defineScoreModel(orm);

// Relacionamento entre Usuário e Pontuações (1:N)
User.hasMany(Score, { foreignKey: 'username', sourceKey: 'username' });
Score.belongsTo(User, { foreignKey: 'username', targetKey: 'username' });

async function inicializarBanco() {
    try {
        await orm.sync();
        console.log('📦 ORM sincronizado com sucesso (tabelas users e scores prontas).');
    } catch (error) {
        console.error('Aviso: Não foi possível sincronizar o ORM com o banco:', error.message);
    }
}

module.exports = {
    pool,
    orm,
    Op,
    User,
    Score,
    inicializarBanco,
};
