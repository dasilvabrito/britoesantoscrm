const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Environment check
const isPostgres = !!process.env.DATABASE_URL;
let db;

if (isPostgres) {
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Render
    });
    console.log("Connected to PostgreSQL (Production Mode)");
    initPg();
} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Error opening database', err.message);
        else console.log('Connected to SQLite (Local Mode).');
    });
    initSqlite();
}

// --- ADAPTER METHODS ---

// Helper to convert ? placeholders to $1, $2... for Postgres
function normalizeQuery(sql) {
    if (!isPostgres) return sql;
    let i = 1;
    return sql.replace(/\?/g, () => `$${i++}`);
}

const adapter = {
    // Run: used for INSERT, UPDATE, DELETE
    run: function (sql, params = [], callback) {
        if (!isPostgres) {
            db.run(sql, params, callback);
        } else {
            // Postgres Logic
            // Handle INSERT ... RETURNING id simulation
            let pgSql = normalizeQuery(sql);
            const isInsert = /^\s*INSERT/i.test(sql);

            if (isInsert && !/RETURNING/i.test(pgSql)) {
                pgSql += " RETURNING id";
            }

            db.query(pgSql, params, (err, res) => {
                const context = {};
                if (!err && isInsert && res.rows.length > 0) {
                    context.lastID = res.rows[0].id;
                }
                if (!err) {
                    context.changes = res.rowCount;
                }
                if (callback) callback.call(context, err, null); // SQLite passes (err)
            });
        }
    },

    // Get: single row
    get: function (sql, params = [], callback) {
        if (!isPostgres) {
            db.get(sql, params, callback);
        } else {
            db.query(normalizeQuery(sql), params, (err, res) => {
                if (err) callback(err, null);
                else callback(null, res.rows[0]);
            });
        }
    },

    // All: multiple rows
    all: function (sql, params = [], callback) {
        if (!isPostgres) {
            db.all(sql, params, callback);
        } else {
            db.query(normalizeQuery(sql), params, (err, res) => {
                if (err) callback(err, null);
                else callback(null, res.rows);
            });
        }
    },

    serialize: function (callback) {
        if (!isPostgres) db.serialize(callback);
        else callback(); // PG is async/parallel, no serialize
    },

    // API to interact directly if needed (escape hatch)
    raw: db
};

// --- INITIALIZATION SCRIPTS ---

function initSqlite() {
    db.serialize(() => {
        // ... (Original SQLite Setup Code - Compacted for brevity but preserving structure) ...
        db.run(`CREATE TABLE IF NOT EXISTS pipelines (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS stages (id INTEGER PRIMARY KEY AUTOINCREMENT, pipeline_id INTEGER, name TEXT NOT NULL, "order" INTEGER DEFAULT 0, FOREIGN KEY(pipeline_id) REFERENCES pipelines(id))`);
        db.run(`CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, nationality TEXT, marital_status TEXT, profession TEXT, rg TEXT, cpf TEXT, address TEXT, phone TEXT, email TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, street TEXT, number TEXT, neighborhood TEXT, city TEXT, state TEXT, zip TEXT)`);

        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, cpf TEXT, phone TEXT, login TEXT UNIQUE, role TEXT DEFAULT 'collaborator', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, password TEXT, oab TEXT, oab_uf TEXT, office_address TEXT, nationality TEXT, marital_status TEXT)`);

        db.run(`CREATE TABLE IF NOT EXISTS deals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, client_name TEXT, client_id INTEGER, value REAL, stage_id INTEGER, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deadline DATE, priority TEXT DEFAULT 'Normal', responsible_id INTEGER, delegated_to_id INTEGER, folder_path TEXT, process_number TEXT, FOREIGN KEY(stage_id) REFERENCES stages(id), FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(responsible_id) REFERENCES users(id), FOREIGN KEY(delegated_to_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS office_settings (id INTEGER PRIMARY KEY CHECK (id = 1), company_name TEXT, cnpj TEXT, oab_company TEXT, address TEXT, attorney_name TEXT, oab_attorney TEXT, attorney_qualification TEXT, zapsign_token TEXT, datajud_url TEXT, datajud_key TEXT)`);

        db.run(`CREATE TABLE IF NOT EXISTS deal_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, deal_id INTEGER, user_id INTEGER, user_name TEXT, content TEXT NOT NULL, type TEXT DEFAULT 'general', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(deal_id) REFERENCES deals(id), FOREIGN KEY(user_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS client_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER, type TEXT, title TEXT, filename TEXT, path TEXT, created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, external_id TEXT, signer_link TEXT, status TEXT DEFAULT 'created', description TEXT, FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(created_by) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS deal_files (id INTEGER PRIMARY KEY AUTOINCREMENT, deal_id INTEGER, filename TEXT, path TEXT, uploaded_by INTEGER, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(deal_id) REFERENCES deals(id), FOREIGN KEY(uploaded_by) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS publications (id INTEGER PRIMARY KEY AUTOINCREMENT, external_id TEXT UNIQUE, content TEXT, process_number TEXT, publication_date DATE, court TEXT, status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        // Seed
        db.get("SELECT count(*) as count FROM pipelines", (err, row) => {
            if (row && row.count === 0) {
                console.log("Seeding SQLite default data...");
                db.run(`INSERT INTO pipelines (name) VALUES ('Pipeline Padrão')`, function (err) {
                    if (!err) {
                        const pipelineId = this.lastID;
                        const stages = ['Nova Atividade', 'Em Execução', 'Aguardando Cliente', 'Aguardando Ajuizamento', 'Concluído'];
                        const stmt = db.prepare(`INSERT INTO stages (pipeline_id, name, "order") VALUES (?, ?, ?)`);
                        stages.forEach((stage, index) => stmt.run(pipelineId, stage, index));
                        stmt.finalize();
                    }
                });
            }
        });
    });
}

function initPg() {
    // Postgres Schema Creation using standard SQL
    const schema = `
        CREATE TABLE IF NOT EXISTS pipelines (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS stages (id SERIAL PRIMARY KEY, pipeline_id INTEGER REFERENCES pipelines(id), name TEXT NOT NULL, "order" INTEGER DEFAULT 0);
        
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY, name TEXT NOT NULL, nationality TEXT, marital_status TEXT, profession TEXT, rg TEXT, cpf TEXT, address TEXT, phone TEXT, email TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            street TEXT, number TEXT, neighborhood TEXT, city TEXT, state TEXT, zip TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, cpf TEXT, phone TEXT, login TEXT UNIQUE, role TEXT DEFAULT 'collaborator', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, password TEXT, oab TEXT, oab_uf TEXT, office_address TEXT, nationality TEXT, marital_status TEXT
        );

        CREATE TABLE IF NOT EXISTS deals (
            id SERIAL PRIMARY KEY, title TEXT NOT NULL, client_name TEXT, client_id INTEGER REFERENCES clients(id), value REAL, stage_id INTEGER REFERENCES stages(id), description TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, deadline DATE, priority TEXT DEFAULT 'Normal', responsible_id INTEGER REFERENCES users(id), delegated_to_id INTEGER REFERENCES users(id), 
            folder_path TEXT, process_number TEXT
        );

        CREATE TABLE IF NOT EXISTS office_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1), company_name TEXT, cnpj TEXT, oab_company TEXT, address TEXT, attorney_name TEXT, oab_attorney TEXT, attorney_qualification TEXT, 
            zapsign_token TEXT, datajud_url TEXT, datajud_key TEXT
        );

        CREATE TABLE IF NOT EXISTS deal_comments (
            id SERIAL PRIMARY KEY, deal_id INTEGER REFERENCES deals(id), user_id INTEGER REFERENCES users(id), user_name TEXT, content TEXT NOT NULL, type TEXT DEFAULT 'general', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS client_documents (
            id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), type TEXT, title TEXT, filename TEXT, path TEXT, created_by INTEGER REFERENCES users(id), 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, external_id TEXT, signer_link TEXT, status TEXT DEFAULT 'created', description TEXT
        );

        CREATE TABLE IF NOT EXISTS deal_files (
            id SERIAL PRIMARY KEY, deal_id INTEGER REFERENCES deals(id), filename TEXT, path TEXT, uploaded_by INTEGER REFERENCES users(id), 
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS publications (
            id SERIAL PRIMARY KEY, external_id TEXT UNIQUE, content TEXT, process_number TEXT, publication_date DATE, court TEXT, status TEXT DEFAULT 'new', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.query(schema, (err) => {
        if (err) console.error("Error initializing PG tables:", err);
        else {
            console.log("PG Tables Verified.");
            // Seed Pipelines
            db.query("SELECT count(*) as count FROM pipelines", (err, res) => {
                if (err) return;
                if (parseInt(res.rows[0].count) === 0) {
                    console.log("Seeding PG default pipeline...");
                    db.query("INSERT INTO pipelines (name) VALUES ($1) RETURNING id", ['Pipeline Padrão'], (err, res) => {
                        if (!err) {
                            const pipelineId = res.rows[0].id;
                            const stages = ['Nova Atividade', 'Em Execução', 'Aguardando Cliente', 'Aguardando Ajuizamento', 'Concluído'];
                            stages.forEach((stage, index) => {
                                db.query('INSERT INTO stages (pipeline_id, name, "order") VALUES ($1, $2, $3)', [pipelineId, stage, index]);
                            });
                        }
                    });
                }
            });

            // Seed Admin User
            db.query("SELECT count(*) as count FROM users", (err, res) => {
                if (err) return;
                if (parseInt(res.rows[0].count) === 0) {
                    console.log("Seeding PG default user (willian)...");
                    // Hash for @Willian10
                    const hash = bcrypt.hashSync('@Willian10', 10);
                    db.query(
                        "INSERT INTO users (name, email, login, password, role) VALUES ($1, $2, $3, $4, $5)",
                        ['Willian', 'willian@lawfirm.com', 'willian', hash, 'admin']
                    );
                }
            });
        }
    });
}

module.exports = adapter;
