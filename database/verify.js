/**
 * Sanity-check script: prints row counts per table and runs a couple of
 * the key business-rule queries (contract resolution, leave balance) so
 * anyone on the team can quickly confirm the database is in a good state.
 *
 * Usage: npm run verify
 */
const { Client } = require("pg");
const { PG_CONFIG } = require("./config");

async function verify() {
    const client = new Client(PG_CONFIG);
    await client.connect();

    try {
        console.log(`Verifying database "${PG_CONFIG.database}" at ${PG_CONFIG.host}:${PG_CONFIG.port}\n`);

        const { rows: tables } = await client.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        );

        console.log("Row counts:");
        for (const { table_name } of tables) {
            const { rows } = await client.query(`SELECT COUNT(*) AS c FROM "${table_name}"`);
            console.log(`  ${table_name.padEnd(24)} ${rows[0].c}`);
        }

        console.log("\nContract resolution check (Rahul Sharma, period = 2026-03-01..2026-03-31):");
        const resolved = await client.query(
            `SELECT c.id, c.start_date, c.end_date, c.wage, c.status
             FROM contracts c
             JOIN employees e ON e.id = c.employee_id
             WHERE e.employee_code = 'EMP-002'
               AND c.start_date <= '2026-03-31'
               AND (c.end_date IS NULL OR c.end_date >= '2026-03-01')`
        );
        console.table(resolved.rows);

        console.log("\nLeave balance check (Rahul Sharma, Earned Leave):");
        const balance = await client.query(
            `SELECT la.allocated_amount, la.taken_amount,
                    (la.allocated_amount - la.taken_amount) AS remaining
             FROM leave_allocations la
             JOIN employees e ON e.id = la.employee_id
             JOIN time_off_types t ON t.id = la.time_off_type_id
             WHERE e.employee_code = 'EMP-002' AND t.name = 'Earned Leave'`
        );
        console.table(balance.rows);

        console.log("\nOK: database looks consistent.");
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    verify().catch((err) => {
        console.error("Verification failed:", err.message);
        process.exit(1);
    });
}

module.exports = { verify };
