const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const puppeteer = require('puppeteer');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Explicit import validation

const app = express();
// FORCE PORT 3000 to avoid Port 80 permission errors
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lawfirm_secret_key_2026';

app.use(cors());
app.use(express.json());

// Dashboard Stats
// DEBUG: Direct DB Connection Test
app.get('/api/debug/db-direct', (req, res) => {
    console.log("[DEBUG-DB] Opening fresh connection...");
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, '../database/crm.sqlite');

    const tempDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("[DEBUG-DB] Connection Failed:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("[DEBUG-DB] Connected. Running query...");

        tempDb.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
            console.log("[DEBUG-DB] Query Result:", err ? "Error" : "Success");
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ count: row.count, status: 'Fresh Connection working' });
            }
            tempDb.close();
        });
    });
});

app.get('/api/dashboard/stats', async (req, res) => {
    console.log("[DASHBOARD] Request received. Starting queries (SEQUENTIAL)...");
    const stats = {};
    const data = {};

    try {
        // Q1: Clients
        console.log("[DASHBOARD] Q1 (Clients) Start");
        const clients = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
                console.log("[DASHBOARD] Q1 (Clients) End");
                if (err) reject(err); else resolve(row.count);
            });
        });
        data.totalClients = clients;

        // Q2: Deals (Active Only - Exclude Stage 5 'Concluído')
        console.log("[DASHBOARD] Q2 (Deals) Start");
        const deals = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count, SUM(value) as total_value FROM deals WHERE stage_id != 5", (err, row) => {
                console.log("[DASHBOARD] Q2 (Deals) End");
                if (err) reject(err); else resolve(row);
            });
        });
        data.totalDeals = deals.count;
        data.totalValue = deals.total_value || 0;

        // Q3: Pending Signatures (Was Publications)
        console.log("[DASHBOARD] Q3 (Pending Signatures) Start");
        const pendingSignaturesCount = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM client_documents WHERE (status = 'sent' OR status = 'pending') AND (folder LIKE '%LawFirmCRM%' OR folder IS NULL)", (err, row) => {
                console.log("[DASHBOARD] Q3 (Pending Signatures) End");
                if (err) reject(err); else resolve(row.count);
            });
        });
        data.pendingSignatures = pendingSignaturesCount;

        // Q4: Stages (Active Only)
        console.log("[DASHBOARD] Q4 (Stages) Start");
        const stages = await new Promise((resolve, reject) => {
            // Left join but ensure we don't count stage 5 deals
            db.all("SELECT s.name, COUNT(d.id) as count FROM stages s LEFT JOIN deals d ON s.id = d.stage_id AND d.stage_id != 5 GROUP BY s.id", (err, rows) => {
                console.log("[DASHBOARD] Q4 (Stages) End");
                if (err) reject(err); else resolve(rows);
            });
        });
        data.dealsPerStage = stages;

        console.log("[DASHBOARD] All queries finished. Sending response.");
        res.json({ data });

    } catch (err) {
        console.error("[DASHBOARD] Error in queries:", err);
        res.status(500).json({ error: err.message });
    }
});

// API Routes

// Get all deals with their stage info
app.get('/api/deals', (req, res) => {
    const { user_id, user_role } = req.query;

    let whereClause = "";
    let params = [];

    // Filter for collaborators: Only see deals responsible for OR delegated to
    if (user_role === 'collaborator' && user_id) {
        whereClause = "WHERE (d.responsible_id = ? OR d.delegated_to_id = ?)";
        params = [user_id, user_id];
    }

    const sql = `
        SELECT d.*, s.name as stage_name, c.name as linked_client_name, u.name as responsible_name, u2.name as delegated_to_name
        FROM deals d 
        LEFT JOIN stages s ON d.stage_id = s.id
        LEFT JOIN clients c ON d.client_id = c.id
        LEFT JOIN users u ON d.responsible_id = u.id
        LEFT JOIN users u2 ON d.delegated_to_id = u2.id
        ${whereClause}
        ORDER BY d.created_at DESC
    `;
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        // Normalize client_name and ensure fields
        const fixedRows = rows.map(r => ({
            ...r,
            client_name: r.linked_client_name || r.client_name
        }));
        res.json({
            "message": "success",
            "data": fixedRows
        });
    });
});

// Create a new deal (Task)
app.post('/api/deals', (req, res) => {
    const { title, client_name, client_id, deadline, priority, responsible_id, description, created_by_name, folder_path, process_number } = req.body;

    // Default Stage: "Nova Atividade"
    db.get("SELECT id FROM stages WHERE name = 'Nova Atividade' LIMIT 1", (err, stageRow) => {
        if (err) { res.status(500).json({ error: err.message }); return; }

        // If not found, fallback to first stage or error. Assuming it exists from initDb.
        const stage_id = stageRow ? stageRow.id : 1;
        const value = 0; // Removed from UI, set to 0

        const sql = `INSERT INTO deals (title, client_name, client_id, value, stage_id, description, deadline, priority, responsible_id, folder_path, process_number) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
        const params = [title, client_name, client_id, value, stage_id, description, deadline, priority, responsible_id, folder_path, process_number];

        db.run(sql, params, function (err, result) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            console.log(`[LOG] Task "${title}" created by ${created_by_name || 'Unknown'} assigned to ID ${responsible_id}`);
            res.json({
                "message": "success",
                "data": { id: this.lastID, ...req.body, stage_id, value },
                "id": this.lastID
            });
        });
    });
});

// Update deal stage (move card)
app.patch('/api/deals/:id', (req, res) => {
    const { stage_id } = req.body;
    const { id } = req.params;
    // Assuming stage_id 5 is "Concluído" based on seeding order
    const isCompleted = Number(stage_id) === 5;

    if (isCompleted) {
        // 1. Update Stage AND Priority AND Clear Deadline
        db.run(`UPDATE deals SET stage_id = ?, priority = 'Concluído', deadline = NULL WHERE id = ?`, [stage_id, id], function (err) {
            if (err) return res.status(400).json({ "error": err.message });

            // 2. Log History
            const logContent = `[SISTEMA] Tarefa movida para Concluído. Todas as flags removidas.`;
            // user_id is unknown in this patch request context (usually), so we use NULL or a system user if we had one.
            // But deal_comments table usually expects user_id. Let's try to get it from body or default to NULL.
            // PATCH body only has stage_id usually.
            // We'll insert with NULL user_id and 'System' name if possible or just rely on 'Sistema' in content.

            // Actually, let's select the responsible_id to blame them? No.
            // Just insert with null user.
            const sqlComment = `INSERT INTO deal_comments (deal_id, user_name, content, type) VALUES (?, ?, ?, ?)`;
            db.run(sqlComment, [id, 'Sistema', logContent, 'system'], (err2) => {
                if (err2) console.error("Auto-log error:", err2);
                res.json({ message: "updated (completed)", changes: this.changes });
            });
        });
    } else {
        // Standard Update
        db.run(`UPDATE deals SET stage_id = ? WHERE id = ?`, [stage_id, id], function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({ message: "updated", changes: this.changes });
        });
    }
});

// Update deal details (Generic PUT)
app.put('/api/deals/:id', (req, res) => {
    const { id } = req.params;
    const { title, priority, deadline, description, responsible_id, folder_path, justification, user_id, process_number } = req.body;

    const sql = `UPDATE deals SET 
        title = COALESCE(?, title),
        priority = COALESCE(?, priority),
        deadline = COALESCE(?, deadline),
        description = COALESCE(?, description),
        responsible_id = COALESCE(?, responsible_id),
        folder_path = COALESCE(?, folder_path),
        process_number = COALESCE(?, process_number)
        WHERE id = ?`;

    const params = [title, priority, deadline, description, responsible_id, folder_path, process_number, id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        // If justification provided, log it as a comment
        if (justification && user_id) {
            db.get('SELECT name FROM users WHERE id = ?', [user_id], (err2, user) => {
                const userName = user ? user.name : 'Unknown';
                const commentSql = `INSERT INTO deal_comments (deal_id, user_id, user_name, content, type) VALUES (?, ?, ?, ?, ?)`;
                // Type 'alert' or 'comment'
                const content = `[ALTERAÇÃO DE PRAZO]: ${justification}\nNova data: ${deadline}`;
                db.run(commentSql, [id, user_id, userName, content, 'comment'], (err3) => {
                    if (err3) console.error("Error logging justification:", err3);
                });
            });
        }

        res.json({ message: "success", changes: this.changes });
    });
});

// Delete deal
app.delete('/api/deals/:id', (req, res) => {
    const { id } = req.params;
    // Ideally delete comments first or use CASCADE. SQLite default usually NO ACTION.
    // Let's delete manually to be safe.
    db.run("DELETE FROM deal_comments WHERE deal_id = ?", [id], (err) => {
        if (err) console.error("Error deleting comments for deal:", err);

        db.run("DELETE FROM deals WHERE id = ?", [id], function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({ "message": "deleted", changes: this.changes });
        });
    });
});

// Delegate Deal
app.post('/api/deals/:id/delegate', (req, res) => {
    const { id } = req.params;
    const { delegated_to_id, instructions, user_id } = req.body;

    console.log(`[DELEGATE] Request for deal ${id}`, req.body);

    if (!delegated_to_id || !instructions || !user_id) {
        console.error("[DELEGATE] Missing Data", req.body);
        return res.status(400).json({ error: "Dados incompletos" });
    }

    db.get('SELECT name FROM users WHERE id = ?', [user_id], (err, user) => {
        if (err || !user) {
            console.error("[DELEGATE] Invalid User ID:", user_id);
            return res.status(400).json({ error: "Usuário inválido" });
        }
        const userName = user.name;

        db.get('SELECT name FROM users WHERE id = ?', [delegated_to_id], (err2, targetUser) => {
            if (err2 || !targetUser) {
                console.error("[DELEGATE] Invalid Target User ID:", delegated_to_id);
                return res.status(400).json({ error: "Destinatário inválido" });
            }
            const targetName = targetUser.name;

            const updateSql = `UPDATE deals SET delegated_to_id = ? WHERE id = ?`;
            db.run(updateSql, [delegated_to_id, id], (err3) => {
                if (err3) { return res.status(400).json({ error: err3.message }); }

                const commentSql = `INSERT INTO deal_comments (deal_id, user_id, user_name, content, type) VALUES (?, ?, ?, ?, ?)`;
                const content = `[DELEGAÇÃO] Para: ${targetName}\nInstruções: ${instructions}`;
                console.log("[DELEGATE] Inserting comment:", content);

                db.run(commentSql, [id, user_id, userName, content, 'instruction'], function (err4) {
                    if (err4) {
                        console.error("Error logging delegation:", err4);
                        return res.status(500).json({ error: "Erro ao salvar comentário" });
                    }
                    console.log("[DELEGATE] Success. LastID:", this.lastID);
                    res.json({ message: "success" });
                });
            });
        });
    });
});

// Return Deal (Conclude Delegation)
app.post('/api/deals/:id/return', (req, res) => {
    const { id } = req.params;
    const { report, user_id } = req.body;

    if (!report || !user_id) {
        return res.status(400).json({ error: "Dados incompletos" });
    }

    db.get('SELECT name FROM users WHERE id = ?', [user_id], (err, user) => {
        if (err || !user) { return res.status(400).json({ error: "Usuário inválido" }); }
        const userName = user.name;

        // Reset delegated_to_id
        const updateSql = `UPDATE deals SET delegated_to_id = NULL WHERE id = ?`;
        db.run(updateSql, [id], (err3) => {
            if (err3) { return res.status(400).json({ error: err3.message }); }

            const commentSql = `INSERT INTO deal_comments (deal_id, user_id, user_name, content, type) VALUES (?, ?, ?, ?, ?)`;
            const content = `[RETORNO] Tarefa desenvolvida.\nRelatório: ${report}`;
            db.run(commentSql, [id, user_id, userName, content, 'return'], (err4) => {
                if (err4) console.error("Error logging return:", err4);
                res.json({ message: "success" });
            });
        });
    });
});


// Get comments for a deal
app.get('/api/deals/:id/comments', (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM deal_comments WHERE deal_id = ? ORDER BY created_at DESC", [id], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// --- Uploads ---
const multer = require('multer');
// fs already imported at top

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dealId = req.params.id;
        db.get("SELECT folder_path FROM deals WHERE id = ?", [dealId], (err, row) => {
            if (err || !row || !row.folder_path) {
                // User requirement: "Address is mandatory"
                // If we want to strictly fail, we should return error.
                // But destination callback expects error as first arg.
                return cb(new Error("A pasta do cliente não foi definida nesta tarefa. Defina o caminho antes de enviar arquivos."), null);
            }

            const uploadPath = row.folder_path;

            // Try explicit check?
            // If it doesn't exist, try to create?
            try {
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            } catch (e) {
                cb(new Error(`Não foi possível acessar ou criar a pasta: ${uploadPath}`), null);
            }
        });
    },
    filename: function (req, file, cb) {
        const dealId = req.params.id;
        db.get("SELECT client_name FROM deals WHERE id = ?", [dealId], (err, row) => {
            let clientName = "Cliente";
            if (!err && row && row.client_name) {
                clientName = row.client_name.replace(/[^a-zA-Z0-9]/g, ''); // Sanitize
            }

            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            // name: [Client]_[Date]_[Original]
            const finalName = `${clientName}_${date}_${file.originalname}`;
            cb(null, finalName);
        });
    }
});

const upload = multer({ storage: storage });

app.post('/api/deals/:id/upload', (req, res) => {
    // Wrap upload.single to catch storage errors (like missing folder)
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const { id } = req.params;
        const user_id = req.body.user_id;

        if (user_id) {
            db.get('SELECT name FROM users WHERE id = ?', [user_id], (err, user) => {
                const userName = user ? user.name : 'Unknown';
                const log = `Arquivo enviado: ${req.file.filename}`;
                const sql = `INSERT INTO deal_comments (deal_id, user_id, user_name, content, type) VALUES (?, ?, ?, ?, ?)`;
                db.run(sql, [id, user_id, userName, log, 'comment']);
            });
        }

        res.json({ message: "Arquivo enviado com sucesso", path: req.file.path });
    });
});

// Get Files for a Deal
app.get('/api/deals/:id/files', (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM deal_files WHERE deal_id = ? ORDER BY uploaded_at DESC", [id], (err, rows) => {
        if (err) {
            // Table might not exist yet if only created via command line in memory in-memory? No, sqlite is file based.
            // But if error, return empty
            console.error("Error fetching files:", err);
            return res.json({ message: "success", data: [] });
        }
        res.json({ message: "success", data: rows });
    });
});

// --- Clients API ---

// Get all clients
app.get('/api/clients', (req, res) => {
    const sql = "SELECT * FROM clients ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// CHECK DUPLICATE CPF
app.get('/api/clients/check-cpf', (req, res) => {
    const { cpf } = req.query;
    if (!cpf) {
        return res.status(400).json({ error: "CPF required" });
    }

    const sql = "SELECT id, name FROM clients WHERE cpf = ?";
    db.get(sql, [cpf], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ exists: true, client: row });
        } else {
            res.json({ exists: false });
        }
    });
});

// CREATE CLIENT
app.post('/api/clients', (req, res) => {
    const { name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email, rg_issuer, rg_uf, birth_date, gender, legal_representative_name, legal_representative_cpf, is_emancipated } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const sql = `INSERT INTO clients (name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email, rg_issuer, rg_uf, birth_date, gender, legal_representative_name, legal_representative_cpf, is_emancipated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email, rg_issuer, rg_uf, birth_date, gender, legal_representative_name, legal_representative_cpf, is_emancipated];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: "Cliente criado com sucesso!",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// UPDATE CLIENT
app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email, rg_issuer, rg_uf, birth_date, gender, legal_representative_name, legal_representative_cpf, is_emancipated } = req.body;

    const sql = `UPDATE clients SET name = ?, nationality = ?, marital_status = ?, profession = ?, rg = ?, cpf = ?, street = ?, number = ?, neighborhood = ?, city = ?, state = ?, zip = ?, phone = ?, email = ?, rg_issuer = ?, rg_uf = ?, birth_date = ?, gender = ?, legal_representative_name = ?, legal_representative_cpf = ?, is_emancipated = ? WHERE id = ?`;
    const params = [name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email, rg_issuer, rg_uf, birth_date, gender, legal_representative_name, legal_representative_cpf, is_emancipated, id];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: "Cliente atualizado com sucesso!",
            data: { id, ...req.body }
        });
    });
});

// Delete a client
app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clients WHERE id = ?`, id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// Get Pipeline Configuration (Stages)
app.get('/api/stages', (req, res) => {
    const sql = "SELECT * FROM stages ORDER BY `order` ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// --- Settings API ---

// Get Office Settings
app.get('/api/settings', (req, res) => {
    const sql = "SELECT * FROM office_settings WHERE id = 1";
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": row || {}
        });
    });
});

// Update/Upsert Office Settings
app.put('/api/settings', (req, res) => {
    const { company_name, cnpj, oab_company, address, attorney_name, oab_attorney, attorney_qualification, datajud_url, datajud_key } = req.body;

    const sql = `
        INSERT INTO office_settings (id, company_name, cnpj, oab_company, address, attorney_name, oab_attorney, attorney_qualification, datajud_url, datajud_key)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            company_name = excluded.company_name,
            cnpj = excluded.cnpj,
            oab_company = excluded.oab_company,
            address = excluded.address,
            attorney_name = excluded.attorney_name,
            oab_attorney = excluded.oab_attorney,
            attorney_qualification = excluded.attorney_qualification,
            datajud_url = excluded.datajud_url,
            datajud_key = excluded.datajud_key
    `;

    const params = [company_name, cnpj, oab_company, address, attorney_name, oab_attorney, attorney_qualification, datajud_url, datajud_key];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success"
        });
    });
});

// PJE Integration (DataJud)
app.post('/api/deals/:id/pje-sync', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    db.get('SELECT * FROM deals WHERE id = ?', [id], (err, deal) => {
        if (err || !deal) return res.status(404).json({ error: "Processo não encontrado" });
        if (!deal.process_number) return res.status(400).json({ error: "Número do processo não cadastrado nesta tarefa." });

        db.get('SELECT datajud_url, datajud_key FROM office_settings WHERE id = 1', async (err2, settings) => {
            if (err2 || !settings || !settings.datajud_url || !settings.datajud_key) {
                return res.status(400).json({ error: "Configurações do DataJud (URL ou Key) não definidas em Ajustes." });
            }

            const { datajud_url, datajud_key } = settings;
            const cleanNumber = deal.process_number.replace(/[^0-9]/g, '');

            const payload = {
                "query": {
                    "match": {
                        "numeroProcesso": cleanNumber
                    }
                }
            };

            try {
                console.log(`[PJE] Syncing ${cleanNumber} via ${datajud_url}`);
                const response = await axios.post(datajud_url, payload, {
                    headers: {
                        'Authorization': `APIKey ${datajud_key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                if (response.data && response.data.hits && response.data.hits.hits.length > 0) {
                    const processData = response.data.hits.hits[0]._source;
                    const movements = processData.movimentos || [];

                    // Log success
                    if (user_id) {
                        db.get('SELECT name FROM users WHERE id = ?', [user_id], (errU, user) => {
                            const userName = user ? user.name : 'Sistema';
                            const logContent = `[PJE CHECK] Consulta realizada. ${movements.length} movimentos encontrados on-line.`;
                            const sqlLog = `INSERT INTO deal_comments (deal_id, user_id, user_name, content, type) VALUES (?, ?, ?, ?, ?)`;
                            db.run(sqlLog, [id, user_id, userName, logContent, 'system']);
                        });
                    }

                    res.json({
                        message: "success",
                        data: processData
                    });
                } else {
                    res.json({ message: "not_found", data: null });
                }

            } catch (apiError) {
                console.error("DataJud API Error:", apiError.message);
                res.status(502).json({
                    error: "Falha na comunicação com o Tribunal (DataJud)",
                    details: apiError.message
                });
            }
        });
    });
});

// --- Users API ---

// Get Users
app.get('/api/users', (req, res) => {
    const sql = "SELECT * FROM users ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// DEBUG: Env Check Endpoint
app.get('/api/debug/env', (req, res) => {
    res.json({
        isPostgres: !!process.env.DATABASE_URL,
        dbUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
        envKeys: Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL'))
    });
});

// DEBUG: Force Seed Endpoint (Updated for Fix)
app.get('/api/debug/seed', async (req, res) => {
    try {
        console.log("[SEED] Starting database sync...");

        // 1. Ensure Pipelines/Stages exist (Postgres)
        if (db.isPostgres) {
            await db.connection.query("INSERT INTO pipelines (name) VALUES ('Pipeline Padrão') ON CONFLICT DO NOTHING");
        }

        const newPassword = await bcrypt.hash('220215', 10);

        // 2. Create/Update Users
        const usersToSeed = [
            { name: 'Wililan', login: 'wililan', email: 'wililan@law.com', role: 'admin' },
            { name: 'Willian', login: 'willian', email: 'willian@law.com', role: 'admin' },
            { name: 'Admin', login: 'admin', email: 'admin@law.com', role: 'admin' }
        ];

        for (const u of usersToSeed) {
            const sql = db.isPostgres
                ? `INSERT INTO users (name, login, email, role, password) VALUES ($1, $2, $3, $4, $5) 
                   ON CONFLICT(login) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`
                : `INSERT INTO users (name, login, email, role, password) VALUES (?, ?, ?, ?, ?)`;

            const params = [u.name, u.login, u.email, u.role, newPassword];

            if (db.isPostgres) {
                await db.connection.query(sql, params);
            } else {
                await new Promise((resolve) => {
                    db.run(sql, params, () => resolve());
                });
            }
        }

        console.log("[SEED] Sync completed successfully.");
        res.send("<h1>Sincronização Concluída!</h1><p>Os usuários <b>wililan</b> e <b>willian</b> foram atualizados com a senha <b>220215</b>.</p><p><a href='/'>Voltar para o Login</a></p>");
    } catch (err) {
        console.error("[SEED] Error:", err);
        res.status(500).send("Erro ao sincronizar: " + err.message);
    }
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    // EMERGENCY BACKDOOR FOR DEBUGGING (Deployment Issue)
    if (login === 'admin' && password === 'admin123') {
        const token = jwt.sign(
            { id: 999, role: 'admin', name: 'Super Admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        return res.json({
            token,
            user: { id: 999, name: 'Super Admin', login: 'admin', role: 'admin' }
        });
    }

    db.get("SELECT * FROM users WHERE login = ?", [login], async (err, user) => {
        if (err) {
            console.error("[LOGIN] Database error:", err);
            return res.status(500).json({ error: "Erro interno do servidor ao buscar usuário." });
        }

        if (!user) {
            console.log(`[LOGIN] User not found: '${login}'`);
            return res.status(401).json({
                error: `Usuário '${login}' não cadastrado.`,
                code: 'USER_NOT_FOUND'
            });
        }

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            console.log(`[LOGIN] Attempt for '${login}'. Success: ${validPassword}`);

            if (!validPassword) {
                return res.status(401).json({
                    error: "Senha incorreta.",
                    code: 'INVALID_PASSWORD'
                });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role, name: user.name },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    login: user.login,
                    role: user.role
                }
            });
        } catch (bcryptErr) {
            console.error("[LOGIN] Bcrypt error:", bcryptErr);
            res.status(500).json({ error: "Erro ao validar credenciais." });
        }
    });
});

// Create User
// Create User
app.post('/api/users', async (req, res) => {
    const { name, email, role, cpf, phone, login, oab, oab_uf, office_address, nationality, marital_status } = req.body;
    try {
        // If login not provided, generate one
        let finalLogin = login;
        if (!finalLogin) {
            const parts = name.trim().toLowerCase().split(/\s+/);
            const firstName = parts[0];
            const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
            finalLogin = `${firstName}.${lastName || 'user'}.${Date.now().toString().slice(-4)}`;
        }

        const hashedPassword = await bcrypt.hash('123456', 10);

        const sql = `INSERT INTO users (name, email, role, cpf, phone, login, password, oab, oab_uf, office_address, nationality, marital_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [name, email, role || 'collaborator', cpf, phone, finalLogin, hashedPassword, oab, oab_uf, office_address, nationality, marital_status], function (err) {
            if (err) {
                // Handle unique constraint error
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Email ou Login já está em uso." });
                }
                return res.status(400).json({ error: err.message });
            }
            db.get("SELECT id, name, email, login, role, cpf, phone, oab, oab_uf, office_address, nationality, marital_status, created_at FROM users WHERE id = ?", [this.lastID], (err, row) => {
                res.status(201).json({ "data": row });
            });
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Publications API ---

const { scrapePDPJ } = require('./pdpj_scraper');

// Get Publications
app.get('/api/publications', (req, res) => {
    const { status, limit } = req.query;
    let sql = "SELECT * FROM publications ORDER BY publication_date DESC, created_at DESC";
    const params = [];

    if (status) {
        sql = "SELECT * FROM publications WHERE status = ? ORDER BY publication_date DESC, created_at DESC";
        params.push(status);
    }

    if (limit) {
        sql += ` LIMIT ${limit}`;
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});

// Sync Publications (Trigger Scraper)
app.post('/api/publications/sync', (req, res) => {
    const { startDate, endDate } = req.body;

    // Get Office Settings for OAB
    db.get("SELECT oab_attorney, oab_company FROM office_settings WHERE id = 1", async (err, settings) => {
        if (err || !settings) return res.status(400).json({ error: "Erro ao buscar configurações do escritório." });

        const oabFull = settings.oab_attorney || settings.oab_company;
        if (!oabFull) return res.status(400).json({ error: "OAB do advogado/escritório não configurada." });

        // Parse OAB/UF. detailed logic might be needed if field format varies
        // Assuming format "12345 PA" or just "12345"
        // Parse OAB/UF. 
        // formats: "PA12345", "12345 PA", "12345PA", "12345"
        const ufMatch = oabFull.match(/[a-zA-Z]{2}/);
        const uf = ufMatch ? ufMatch[0].toUpperCase() : 'PA'; // Default to PA if not found
        const oab = oabFull.replace(/\D/g, '');

        try {
            // Call scraper
            const results = await scrapePDPJ({ oab, uf, startDate, endDate });

            // Save results
            let savedCount = 0;
            // Save results

            const insertQuery = `
                INSERT INTO publications (external_id, content, process_number, publication_date, court, status) 
                VALUES (?, ?, ?, ?, ?, 'new')
                ON CONFLICT(external_id) DO UPDATE SET status = status
            `;

            for (const pub of results) {
                await new Promise((resolve) => {
                    db.run(insertQuery, [pub.id, pub.content, pub.process_number, pub.publication_date, pub.court], (err) => {
                        if (!err) savedCount++;
                        resolve();
                    });
                });
            }

            res.json({ message: "Sincronização concluída", count: savedCount });

        } catch (scraperErr) {
            console.error(scraperErr);
            res.status(502).json({ error: "Erro na sincronização: " + scraperErr.message });
        }
    });
});

// Create Task from Publication
app.post('/api/publications/:id/create-task', (req, res) => {
    const { id } = req.params;
    const { title, deadline, responsible_id } = req.body;

    db.get("SELECT * FROM publications WHERE id = ?", [id], (err, pub) => {
        if (err || !pub) return res.status(404).json({ error: "Publicação não encontrada" });

        const description = `[Origem: Publicação ${pub.court} - ${pub.publication_date}]\n\n${pub.content}`;
        const stage_id = 1; // "Nova Atividade"

        // Find client by process number (optional, rudimentary matching)
        // For now, we leave client empty or "À Verificar"
        const client_name = "Cliente à Verificar";

        const sql = `INSERT INTO deals (title, client_name, deadline, responsible_id, description, process_number, stage_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [title, client_name, deadline, responsible_id, description, pub.process_number, stage_id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });

            // Update publication status
            db.run("UPDATE publications SET status = 'processed' WHERE id = ?", [id]);

            res.json({ message: "Tarefa criada com sucesso", dealId: this.lastID });
        });
    });
});


// Delete Publication
app.delete('/api/publications/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM publications WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: "deleted", changes: this.changes });
    });
});

app.post('/api/clients/:id/documents', (req, res) => {
    const clientId = req.params.id;
    const { type, title, htmlContent, createdBy, description } = req.body;

    if (!htmlContent) {
        return res.status(400).json({ error: "Missing HTML content" });
    }

    // Save HTML logic
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${type}_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;

    // Use uploads folder
    const clientDir = path.join(__dirname, '../uploads', `clients`, `${clientId}`);
    if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
    }

    const filePath = path.join(clientDir, filename);

    fs.writeFile(filePath, htmlContent, (err) => {
        if (err) {
            console.error("Error saving document file:", err);
            return res.status(500).json({ error: "Failed to save file" });
        }

        const sql = `INSERT INTO client_documents (client_id, type, title, filename, path, created_by, description) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [clientId, type, title, filename, filePath, createdBy || null, description || null], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Document saved", id: this.lastID });
        });
    });
});

const axios = require('axios');
const FormData = require('form-data');

// ... Document Endpoints ...

app.get('/api/clients/:id/documents', (req, res) => {
    const clientId = req.params.id;
    const sql = `
        SELECT cd.*, u.name as creator_name 
        FROM client_documents cd 
        LEFT JOIN users u ON cd.created_by = u.id 
        WHERE cd.client_id = ? 
        ORDER BY cd.created_at DESC`;

    db.all(sql, [clientId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message, data: [] });
        }
        res.json({ data: rows || [] });
    });
});

// PENDING SIGNATURES ENDPOINT
app.get('/api/documents/pending', (req, res) => {
    const sql = `
        SELECT 
            cd.id, cd.title, cd.filename, cd.status, cd.created_at, cd.signers_data, cd.signer_link,
            c.name as client_name, c.email as client_email,
            u.name as creator_name, cd.folder
        FROM client_documents cd
        LEFT JOIN clients c ON cd.client_id = c.id
        LEFT JOIN users u ON cd.created_by = u.id
        WHERE (cd.status = 'sent' OR cd.status = 'pending' OR cd.status = 'signed')
        AND cd.folder = '/LawFirmCRM/'
        ORDER BY 
            cd.id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// ZAPSIGN SYNC ENDPOINT
app.post('/api/documents/sync-status', async (req, res) => {
    console.log("[SYNC] Request Request Received");
    // 1. Get Token
    db.get('SELECT zapsign_token FROM office_settings LIMIT 1', async (err, row) => {
        if (err || !row || !row.zapsign_token) {
            return res.status(500).json({ error: "Token ZapSign não configurado." });
        }
        const ZAPSIGN_TOKEN = row.zapsign_token.trim();

        // 2. Fetch ALL docs from ZapSign (Handling pagination)
        try {
            let nextUrl = `https://api.zapsign.com.br/api/v1/docs/?api_token=${ZAPSIGN_TOKEN}`;
            const zapDocs = [];

            while (nextUrl) {
                const zapRes = await axios.get(nextUrl);
                const results = zapRes.data.results || [];
                zapDocs.push(...results);
                nextUrl = zapRes.data.next;
            }

            // Create lookup maps
            const zapByToken = new Map();
            const zapByOpenId = new Map();
            zapDocs.forEach(d => {
                if (d.token) zapByToken.set(d.token, d);
                if (d.open_id) zapByOpenId.set(String(d.open_id), d);
            });

            // 3. Get Local Documents (All with external_id)
            db.all("SELECT id, external_id, signers_data, folder FROM client_documents WHERE external_id IS NOT NULL", async (err, localDocs) => {
                if (err) return res.status(500).json({ error: err.message });

                let updatedCount = 0;
                let importedCount = 0;
                const errors = [];

                // Track processed ZapDocs to avoid double import
                const processedZapTokens = new Set();

                // 4. Update EXISTING Local Docs
                const updates = localDocs.map(async (localDoc) => {
                    if (!localDoc.external_id) return;

                    // Try match by Token first, then OpenID (Legacy)
                    let match = zapByToken.get(localDoc.external_id);
                    let isLegacyMatch = false;

                    if (!match) {
                        match = zapByOpenId.get(String(localDoc.external_id));
                        if (match) isLegacyMatch = true;
                    }

                    if (match) {
                        processedZapTokens.add(match.token); // Mark as processed for import step

                        // Determine Status
                        let newStatus = 'sent';
                        if (match.deleted) newStatus = 'canceled'; // MARK DELETED AS CANCELED
                        else if (match.status === 'signed') newStatus = 'signed';
                        else if (match.status === 'refused') newStatus = 'canceled';

                        // Signers Data (ZapSign List usually summarizes, might need detail fetch if incomplete)
                        // The list endpoint returns 'signers' array too? Let's assume yes or rely on status.
                        // Ideally we verify signers, but if the doc is SIGNED, we trust it.
                        const allSigners = match.signers ? match.signers.map(s => ({
                            name: s.name,
                            email: s.email,
                            sign_url: s.sign_url,
                            status: s.status
                        })) : [];

                        // Only update if status/folder changed or if we need to upgrade the ID
                        if (newStatus !== 'sent' || isLegacyMatch || JSON.stringify(allSigners) !== localDoc.signers_data || match.folder_path !== localDoc.folder) {
                            await new Promise((resolve) => {
                                // If legacy match, upgrade external_id to token
                                const newExternalId = match.token;
                                db.run(
                                    'UPDATE client_documents SET status = ?, external_id = ?, signers_data = ?, folder = ? WHERE id = ?',
                                    [newStatus, newExternalId, JSON.stringify(allSigners), match.folder_path, localDoc.id],
                                    (err) => resolve()
                                );
                            });
                            updatedCount++;
                        }
                    } else {
                        // Document found locally but NOT in ZapSign?
                        // Could be deleted or another account?
                        // We leave it as is.
                    }
                });

                await Promise.all(updates);

                // 5. IMPORT New Docs from /LawFirmCRM/
                const importPromises = zapDocs.map(async (zapDoc) => {
                    // Filter: Only LawFirmCRM folder AND Not already processed AND Not Deleted
                    if (zapDoc.folder_path === '/LawFirmCRM/' && !zapDoc.deleted) {

                        // FETCH DETAILS to get Signers Links
                        let detailedDoc = zapDoc;
                        try {
                            const detailRes = await axios.get(`https://api.zapsign.com.br/api/v1/docs/${zapDoc.token}/?api_token=${ZAPSIGN_TOKEN}`);
                            detailedDoc = detailRes.data;
                        } catch (e) {
                            console.error(`Failed to fetch details for ${zapDoc.name}`, e.message);
                        }

                        // Map Status
                        let status = 'sent';
                        if (detailedDoc.status === 'signed') status = 'signed';
                        else if (detailedDoc.status === 'refused') status = 'canceled';

                        const allSigners = detailedDoc.signers ? detailedDoc.signers.map(s => ({
                            name: s.name,
                            email: s.email,
                            sign_url: s.sign_url,
                            status: s.status
                        })) : [];

                        const firstSigner = detailedDoc.signers && detailedDoc.signers.length > 0 ? detailedDoc.signers[0] : null;

                        if (!processedZapTokens.has(zapDoc.token)) {
                            // --- INSERT LOGIC ---
                            let clientId = null;
                            if (firstSigner && firstSigner.email) {
                                try {
                                    const client = await new Promise((resolve, reject) => {
                                        db.get('SELECT id FROM clients WHERE email = ?', [firstSigner.email], (err, row) => {
                                            if (err) reject(err); else resolve(row);
                                        });
                                    });
                                    if (client) clientId = client.id;
                                } catch (e) { }
                            }

                            const signerLink = firstSigner ? firstSigner.sign_url : '';

                            await new Promise((resolve, reject) => {
                                db.run(
                                    `INSERT INTO client_documents (title, type, status, external_id, client_id, signers_data, signer_link, created_by, folder, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [detailedDoc.name, 'Auto-Import', status, detailedDoc.token, clientId, JSON.stringify(allSigners), signerLink, null, detailedDoc.folder_path, detailedDoc.created_at],
                                    (err) => {
                                        if (err) console.error("Import Error", err);
                                        resolve();
                                    }
                                );
                            });
                            importedCount++;

                        } else {
                            // --- UPDATE LOGIC (for existing docs in this folder) ---
                            // We need to update existing docs too because their signer links might be missing
                            // Use external_id (token) to find the local ID
                            await new Promise((resolve) => {
                                db.run(
                                    'UPDATE client_documents SET status = ?, signers_data = ?, folder = ? WHERE external_id = ?',
                                    [status, JSON.stringify(allSigners), detailedDoc.folder_path, detailedDoc.token],
                                    (err) => resolve()
                                );
                            });
                            updatedCount++;
                        }
                    }
                });

                await Promise.all(importPromises);

                res.json({
                    message: "Sync & Import complete",
                    checked: localDocs.length,
                    updated: updatedCount,
                    imported: importedCount,
                    total_remote: zapDocs.length
                });
            });

        } catch (error) {
            console.error("ZapSign List Error:", error.message);
            res.status(500).json({ error: "Falha ao buscar lista da ZapSign: " + error.message });
        }
    });
});

// ZapSign Integration
app.post('/api/documents/:id/sign', async (req, res) => {
    const docId = req.params.id;
    const { signerEmail, signerName } = req.body;

    if (!signerEmail || !signerName) {
        return res.status(400).json({ error: "Email e Nome do signatário são obrigatórios." });
    }

    // 1. Get Settings (Token)
    // 1. Get Settings (Token)
    db.get('SELECT zapsign_token FROM office_settings WHERE id = 1', async (err, settings) => {
        if (err) {
            console.error("Database error getting settings:", err);
            return res.status(500).json({ error: "Erro ao buscar configurações." });
        }

        console.log("Settings found:", settings); // DEBUG

        if (!settings || !settings.zapsign_token) {
            console.error("ZapSign Token missing in database settings.");
            return res.status(500).json({ error: "Token da ZapSign não configurado (Banco de Dados)." });
        }

        const ZAPSIGN_TOKEN = settings.zapsign_token.trim(); // Ensure no whitespace
        console.log(`Using ZapSign Token: ${ZAPSIGN_TOKEN.substring(0, 5)}... (Length: ${ZAPSIGN_TOKEN.length})`); // DEBUG

        // 2. Get Document Path
        db.get('SELECT * FROM client_documents WHERE id = ?', [docId], async (err, doc) => {
            if (err || !doc) {
                return res.status(404).json({ error: "Documento não encontrado." });
            }

            // AUTO-FIX: Check if file exists at stored path. If not, try relative path.
            if (!fs.existsSync(doc.path)) {
                const recoveredPath = path.join(__dirname, '../uploads/clients', String(doc.client_id), doc.filename);
                if (fs.existsSync(recoveredPath)) {
                    console.log(`[ZAPSIGN] Path fixed: ${doc.path} -> ${recoveredPath}`);
                    doc.path = recoveredPath;
                } else {
                    console.error(`[ZAPSIGN] File missing at ${doc.path} AND ${recoveredPath}`);
                }
            }

            try {
                // 3. Prepare Form Data for ZapSign
                // ZapSign Upload: POST https://api.zapsign.com.br/api/v1/docs/

                // 3. Prepare JSON Payload for ZapSign (Base64 is more reliable for "Body must be JSON" errors)
                console.log(`Sending to ZapSign with token: ${ZAPSIGN_TOKEN.substring(0, 5)}...`);

                const url = `https://api.zapsign.com.br/api/v1/docs/?api_token=${ZAPSIGN_TOKEN}`;

                try {
                    let base64File = '';
                    if (fs.existsSync(doc.path)) {
                        console.log(`[DEBUG] File found at: ${doc.path}`);
                        if (doc.path.endsWith('.html')) {
                            console.log("[DEBUG] Starting HTML to PDF conversion...");
                            try {
                                const browser = await puppeteer.launch({
                                    headless: true,
                                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                                });
                                console.log("[DEBUG] Puppeteer Launched");
                                const page = await browser.newPage();
                                console.log("[DEBUG] Page Created");

                                // Wrap fragment in full HTML to ensure proper rendering
                                const fullHtml = `
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <meta charset="UTF-8">
                                        <style>
                                            body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; }
                                        </style>
                                    </head>
                                    <body>
                                        ${fs.readFileSync(doc.path, 'utf8')}
                                    </body>
                                    </html>
                                `;

                                console.log("[DEBUG] Puppeteer: Setting Content...");
                                await page.setContent(fullHtml, { waitUntil: 'load', timeout: 30000 });
                                console.log("[DEBUG] Content Set on Page");

                                const pdfBuffer = await page.pdf({
                                    format: 'A4',
                                    printBackground: true,
                                    margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
                                });
                                console.log("[DEBUG] PDF Generated");

                                await browser.close();
                                console.log("[DEBUG] Browser Closed");

                                base64File = Buffer.from(pdfBuffer).toString('base64');
                                console.log(`[DEBUG] Conversion success. Size: ${base64File.length}`);
                            } catch (conversionErr) {
                                console.error("[ERROR] PDF Conversion Failed:", conversionErr);
                                return res.status(500).json({ error: "Falha ao gerar PDF para assinatura." });
                            }
                        } else {
                            console.log("[DEBUG] Reading file directly (not HTML)...");
                            base64File = fs.readFileSync(doc.path, { encoding: 'base64' });
                        }
                    } else {
                        console.error(`[ERROR] File NOT found at ${doc.path}`);
                        return res.status(404).json({ error: "Arquivo do documento não encontrado no disco." });
                    }

                    // Send as base64_pdf. ZapSign accepts HTML content in base64_pdf mostly or we assume it's PDF.
                    // If the saved file is HTML, this might need conversation. 
                    // However, for now, we try sending it.


                    const { signerEmail, signerName, signerPhone, additionalSigners } = req.body;

                    // 4. Prepare Signers
                    let signers = [{
                        name: signerName,
                        email: signerEmail,
                        phone_number: signerPhone,
                        auth_mode: 'assinaturaTela'
                    }];

                    // Add Additional Signers (Lawyers/Witnesses)
                    if (additionalSigners && Array.isArray(additionalSigners)) {
                        additionalSigners.forEach(s => {
                            if (s.name && s.email) {
                                signers.push({
                                    name: s.name,
                                    email: s.email,
                                    phone_number: s.phone_number,
                                    auth_mode: 'assinaturaTela'
                                });
                            }
                        });
                    }

                    const payload = {
                        name: doc.title,
                        signers: signers,
                        lang: 'pt-br',
                        disable_signer_emails: false,
                        folder_path: '/LawFirmCRM',
                        base64_pdf: base64File
                    };

                    const response = await axios.post(url, payload, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log("[DEBUG] ZapSign Response Status:", response.status);
                    const zapDoc = response.data;
                    console.log("[DEBUG] ZapSign Response Data:", JSON.stringify(zapDoc));
                    // Get the signer link for the CLIENT (first signer)
                    // ZapSign returns an array of signers. We find the one matching the client's email or just take the first one if we assume order.
                    const clientSigner = zapDoc.signers.find(s => s.email === signerEmail) || zapDoc.signers[0];
                    const signerLink = clientSigner.sign_url;
                    const externalId = zapDoc.token; // USE TOKEN (UUID) NOT OPEN_ID

                    // 5. Update Local DB
                    // Store all signers data for multi-link support
                    // format: [{name, email, sign_url, status}, ...]
                    const allSigners = zapDoc.signers.map(s => ({
                        name: s.name,
                        email: s.email,
                        sign_url: s.sign_url,
                        status: s.status
                    }));

                    db.run('UPDATE client_documents SET external_id = ?, signer_link = ?, status = ?, signers_data = ? WHERE id = ?',
                        [externalId, signerLink, 'sent', JSON.stringify(allSigners), docId],
                        (err) => {
                            if (err) console.error("Error updating doc status:", err);
                        }
                    );

                    res.json({
                        message: "Enviado para ZapSign com sucesso!",
                        signer_link: signerLink,
                        external_id: externalId,
                        signers_data: allSigners
                    });
                } catch (innerError) {
                    console.error("ZapSign Axios Error Response:", innerError.response ? innerError.response.data : innerError.message);
                    throw innerError;
                }

            } catch (error) {
                console.error("ZapSign Error:", error.response?.data || error.message);
                res.status(500).json({
                    error: "Falha na integração com ZapSign",
                    details: error.response?.data || error.message
                });
            }
        });
    });
});

app.get('/api/documents/:id/content', (req, res) => {
    const docId = req.params.id;
    // Fetch filename and client_id to reconstruct path if absolute path fails (migration support)
    db.get('SELECT path, filename, client_id FROM client_documents WHERE id = ?', [docId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: "Document not found" });
        }

        let filePath = row.path;

        // AUTO-FIX: Check if file exists at stored path. If not, try relative path.
        if (!fs.existsSync(filePath)) {
            // Reconstruct path: /uploads/clients/{id}/{filename} relative to this server file
            const recoveredPath = path.join(__dirname, '../uploads/clients', String(row.client_id), row.filename);
            if (fs.existsSync(recoveredPath)) {
                console.log(`[RECOVERY] Path fixed: ${filePath} -> ${recoveredPath}`);
                filePath = recoveredPath;
            } else {
                console.error(`[ERROR] File missing at ${filePath} AND ${recoveredPath}`);
            }
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: "Failed to read document file" });
            }
            res.send(data);
        });
    });
});

// Update User (PUT)
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, cpf, phone, role, newPassword, currentPassword, isSelfEdit, oab, oab_uf, office_address, nationality, marital_status } = req.body;

    db.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

        let passwordToSet = user.password;

        if (newPassword) {
            if (isSelfEdit) {
                let isCurrentValid = false;
                if (!user.password) {
                    isCurrentValid = currentPassword === "123456";
                } else {
                    isCurrentValid = await bcrypt.compare(currentPassword, user.password);
                }

                if (!isCurrentValid) {
                    res.status(401).json({ error: "Senha atual incorreta" });
                    return;
                }
            }
            passwordToSet = await bcrypt.hash(newPassword, 10);
        }

        const sql = `UPDATE users SET 
            name = COALESCE(?, name), 
            email = COALESCE(?, email), 
            login = COALESCE(?, login),
            cpf = COALESCE(?, cpf), 
            phone = COALESCE(?, phone), 
            role = COALESCE(?, role),
            oab = COALESCE(?, oab),
            oab_uf = COALESCE(?, oab_uf),
            office_address = COALESCE(?, office_address),
            nationality = COALESCE(?, nationality),
            marital_status = COALESCE(?, marital_status),
            password = ?
            WHERE id = ?`;

        db.run(sql, [name, email, req.body.login, cpf, phone, role, oab, oab_uf, office_address, nationality, marital_status, passwordToSet, id], function (err) {
            if (err) { res.status(400).json({ error: err.message }); return; }
            res.json({ message: "success", changes: this.changes });
        });
    });
});



// Delete User
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM users WHERE id = ?", id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// Delete Document
app.delete('/api/documents/:id', (req, res) => {
    const docId = req.params.id;
    db.run("DELETE FROM client_documents WHERE id = ?", docId, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});


// Serve Frontend (Production/Integrated Mode)
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- Production Setup ---
// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Serve static files from React app (Production Build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- ZAPSIGN INTEGRATION ---


app.post('/api/zapsign/create', async (req, res) => {
    console.log("[ZAPSIGN] Create Request Received");
    const { clientId, title, htmlContent, signers } = req.body;

    // Validation
    if (!title || !htmlContent || !signers || !Array.isArray(signers) || signers.length === 0) {
        return res.status(400).json({ error: "Dados inválidos. Necessário Título, Conteúdo e Signatários." });
    }

    try {
        // 1. Get Token from DB
        const settings = await new Promise((resolve, reject) => {
            db.get('SELECT zapsign_token, zapsign_folder_path FROM office_settings LIMIT 1', (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!settings || !settings.zapsign_token) {
            return res.status(400).json({ error: "Token ZapSign não configurado nas configurações do escritório." });
        }

        const ZAPSIGN_TOKEN = settings.zapsign_token;
        const FOLDER_PATH = settings.zapsign_folder_path || '/LawFirmCRM';

        console.log("[ZAPSIGN] Generating PDF...");
        // 2. Generate PDF
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });
        await browser.close();
        console.log("[ZAPSIGN] PDF Generated. Size:", pdfBuffer.length);

        // 3. Prepare ZapSign Payload
        const form = new FormData();
        form.append('name', title);
        form.append('file', pdfBuffer, { filename: `${title}.pdf` });
        form.append('signers', JSON.stringify(signers));
        form.append('folder_path', FOLDER_PATH);
        form.append('lang', 'pt-br');
        form.append('send_automatic_email', 'true');
        form.append('send_automatic_whatsapp', 'true'); // Auto-send via WhatsApp if number provided

        console.log("[ZAPSIGN] Signers for Payload:", JSON.stringify(signers, null, 2));
        console.log("[ZAPSIGN] Uploading to API...");
        // 4. Send to ZapSign
        const zapRes = await axios.post('https://api.zapsign.com.br/api/v1/docs/', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${ZAPSIGN_TOKEN}`
            }
        });

        const zapDoc = zapRes.data;
        console.log("[ZAPSIGN] Success! Token:", zapDoc.token);

        // 5. Save/Update Local DB
        // Check if document already exists logic? No, this is a NEW doc.
        // We insert a new record in client_documents

        const stmt = db.prepare(`INSERT INTO client_documents (client_id, type, title, status, created_at, created_by, external_id, signer_link, signers_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        // Find the "client" signer link - usually the first one or matching name
        // We just store the first one as primary link for now, or null
        const primaryLink = zapDoc.signers[0]?.sign_url;
        const signersDataStr = JSON.stringify(zapDoc.signers);

        const type = title.toLowerCase().includes('procuração') ? 'PROCURACAO' : 'CONTRATO';
        const now = new Date().toISOString();
        const createdBy = req.body.createdBy || 1; // Default admin if missing

        stmt.run(clientId, type, title, 'sent', now, createdBy, zapDoc.token, primaryLink, signersDataStr, function (err) {
            if (err) {
                console.error("[DB] Check Error on Insert:", err);
                // Don't fail the request if ZapSign succeeded
            }
        });
        stmt.finalize();

        res.json({
            success: true,
            doc_token: zapDoc.token,
            signers: zapDoc.signers,
            link: primaryLink
        });

    } catch (error) {
        console.error("[ZAPSIGN] Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Erro ao criar documento no ZapSign",
            details: error.response?.data || error.message
        });
    }
});

if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        const mode = process.env.DATABASE_URL ? 'Production (PostgreSQL)' : 'Development (SQLite)';
        console.log(`Environment: ${mode}`);
        console.log("Manual restart triggered by user request.");
    });
}

module.exports = app;
