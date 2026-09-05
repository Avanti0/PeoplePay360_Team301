/**
 * Formats a caught error into a human-readable string, unwrapping
 * Node's AggregateError (which pg throws when it can't reach the
 * server on any resolved address - e.g. IPv6 ::1 and IPv4 127.0.0.1
 * both refused). AggregateError's own `.message` is empty, so logging
 * `err.message` alone silently prints nothing useful; the real reason
 * lives in `err.errors`.
 */
function describeError(err) {
    if (err && Array.isArray(err.errors) && err.errors.length > 0) {
        const causes = err.errors.map((e) => e.message || String(e)).join("; ");
        const hint =
            err.errors[0] && err.errors[0].code === "ECONNREFUSED"
                ? " (is PostgreSQL running and listening on the host/port in your .env?)"
                : "";
        return `${err.message || err.name}: ${causes}${hint}`;
    }
    if (err && err.code === "ECONNREFUSED") {
        return `${err.message} (is PostgreSQL running and listening on the host/port in your .env?)`;
    }
    if (err && err.code === "28P01") {
        return `${err.message} (check PGUSER/PGPASSWORD in your .env)`;
    }
    if (err && err.code === "3D000") {
        return `${err.message} (run "npm run migrate" first to create the database)`;
    }
    return (err && err.message) || String(err);
}

module.exports = { describeError };
