const db = require('./db');
console.log("Applying Migration...");

db.run(`ALTER TABLE client_documents ADD COLUMN signers_data TEXT`, [], (err) => {
    if (err) {
        if (err.message.includes("duplicate column name")) {
            console.log("Column already exists.");
        } else {
            console.error("Migration Failed:", err);
        }
    } else {
        console.log("Migration Success: 'signers_data' column added.");
    }
});
