
const db = require('./db');

console.log('[CLEANUP] Starting cleanup of ZapSign documents...');

// Delete all documents that have an external_id (ZapSign) or are Auto-Imported
const sql = `DELETE FROM client_documents WHERE external_id IS NOT NULL OR type = 'Auto-Import'`;

db.run(sql, [], function (err) {
    if (err) {
        console.error('[CLEANUP] Error:', err.message);
        process.exit(1);
    }
    console.log(`[CLEANUP] Success. Deleted ${this.changes} documents.`);

    // Allow time for DB operations to flush (sqlite3 is async)
    setTimeout(() => {
        db.close();
        process.exit(0);
    }, 1000);
});
