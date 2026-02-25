module.exports = {
    apps: [
        {
            name: "crm-brito-santos",
            script: "./server/index.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            exec_mode: 'fork', // CRITICAL: SQLite requires fork mode, not cluster
            env: {
                NODE_ENV: "production",
                PORT: 3000, // Rodar na porta 80 para não precisar digitar :3000 (Precisa de Admin)
                // Se der erro de permissão na porta 80, mude para 3000
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 3000
            }
        }
    ]
};
