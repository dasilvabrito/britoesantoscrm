const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

const columnsToAdd = [
    { name: 'rg_issuer', type: 'TEXT' },
    { name: 'rg_uf', type: 'TEXT' },
    { name: 'birth_date', type: 'TEXT' }
];

db.serialize(() => {
    columnsToAdd.forEach(col => {
        const sql = `ALTER TABLE clients ADD COLUMN ${col.name} ${col.type}`;
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log(`Column '${col.name}' already exists.`);
                } else {
                    console.error(`Error adding '${col.name}':`, err.message);
                }
            } else {
                console.log(`Column '${col.name}' added successfully.`);
            }
        });
    });
});

db.close();
