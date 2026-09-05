# PeoplePay360 - Database Module (`feature/database`)

Owner: Maddi Soumya

This folder is the complete data layer for PeoplePay360: schema,
migration runner, demo seed data, and a verification script. It has
zero external dependencies and zero cloud/network requirements -
everything runs locally against a single SQLite file.

## Tech Stack

| Concern              | Choice                                   | Why |
|-----------------------|-------------------------------------------|-----|
| Database engine       | SQLite                                     | Zero-config, file-based, fully offline/local - no server process, no cloud account, nothing to install to run the app or the demo. |
| Driver                | Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) (`DatabaseSync`) | Ships with Node.js itself (v22.5+) - no native/compiled npm dependency (avoids `node-gyp`/Visual Studio build issues seen with `better-sqlite3` on this machine), no `npm install` required at all. |
| Schema definition     | Plain `schema.sql` (DDL)                   | Portable, reviewable, easy for feature/backend to read directly or re-run against their own copy. |
| Seed data             | `seed.js` (programmatic inserts)           | Produces real, relational, dynamic demo records (not static JSON) so feature/backend and feature/frontend can develop against actual query results. |

## Requirements

- Node.js **v22.5.0 or later** (for `node:sqlite`). This machine has v24.

No `npm install` is required - there are currently no external
dependencies.

## Usage

From this `database/` directory:

```bash
npm run migrate   # creates data/peoplepay360.db and applies schema.sql
npm run seed      # inserts demo data (run after migrate)
npm run reset     # deletes the local db file, then migrate + seed in one step
npm run verify    # prints row counts and checks key business rules
```

The database file lives at `database/data/peoplepay360.db` and is
git-ignored - every developer/teammate generates their own local copy
by running `npm run reset`.

## What's in the schema

See [`schema.sql`](./schema.sql) for full DDL and inline comments.
Tables, grouped by module:

- **RBAC**: `roles`, `users`
- **Org structure**: `departments`, `job_positions`
- **Scheduling**: `working_schedules`, `working_schedule_lines`
- **People**: `employees`
- **Contracts**: `contracts` (historical, period-aware; a trigger
  prevents two overlapping `running` contracts for the same employee)
- **Attendance**: `attendance`
- **Time off**: `time_off_types`, `leave_allocations`, `time_off_requests`
- **Payroll configuration**: `salary_structures`, `salary_rules`
- **Payroll processing**: `payruns`, `payrun_employees`, `payslips`,
  `payslip_lines`, `payroll_warnings`

Key business rules enforced at the database layer:

- **Contract resolution window**: payroll must pick the contract where
  `start_date <= period_end AND (end_date IS NULL OR end_date >= period_start)`,
  never just "the employee's latest contract." Demonstrated by the
  seed data for `EMP-002` (Rahul Sharma), who has two contracts; see
  `verify.js` for the exact query.
- **No overlapping active contracts**: enforced by
  `trg_contracts_no_overlap_insert` / `_update` triggers.
- **No duplicate payslips per payrun**: `UNIQUE (payrun_id, employee_id)`
  on `payslips`.
- **Leave balance**: `remaining = allocated_amount - taken_amount`,
  demonstrated end-to-end (allocate 20 -> approve a 3-day request ->
  17 remaining) in the seed data.

## For feature/backend (Avanti)

- Point your API layer's DB client at `database/data/peoplepay360.db`
  (or copy `config.js`'s `DB_PATH` resolution logic - it respects the
  `PEOPLEPAY_DB_PATH` env var so tests can use a throwaway file).
- Run `npm run reset` any time you want a clean, known-good dataset.
- All computed/derived payroll values in the seed data (gross,
  deductions, net) were hand-checked against the salary rule
  definitions in `salary_rules` so you can sanity-check your own
  salary-rule execution engine against them.

## For feature/frontend (Vyshnavi)

- Until the API is ready, you can still see real data shapes by
  running `npm run verify`, or by querying the `.db` file directly
  with any SQLite browser (e.g. the `sqlite3` CLI or a VS Code SQLite
  extension) - no need to fall back to hand-written mock JSON for
  field names/shapes.
