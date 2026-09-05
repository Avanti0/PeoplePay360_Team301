/**
 * Applies schema.sql to the local PostgreSQL database named by
 * PGDATABASE (see .env.example / config.js), creating that database
 * first if it does not already exist.
 *
 * Requires a running local PostgreSQL server (see database/README.md
 * for install/setup instructions).
 *
 * Usage: npm run migrate
 */
const fs = require("fs");
const { Client } = require("pg");
const { PG_CONFIG, SCHEMA_PATH } = require("./config");

async function ensureDatabaseExists() {
    // Connect to the always-present "postgres" maintenance database to
    // check for / create the target database, since you cannot CREATE
    // DATABASE while connected to the database you're creating.
    const admin = new Client({ ...PG_CONFIG, database: "postgres" });
    await admin.connect();
    try {
        const { rowCount } = await admin.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [PG_CONFIG.database]
        );
        if (rowCount === 0) {
            // Database names cannot be parameterized; PG_CONFIG.database
            // comes from local env config (.env), not user input.
            await admin.query(`CREATE DATABASE "${PG_CONFIG.database}"`);
            console.log(`Created database "${PG_CONFIG.database}"`);
        }
    } finally {
        await admin.end();
    }
}

async function migrate() {
    await ensureDatabaseExists();

    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    const client = new Client(PG_CONFIG);
    await client.connect();
    try {
        await client.query(schema);
        console.log(`Schema applied successfully to database "${PG_CONFIG.database}"`);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    migrate().catch((err) => {
        console.error("Migration failed:", err.message);
        process.exit(1);
    });
}

module.exports = { migrate };
