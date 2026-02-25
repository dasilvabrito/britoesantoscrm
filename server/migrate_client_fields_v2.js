const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Running Migration V2...');

    const columns = [
        "ADD COLUMN gender TEXT",
        "ADD COLUMN legal_representative_name TEXT",
        "ADD COLUMN legal_representative_cpf TEXT",
        "ADD COLUMN is_emancipated INTEGER DEFAULT 0"
    ];

    columns.forEach(col => {
        db.run(`ALTER TABLE clients ${col}`, (err) => {
            if (err) {
                // Ignore duplicate column errors if re-run
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column already exists (skipped): ${col}`);
                } else {
                    console.error(`Error adding column: ${col}`, err.message);
                }
            } else {
                console.log(`Added column: ${col}`);
            }
        });
    });
});

db.close(() => {
    console.log('Migration V2 finished.');
});
