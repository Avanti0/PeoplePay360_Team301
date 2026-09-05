/**
 * Applies seed.sql (plain SQL, see that file's header) to the local
 * PostgreSQL database so feature/backend and feature/frontend can
 * develop and demo against real, dynamic records instead of static
 * JSON fixtures.
 *
 * Usage: npm run seed   (run migrate first, or use `npm run reset`)
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { PG_CONFIG } = require("./config");
const { describeError } = require("./errors");

const SEED_PATH = path.join(__dirname, "seed.sql");

async function seed() {
    const sql = fs.readFileSync(SEED_PATH, "utf8");
    const client = new Client(PG_CONFIG);
    await client.connect();
    try {
        await client.query(sql);
        console.log(`Seed data inserted successfully into database "${PG_CONFIG.database}"`);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    seed().catch((err) => {
        console.error("Seeding failed:", describeError(err));
        process.exit(1);
    });
}

module.exports = { seed };
