const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

async function testUUID() {
    db.get('SELECT zapsign_token FROM office_settings LIMIT 1', async (err, row) => {
        if (err || !row) return console.error("No token");
        const token = row.zapsign_token;
        const docToken = '5b45284a-cfa2-4e57-9f83-6e3b82412922'; // From previous list

        console.log(`Testing with API Token: ${token.substring(0, 5)}...`);

        try {
            console.log(`\n--- Testing with Doc Token: ${docToken} ---`);
            const url = `https://api.zapsign.com.br/api/v1/docs/${docToken}/?api_token=${token}`;
            const res = await axios.get(url);
            console.log("Status:", res.status);
            console.log("Name:", res.data.name);
            console.log("StatusStr:", res.data.status);
        } catch (e) {
            console.log("Failed:", e.message);
        }
    });
}

testUUID();
