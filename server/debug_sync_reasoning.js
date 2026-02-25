const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

async function debugSync() {
    console.log("--- Starting Sync Debug ---");

    // 1. Get Token
    db.get('SELECT zapsign_token FROM office_settings LIMIT 1', async (err, row) => {
        if (err || !row) return console.error("No token or DB error");
        const ZAPSIGN_TOKEN = row.zapsign_token.trim();
        console.log(`Token: ${ZAPSIGN_TOKEN.substring(0, 5)}...`);

        // 2. Fetch ZapSign Docs
        try {
            console.log("Fetching ZapSign Docs (All Pages)...");
            let nextUrl = `https://api.zapsign.com.br/api/v1/docs/?api_token=${ZAPSIGN_TOKEN}`;
            const zapDocs = [];

            while (nextUrl) {
                console.log(`Fetching page: ${nextUrl}`);
                const zapRes = await axios.get(nextUrl);
                const results = zapRes.data.results || [];
                zapDocs.push(...results);
                nextUrl = zapRes.data.next;
            }
            console.log(`Total ZapSign Docs Fetched: ${zapDocs.length}`);

            const folders = [...new Set(zapDocs.map(d => d.folder_path))];
            console.log("Unique Folder Paths found:", folders);

            // Check specific doc structure for import
            if (zapDocs.length > 0) {
                console.log("Example Doc for Import:", JSON.stringify(zapDocs[0], null, 2));
            }

            // Maps
            const zapByToken = new Map();
            const zapByOpenId = new Map();
            zapDocs.forEach(d => {
                if (d.token) zapByToken.set(d.token, d);
                if (d.open_id) zapByOpenId.set(String(d.open_id), d);
            });

            // 3. Get Local Docs
            db.all("SELECT id, title, external_id, status FROM client_documents WHERE status = 'sent'", async (err, localDocs) => {
                if (err) return console.error("DB Error:", err);
                console.log(`Local 'sent' docs: ${localDocs.length}`);

                localDocs.forEach(doc => {
                    const extId = String(doc.external_id);
                    console.log(`\nChecking Local Doc ID: ${doc.id} | ExtID: ${extId} | Title: ${doc.title}`);

                    let match = zapByToken.get(extId);
                    let source = "Token";

                    if (!match) {
                        match = zapByOpenId.get(extId);
                        source = "OpenID";
                    }

                    if (match) {
                        console.log(`   MATCH FOUND via ${source}!`);
                        console.log(`   ZapDoc Name: ${match.name}`);
                        console.log(`   ZapDoc Status: ${match.status}`);

                        let newStatus = 'sent';
                        if (match.status === 'signed') newStatus = 'signed';
                        else if (match.status === 'refused') newStatus = 'canceled';

                        console.log(`   Logic: Local Status '${doc.status}' -> New Status '${newStatus}'`);

                        if (newStatus !== 'sent') {
                            console.log("   ACTION: WOULD UPDATE STATUS");
                        } else {
                            console.log("   ACTION: NO CHANGE NEEDED (Still Em Curso)");
                        }
                    } else {
                        console.log("   NO MATCH FOUND in ZapSign list.");
                    }
                });
            });

        } catch (e) {
            console.error("ZapSign API Error:", e.message);
        }
    });
}

debugSync();
