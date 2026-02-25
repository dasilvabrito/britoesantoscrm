require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;

class DatabaseAdapter {
    constructor() {
        this.isPostgres = !!DATABASE_URL;
        this.connection = null;

        if (this.isPostgres) {
            console.log("[DB] Mode: PostgreSQL (Neon Cloud)");
            this.connection = new Pool({
                connectionString: DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                },
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });

            this.connection.on('error', (err) => {
                console.error('[DB] Unexpected error on idle client', err);
            });
        } else {
            const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
            console.log(`[DB] Mode: SQLite (Local). Path: ${dbPath}`);
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            this.connection = new sqlite3.Database(dbPath);
            this.connection.configure("busyTimeout", 10000);
        }
    }

    // Convert '?' to '$1, $2, ...' for PostgreSQL
    _convertSql(sql) {
        if (!this.isPostgres) return sql;
        let count = 0;
        return sql.replace(/\?/g, () => `$${++count}`);
    }

    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        const convertedSql = this._convertSql(sql);

        if (this.isPostgres) {
            this.connection.query(convertedSql, params)
                .then(res => {
                    const result = {
                        lastID: res.rows[0] ? res.rows[0].id : null,
                        changes: res.rowCount
                    };
                    if (callback) callback.call(result, null);
                })
                .catch(err => {
                    if (callback) callback(err);
                });
        } else {
            this.connection.run(sql, params, function (err) {
                if (callback) callback.call(this, err);
            });
        }
    }

    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        const convertedSql = this._convertSql(sql);

        if (this.isPostgres) {
            this.connection.query(convertedSql, params)
                .then(res => {
                    if (callback) callback(null, res.rows[0]);
                })
                .catch(err => {
                    if (callback) callback(err);
                });
        } else {
            this.connection.get(sql, params, (err, row) => {
                if (callback) callback(err, row);
            });
        }
    }

    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        const convertedSql = this._convertSql(sql);

        if (this.isPostgres) {
            this.connection.query(convertedSql, params)
                .then(res => {
                    if (callback) callback(null, res.rows);
                })
                .catch(err => {
                    if (callback) callback(err);
                });
        } else {
            this.connection.all(sql, params, (err, rows) => {
                if (callback) callback(err, rows);
            });
        }
    }

    close() {
        if (this.isPostgres) {
            return this.connection.end();
        } else {
            return new Promise((resolve, reject) => {
                this.connection.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }
}

const dbInstance = new DatabaseAdapter();

// Legacy initialization skip if PostgreSQL (assume schema.sql handled it)
if (!dbInstance.isPostgres) {
    // We could add initSqlite here if we wanted auto-init for local
    // But the original code called it at the end of the file.
}

module.exports = dbInstance;
