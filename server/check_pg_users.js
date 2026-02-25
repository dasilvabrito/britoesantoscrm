require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function checkUsers() {
    try {
        const res = await pool.query("SELECT id, name, email, role, login, password FROM users");
        console.log("Users in PostgreSQL:");
        res.rows.forEach(user => {
            console.log(`- ID: ${user.id}, Name: ${user.name}, Login: ${user.login}, Email: ${user.email}, Role: ${user.role}`);
        });
        await pool.end();
    } catch (err) {
        console.error("Error querying PostgreSQL:", err);
        process.exit(1);
    }
}

checkUsers();
