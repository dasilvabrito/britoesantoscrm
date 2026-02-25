const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

async function checkFolder() {
    db.get('SELECT zapsign_token FROM office_settings LIMIT 1', async (err, row) => {
        if (err || !row) return console.error("No token");
        const ZAPSIGN_TOKEN = row.zapsign_token.trim();

        try {
            console.log("Fetching ALL ZapSign Docs...");
            let nextUrl = `https://api.zapsign.com.br/api/v1/docs/?api_token=${ZAPSIGN_TOKEN}`;
            const zapDocs = [];

            while (nextUrl) {
                const zapRes = await axios.get(nextUrl);
                const results = zapRes.data.results || [];
                zapDocs.push(...results);
                nextUrl = zapRes.data.next;
            }

            const targetDoc = zapDocs.find(d => d.name.includes('Alan Aderson'));

            if (targetDoc) {
                console.log("\n--- TARGET DOCUMENT FOUND ---");
                console.log(`Name: ${targetDoc.name}`);
                console.log(`Token: ${targetDoc.token}`);
                console.log(`Signers Count: ${targetDoc.signers ? targetDoc.signers.length : 0}`);

                if (targetDoc.signers) {
                    targetDoc.signers.forEach((s, i) => {
                        console.log(`\n[Signer ${i + 1}]`);
                        console.log(`  Name: ${s.name}`);
                        console.log(`  Status: ${s.status}`);
                        console.log(`  Link: ${s.sign_url}`); // Critical check
                    });
                }
            } else {
                console.log("Target document not found in list.");
            }

        } catch (e) {
            console.error(e);
        }
    });
}

checkFolder();
