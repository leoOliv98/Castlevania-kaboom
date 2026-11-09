// database/models/Score.js
// Modelo ORM da tabela "scores"

const { DataTypes } = require('../orm');

function defineScoreModel(orm) {
    return orm.define('Score', 'scores', {
        id: {
            type: DataTypes.SERIAL,
            primaryKey: true,
            autoIncrement: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        tempo_segundos: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        criado_em: {
            type: DataTypes.TIMESTAMP,
            defaultValue: 'NOW',
        },
    });
}

module.exports = defineScoreModel;
