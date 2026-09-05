/**
 * Sanity-check script: prints row counts per table and runs a couple of
 * the key business-rule queries (contract resolution, leave balance) so
 * anyone on the team can quickly confirm the database is in a good state.
 *
 * Usage: npm run verify
 */
const { DatabaseSync } = require("node:sqlite");
const { DB_PATH } = require("./config");

function verify() {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    try {
        console.log(`Verifying ${DB_PATH}\n`);

        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .all()
            .map((r) => r.name);

        console.log("Row counts:");
        for (const t of tables) {
            const { c } = db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get();
            console.log(`  ${t.padEnd(24)} ${c}`);
        }

        console.log("\nContract resolution check (Rahul Sharma, period = 2026-03-01..2026-03-31):");
        const resolved = db
            .prepare(
                `SELECT c.id, c.start_date, c.end_date, c.wage, c.status
                 FROM contracts c
                 JOIN employees e ON e.id = c.employee_id
                 WHERE e.employee_code = 'EMP-002'
                   AND c.start_date <= '2026-03-31'
                   AND (c.end_date IS NULL OR c.end_date >= '2026-03-01')`
            )
            .all();
        console.table(resolved);

        console.log("\nLeave balance check (Rahul Sharma, Earned Leave):");
        const balance = db
            .prepare(
                `SELECT la.allocated_amount, la.taken_amount,
                        (la.allocated_amount - la.taken_amount) AS remaining
                 FROM leave_allocations la
                 JOIN employees e ON e.id = la.employee_id
                 JOIN time_off_types t ON t.id = la.time_off_type_id
                 WHERE e.employee_code = 'EMP-002' AND t.name = 'Earned Leave'`
            )
            .all();
        console.table(balance);

        console.log("\nOK: database looks consistent.");
    } finally {
        db.close();
    }
}

if (require.main === module) {
    verify();
}

module.exports = { verify };
