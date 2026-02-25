const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Adding 'folder' column to client_documents...");
    db.run("ALTER TABLE client_documents ADD COLUMN folder TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("Column 'folder' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'folder' added successfully.");
        }
    });
});

db.close();
