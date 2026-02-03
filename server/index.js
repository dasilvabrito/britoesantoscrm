const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Dashboard Stats
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {};

    // Use Promise.all for parallel queries
    const q1 = new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
            if (err) reject(err); else resolve({ type: 'clients', val: row.count });
        });
    });

    const q2 = new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count, SUM(value) as total_value FROM deals", (err, row) => {
            if (err) reject(err); else resolve({ type: 'deals', val: row.count, total_value: row.total_value });
        });
    });

    const q3 = new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM publications WHERE status = 'new'", (err, row) => {
            if (err) reject(err); else resolve({ type: 'publications', val: row.count });
        });
    });

    const q4 = new Promise((resolve, reject) => {
        db.all("SELECT s.name, COUNT(d.id) as count FROM stages s LEFT JOIN deals d ON s.id = d.stage_id GROUP BY s.id", (err, rows) => {
            if (err) reject(err); else resolve({ type: 'stages', val: rows });
        });
    });

    Promise.all([q1, q2, q3, q4]).then(results => {
        const data = {};
        results.forEach(r => {
            if (r.type === 'clients') data.totalClients = r.val;
            if (r.type === 'deals') { data.totalDeals = r.val; data.totalValue = r.total_value || 0; }
            if (r.type === 'publications') data.pendingPublications = r.val;
            if (r.type === 'stages') data.dealsPerStage = r.val;
        });
        res.json({ data });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
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

    db.run(`UPDATE deals SET stage_id = ? WHERE id = ?`, [stage_id, id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ message: "updated", changes: this.changes });
    });
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

// Create a new client
app.post('/api/clients', (req, res) => {
    const { name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email } = req.body;

    // Construct address for backward compatibility if needed, but we now have specific fields
    const address = req.body.address || `${street}, ${number} - ${neighborhood}, ${city}/${state}`;

    const sql = `INSERT INTO clients (name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, address, phone, email) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, address, phone, email];

    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID, ...req.body },
            "id": this.lastID
        });
    });
});

// Update a client
app.put('/api/clients/:id', (req, res) => {
    const { name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, phone, email } = req.body;
    const { id } = req.params;

    const address = req.body.address || `${street}, ${number} - ${neighborhood}, ${city}/${state}`;

    const sql = `UPDATE clients SET name = ?, nationality = ?, marital_status = ?, profession = ?, rg = ?, cpf = ?, street = ?, number = ?, neighborhood = ?, city = ?, state = ?, zip = ?, address = ?, phone = ?, email = ? WHERE id = ?`;
    const params = [name, nationality, marital_status, profession, rg, cpf, street, number, neighborhood, city, state, zip, address, phone, email, id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id, ...req.body },
            "changes": this.changes
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

// Login
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    db.get('SELECT * FROM users WHERE login = ?', [login], async (err, user) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!user) { res.status(401).json({ error: "Usuário não encontrado" }); return; }

        let isValid = false;
        if (!user.password) {
            isValid = password === "123456";
        } else {
            isValid = await bcrypt.compare(password, user.password);
        }

        if (!isValid) { res.status(401).json({ error: "Senha incorreta" }); return; }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ message: "success", data: userWithoutPassword });
    });
});

// Create User
app.post('/api/users', async (req, res) => {
    const { name, email, role, cpf, phone, oab, oab_uf, office_address, nationality, marital_status } = req.body;

    const parts = name.trim().toLowerCase().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    const loginOption1 = firstName;
    const loginOption2 = lastName ? `${firstName}.${lastName}` : firstName;

    const hashedPassword = await bcrypt.hash("123456", 10);

    db.get('SELECT id FROM users WHERE login = ?', [loginOption1], (err, row) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }

        let finalLogin = loginOption1;
        if (row) {
            if (loginOption2 !== loginOption1) {
                db.get('SELECT id FROM users WHERE login = ?', [loginOption2], (err2, row2) => {
                    if (err2) { res.status(400).json({ "error": err2.message }); return; }
                    if (row2) {
                        finalLogin = `${firstName}.${lastName || 'user'}.${Date.now().toString().slice(-4)}`;
                    } else {
                        finalLogin = loginOption2;
                    }
                    insertUser(finalLogin, hashedPassword);
                });
            } else {
                finalLogin = `${firstName}.${Date.now().toString().slice(-4)}`;
                insertUser(finalLogin, hashedPassword);
            }
        } else {
            insertUser(finalLogin, hashedPassword);
        }
    });

    function insertUser(login, password) {
        const sql = "INSERT INTO users (name, email, role, cpf, phone, oab, oab_uf, office_address, nationality, marital_status, login, password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
        db.run(sql, [name, email, role, cpf, phone, oab, oab_uf, office_address, nationality, marital_status, login, password], function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.json({
                "message": "success",
                "data": { id: this.lastID, name, email, role, cpf, phone, oab, oab_uf, office_address, nationality, marital_status, login }
            });
        });
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
            const insertStmt = db.prepare(`
                INSERT INTO publications (external_id, content, process_number, publication_date, court, status) 
                VALUES (?, ?, ?, ?, ?, 'new')
                ON CONFLICT(external_id) DO UPDATE SET status = status
            `);

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                results.forEach(pub => {
                    insertStmt.run(pub.id, pub.content, pub.process_number, pub.publication_date, pub.court);
                    savedCount++;
                });
                db.run("COMMIT");
            });
            insertStmt.finalize();

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

            try {
                // 3. Prepare Form Data for ZapSign
                // ZapSign Upload: POST https://api.zapsign.com.br/api/v1/docs/

                // 3. Prepare JSON Payload for ZapSign (Base64 is more reliable for "Body must be JSON" errors)
                console.log(`Sending to ZapSign with token: ${ZAPSIGN_TOKEN.substring(0, 5)}...`);

                const url = `https://api.zapsign.com.br/api/v1/docs/?api_token=${ZAPSIGN_TOKEN}`;

                try {
                    let base64File = '';
                    if (fs.existsSync(doc.path)) {
                        if (doc.path.endsWith('.html')) {
                            console.log("Convertendo HTML para PDF...");
                            try {
                                const browser = await puppeteer.launch({
                                    headless: true,
                                    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Safer for server environments
                                });
                                const page = await browser.newPage();

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

                                await page.setContent(fullHtml, { waitUntil: 'load' }); // 'load' is often faster/sufficient for simple HTML

                                const pdfBuffer = await page.pdf({
                                    format: 'A4',
                                    printBackground: true,
                                    margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
                                });

                                await browser.close();
                                base64File = Buffer.from(pdfBuffer).toString('base64');
                                console.log(`Conversão concluída. Tamanho: ${base64File.length}. Header: ${base64File.substring(0, 15)}...`);
                            } catch (conversionErr) {
                                console.error("Erro na conversão PDF:", conversionErr);
                                return res.status(500).json({ error: "Falha ao gerar PDF para assinatura." });
                            }
                        } else {
                            base64File = fs.readFileSync(doc.path, { encoding: 'base64' });
                        }
                    } else {
                        return res.status(404).json({ error: "Arquivo do documento não encontrado no disco." });
                    }

                    // Send as base64_pdf. ZapSign accepts HTML content in base64_pdf mostly or we assume it's PDF.
                    // If the saved file is HTML, this might need conversation. 
                    // However, for now, we try sending it.


                    // 4. Prepare Signers
                    let signers = [{
                        name: signerName,
                        email: signerEmail,
                        auth_mode: 'assinaturaTela'
                    }];

                    // Add Additional Signers (Lawyers/Witnesses)
                    if (req.body.additionalSigners && Array.isArray(req.body.additionalSigners)) {
                        req.body.additionalSigners.forEach(s => {
                            if (s.name && s.email) {
                                signers.push({
                                    name: s.name,
                                    email: s.email,
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

                    const zapDoc = response.data;
                    // Get the signer link for the CLIENT (first signer)
                    // ZapSign returns an array of signers. We find the one matching the client's email or just take the first one if we assume order.
                    const clientSigner = zapDoc.signers.find(s => s.email === signerEmail) || zapDoc.signers[0];
                    const signerLink = clientSigner.sign_url;
                    const externalId = zapDoc.open_id;

                    // 5. Update Local DB
                    db.run('UPDATE client_documents SET external_id = ?, signer_link = ?, status = ? WHERE id = ?',
                        [externalId, signerLink, 'sent', docId],
                        (err) => {
                            if (err) console.error("Error updating doc status:", err);
                        }
                    );

                    res.json({
                        message: "Enviado para ZapSign com sucesso!",
                        signer_link: signerLink,
                        external_id: externalId
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
    db.get('SELECT path FROM client_documents WHERE id = ?', [docId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: "Document not found" });
        }

        fs.readFile(row.path, 'utf8', (err, data) => {
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

        db.run(sql, [name, email, cpf, phone, role, oab, oab_uf, office_address, nationality, marital_status, passwordToSet, id], function (err) {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
