/**
 * Convenience script for local development: deletes the existing SQLite
 * database file (if any), re-applies schema.sql, then re-runs seed.js.
 *
 * Usage: npm run reset
 */
const fs = require("fs");
const { DB_PATH } = require("./config");
const { migrate } = require("./migrate");
const { seed } = require("./seed");

function reset() {
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
        const file = DB_PATH + suffix;
        if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    migrate();
    seed();
    console.log("Database reset complete (schema + seed data reapplied).");
}

if (require.main === module) {
    reset();
}

module.exports = { reset };
