/**
 * Sanity-check script: prints row counts per table and runs a couple of
 * the key business-rule queries (contract resolution, leave balance) so
 * anyone on the team can quickly confirm the database is in a good state.
 *
 * Usage: npm run verify
 */
const { Client } = require("pg");
const { PG_CONFIG } = require("./config");
const { describeError } = require("./errors");

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
            `SELECT c.id, c.date_start::text, c.date_end::text, c.wage, c.status
             FROM contracts c
             JOIN employees e ON e.id = c.employee_id
             WHERE e.email = 'rahul.sharma@peoplepay360.demo'
               AND c.date_start <= '2026-03-31'
               AND (c.date_end IS NULL OR c.date_end >= '2026-03-01')
               AND c.status = 'active'`
        );
        console.table(resolved.rows);

        console.log("\nLeave balance check (Rahul Sharma, Earned Leave):");
        const balance = await client.query(
            `SELECT a.number_of_days, a.taken, a.remaining
             FROM allocations a
             JOIN employees e ON e.id = a.employee_id
             JOIN time_off_types t ON t.id = a.time_off_type_id
             WHERE e.email = 'rahul.sharma@peoplepay360.demo' AND t.name = 'Earned Leave'`
        );
        console.table(balance.rows);

        console.log("\nOK: database looks consistent.");
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    verify().catch((err) => {
        console.error("Verification failed:", describeError(err));
        process.exit(1);
    });
}

module.exports = { verify };
