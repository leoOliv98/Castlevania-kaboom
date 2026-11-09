// database/models/User.js
// Modelo ORM da tabela "users"

const { DataTypes } = require('../orm');

function defineUserModel(orm) {
    return orm.define('User', 'users', {
        id: {
            type: DataTypes.SERIAL,
            primaryKey: true,
            autoIncrement: true,
        },
        username: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(100),
            unique: true,
            allowNull: false,
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        password_plain: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        created_at: {
            type: DataTypes.TIMESTAMP,
            defaultValue: 'NOW',
        },
    });
}

module.exports = defineUserModel;
