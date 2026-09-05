/**
 * Central DB configuration for the PeoplePay360 database module.
 *
 * The database is PostgreSQL, running as a local server. Connection
 * details are read from environment variables (see .env.example),
 * which lets every teammate point at their own local Postgres install
 * without changing code, and lets feature/backend swap in its own
 * connection pool using the exact same env vars.
 *
 * A minimal .env loader is included below (no `dotenv` dependency
 * needed) so `node migrate.js` etc. work out of the box after copying
 * .env.example to .env.
 */
const fs = require("fs");
const path = require("path");

function loadDotEnv() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

loadDotEnv();

const PG_CONFIG = {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "peoplepay360",
};

const SCHEMA_PATH = path.join(__dirname, "schema.sql");

module.exports = { PG_CONFIG, SCHEMA_PATH };
