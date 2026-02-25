const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../database/crm.sqlite');
const db = new sqlite3.Database(dbPath);

const newPassword = '123456';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(newPassword, salt);

db.run(`UPDATE users SET password = ? WHERE login = 'willian'`, [hash], function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
    console.log(`Password for 'willian' reset to '${newPassword}'`);

    // Also reset admin just in case
    db.run(`UPDATE users SET password = ? WHERE login = 'admin'`, [hash], function (err) {
        if (!err) console.log(`Password for 'admin' also reset to '${newPassword}'`);
        db.close();
    });
});
