/**
 * Applies schema.sql to the local SQLite database file, creating the
 * data/ directory and the .db file if they do not exist yet.
 *
 * Usage: npm run migrate
 */
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { DB_DIR, DB_PATH, SCHEMA_PATH } = require("./config");

function migrate() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    const db = new DatabaseSync(DB_PATH);

    try {
        db.exec("PRAGMA foreign_keys = ON;");
        db.exec(schema);
        console.log(`Schema applied successfully to ${DB_PATH}`);
    } finally {
        db.close();
    }
}

if (require.main === module) {
    migrate();
}

module.exports = { migrate };
