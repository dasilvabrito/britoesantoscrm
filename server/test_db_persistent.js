const db = require('./db');
console.log("Required db.js");

setTimeout(() => {
    console.log("Attempting query...");
    db.all("SELECT * FROM client_documents LIMIT 1", [], (err, rows) => {
        if (err) {
            console.error("Query Error:", err);
        } else {
            console.log("Documents found:", rows.length);
            if (rows.length > 0) console.log("First Doc:", rows[0]);
        }
    });
}, 2000); // Wait 2s for init to potentially settle
