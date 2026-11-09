// database/orm.js
// Camada ORM (Object-Relational Mapping) sobre o driver PostgreSQL (pg).
// Mapeia classes/modelos JavaScript para tabelas relacionais, gerando SQL parametrizado ($1, $2...)
// com suporte a sync(), create(), findOne(), findAll(), update(), destroy() e operadores lógicos (Op.or).

const Op = {
    or: Symbol('Op.or'),
    and: Symbol('Op.and'),
};

const DataTypes = {
    SERIAL: 'SERIAL',
    INTEGER: 'INTEGER',
    STRING: (tamanho = 255) => `VARCHAR(${tamanho})`,
    TEXT: 'TEXT',
    TIMESTAMP: 'TIMESTAMP',
};

class ModelInstance {
    constructor(model, row) {
        Object.defineProperty(this, '_model', { value: model, enumerable: false });
        Object.assign(this, row);
    }

    async update(novosValores) {
        const pk = this._model.primaryKeyField;
        const atualizado = await this._model.update(novosValores, {
            where: { [pk]: this[pk] }
        });
        Object.assign(this, novosValores, atualizado[0] || {});
        return this;
    }

    toJSON() {
        const copia = {};
        for (const chave of Object.keys(this)) {
            copia[chave] = this[chave];
        }
        return copia;
    }
}

class Model {
    constructor(pool, tableName, attributes, options = {}) {
        this.pool = pool;
        this.tableName = tableName;
        this.attributes = attributes;
        this.options = options;
        this.primaryKeyField = Object.keys(attributes).find(k => attributes[k].primaryKey) || 'id';
        this.associations = [];
    }

    hasMany(targetModel, options = {}) {
        this.associations.push({ type: 'hasMany', targetModel, options });
    }

    belongsTo(targetModel, options = {}) {
        this.associations.push({ type: 'belongsTo', targetModel, options });
    }

    // Sincroniza o modelo com o banco PostgreSQL (CREATE TABLE IF NOT EXISTS + ALTER TABLE para colunas novas)
    async sync() {
        const definicoesColunas = [];

        for (const [coluna, config] of Object.entries(this.attributes)) {
            let sqlCol = `${coluna} `;
            if (config.autoIncrement && config.primaryKey) {
                sqlCol += 'SERIAL PRIMARY KEY';
            } else {
                sqlCol += typeof config.type === 'function' ? config.type() : config.type;
                if (config.primaryKey) sqlCol += ' PRIMARY KEY';
                if (config.unique) sqlCol += ' UNIQUE';
                if (config.allowNull === false) sqlCol += ' NOT NULL';
                if (config.defaultValue === 'NOW') sqlCol += ' DEFAULT CURRENT_TIMESTAMP';
                else if (config.defaultValue !== undefined) sqlCol += ` DEFAULT '${config.defaultValue}'`;
            }
            definicoesColunas.push(sqlCol);
        }

        const sqlCreate = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${definicoesColunas.join(', ')});`;
        await this.pool.query(sqlCreate);

        // Garante que colunas adicionadas posteriormente na evolução do modelo existam na tabela
        for (const [coluna, config] of Object.entries(this.attributes)) {
            if (config.primaryKey) continue;
            const tipoSql = typeof config.type === 'function' ? config.type() : config.type;
            await this.pool.query(
                `ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS ${coluna} ${tipoSql};`
            );
        }
    }

    // Constrói cláusula WHERE parametrizada de forma segura contra SQL Injection
    _buildWhere(where, offset = 1) {
        if (!where) return { clause: '', values: [] };

        const values = [];
        let paramIndex = offset;

        const parseCondition = (condObj) => {
            const partes = [];

            if (condObj[Op.or] && Array.isArray(condObj[Op.or])) {
                const subPartes = condObj[Op.or]
                    .map(sub => parseCondition(sub))
                    .filter(Boolean);
                if (subPartes.length > 0) {
                    partes.push(`(${subPartes.join(' OR ')})`);
                }
            }

            for (const [campo, valor] of Object.entries(condObj)) {
                values.push(valor);
                partes.push(`${campo} = $${paramIndex++}`);
            }

            return partes.join(' AND ');
        };

        const expressao = parseCondition(where);
        return {
            clause: expressao ? `WHERE ${expressao}` : '',
            values
        };
    }

    // SELECT * / atributos com filtros, ordenação e limite
    async findAll(options = {}) {
        const cols = Array.isArray(options.attributes) && options.attributes.length > 0
            ? options.attributes.join(', ')
            : '*';

        const { clause, values } = this._buildWhere(options.where, 1);

        let orderClause = '';
        if (Array.isArray(options.order) && options.order.length > 0) {
            const ordens = options.order.map(([col, dir = 'ASC']) => {
                const direcaoSegura = String(dir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                return `${col} ${direcaoSegura}`;
            });
            orderClause = `ORDER BY ${ordens.join(', ')}`;
        }

        let limitClause = '';
        if (Number.isInteger(options.limit) && options.limit > 0) {
            limitClause = `LIMIT ${options.limit}`;
        }

        const sql = `SELECT ${cols} FROM ${this.tableName} ${clause} ${orderClause} ${limitClause}`.trim();
        const result = await this.pool.query(sql, values);
        return result.rows.map(row => new ModelInstance(this, row));
    }

    // Retorna o primeiro registro correspondente ao filtro
    async findOne(options = {}) {
        const rows = await this.findAll({ ...options, limit: 1 });
        return rows[0] || null;
    }

    // Insere um novo registro mapeando os atributos do modelo
    async create(dados = {}) {
        const colunasValidas = Object.keys(this.attributes).filter(
            col => dados[col] !== undefined
        );

        const valores = colunasValidas.map(col => dados[col]);
        const placeholders = colunasValidas.map((_, idx) => `$${idx + 1}`);

        const sql = `
            INSERT INTO ${this.tableName} (${colunasValidas.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;
        const result = await this.pool.query(sql, valores);
        return new ModelInstance(this, result.rows[0]);
    }

    // Atualiza registros que atendem ao filtro where
    async update(novosValores = {}, options = {}) {
        const colunas = Object.keys(this.attributes).filter(
            col => novosValores[col] !== undefined && !this.attributes[col].primaryKey
        );
        if (colunas.length === 0) return [];

        const setValores = colunas.map(col => novosValores[col]);
        const setParts = colunas.map((col, idx) => `${col} = $${idx + 1}`);

        const { clause, values: whereValues } = this._buildWhere(options.where, colunas.length + 1);
        const sql = `
            UPDATE ${this.tableName}
            SET ${setParts.join(', ')}
            ${clause}
            RETURNING *
        `;
        const result = await this.pool.query(sql, [...setValores, ...whereValues]);
        return result.rows.map(row => new ModelInstance(this, row));
    }

    // Remove registros que atendem ao filtro where
    async destroy(options = {}) {
        const { clause, values } = this._buildWhere(options.where, 1);
        const sql = `DELETE FROM ${this.tableName} ${clause}`;
        const result = await this.pool.query(sql, values);
        return result.rowCount;
    }
}

class ORM {
    constructor(pool) {
        this.pool = pool;
        this.models = {};
    }

    define(modelName, tableName, attributes, options = {}) {
        const model = new Model(this.pool, tableName, attributes, options);
        this.models[modelName] = model;
        return model;
    }

    async sync() {
        for (const model of Object.values(this.models)) {
            await model.sync();
        }
    }
}

module.exports = { ORM, Model, DataTypes, Op };
