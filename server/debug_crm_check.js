const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
console.log(`Checking DB at: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.error("DB File does NOT exist!");
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Error opening DB:", err.message);
        return;
    }
    console.log("Connected to DB successfully.");
});

db.serialize(() => {
    // 1. Check Clients count (Dashboard Q1)
    db.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
        if (err) console.error("Error reading clients:", err);
        else console.log("Clients Count:", row.count);
    });

    // 2. Check Settings (ZapSign)
    db.get("SELECT * FROM office_settings WHERE id = 1", (err, row) => {
        if (err) {
            console.error("Error reading settings:", err);
        } else {
            console.log("Settings Found:", row ? "Yes" : "No");
            if (row) {
                console.log("ZapSign Token Present:", !!row.zapsign_token);
                if (row.zapsign_token) {
                    console.log("ZapSign Token Length:", row.zapsign_token.length);
                    // Print first/last chars to verify validity without exposing full token if sensitive
                    console.log("ZapSign Token Start:", row.zapsign_token.substring(0, 4));
                }
            }
        }
    });
});

db.close((err) => {
    if (err) console.error("Error closing DB:", err.message);
    else console.log("DB Connection closed.");
});
