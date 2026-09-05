/**
 * Convenience script for local development: re-applies schema.sql
 * (which drops and recreates every table/type) then re-runs seed.js
 * against the local PostgreSQL database.
 *
 * Usage: npm run reset
 */
const { migrate } = require("./migrate");
const { seed } = require("./seed");
const { describeError } = require("./errors");

async function reset() {
    await migrate();
    await seed();
    console.log("Database reset complete (schema + seed data reapplied).");
}

if (require.main === module) {
    reset().catch((err) => {
        console.error("Reset failed:", describeError(err));
        process.exit(1);
    });
}

module.exports = { reset };
