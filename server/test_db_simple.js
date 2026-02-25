const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
console.log("Testing DB at:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite.');
});

db.serialize(() => {
    const start = Date.now();
    db.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
        if (err) {
            console.error("Query Error:", err);
        } else {
            console.log("Query Success! Count:", row.count);
            console.log("Time taken:", Date.now() - start, "ms");
        }
    });
});
