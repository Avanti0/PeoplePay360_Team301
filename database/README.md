# PeoplePay360 - Database Module (`feature/database`)

Owner: Maddi Soumya

This folder is the complete data layer for PeoplePay360: schema,
migration runner, demo seed data, and a verification script, running
against a local PostgreSQL server.

## Tech Stack

| Concern              | Choice                                   | Why |
|-----------------------|-------------------------------------------|-----|
| Database engine       | PostgreSQL (local server)                  | Full relational engine with native enum types, real numeric precision for money, arrays/JSON if ever needed, and a mature ecosystem the rest of the team (and most job/interview contexts) already knows. Runs entirely on your own machine - no cloud account required. |
| Driver                | [`pg`](https://node-postgres.com/) (`node-postgres`) | The standard Node.js Postgres client. Pure JavaScript wire-protocol implementation - no native/compiled addon, so `npm install` never needs a C++ build toolchain. |
| Schema definition     | Plain `schema.sql` (DDL)                   | Portable, reviewable, easy for feature/backend to read directly or re-run against their own copy. Uses native Postgres `ENUM` types, `TIMESTAMPTZ`, `DATE`, and `NUMERIC` for exact-precision money math. |
| Seed data             | `seed.js` (programmatic inserts)           | Produces real, relational, dynamic demo records (not static JSON) so feature/backend and feature/frontend can develop against actual query results. |
| Config                | `.env` (git-ignored) + `config.js`         | Standard `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` env vars, so every teammate points at their own local Postgres install without touching code, and feature/backend can reuse the exact same env vars for its own connection pool. |

## Requirements

- **PostgreSQL installed and running locally.** Download from
  https://www.postgresql.org/download/ (Windows installer includes
  pgAdmin). Any recent version (13+) works.
- Node.js v18+ (only needed to run the scripts in this folder - the
  `pg` package is pure JS, no native build tools required).

## Setup

1. Install PostgreSQL locally and make sure the server is running
   (on Windows, the installer sets it up as a Windows service that
   starts automatically).
2. From this `database/` directory:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your local Postgres
   credentials (the defaults assume user `postgres` / password
   `postgres` on `localhost:5432`, adjust to match what you set during
   install):
   ```bash
   cp .env.example .env
   ```
4. Run the setup scripts:
   ```bash
   npm run migrate   # creates the "peoplepay360" database (if missing) and applies schema.sql
   npm run seed       # inserts demo data (run after migrate)
   npm run reset       # re-applies schema.sql (which drops+recreates everything) + seed in one step
   npm run verify      # prints row counts and checks key business rules
   ```

`.env` is git-ignored - every developer/teammate keeps their own local
credentials there; only `.env.example` (a template with no real
secrets) is committed.

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
- **No overlapping active contracts**: enforced by the
  `trg_contracts_no_overlap` trigger (backed by the
  `prevent_overlapping_running_contracts()` PL/pgSQL function).
- **No duplicate payslips per payrun**: `UNIQUE (payrun_id, employee_id)`
  on `payslips`.
- **Leave balance**: `remaining = allocated_amount - taken_amount`,
  demonstrated end-to-end (allocate 20 -> approve a 3-day request ->
  17 remaining) in the seed data.

## For feature/backend (Avanti)

- Reuse the same `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`
  env vars (see `.env.example`) for your API layer's own connection
  pool (`pg.Pool`) - no need to duplicate connection logic.
- Run `npm run reset` any time you want a clean, known-good dataset.
- All computed/derived payroll values in the seed data (gross,
  deductions, net) were hand-checked against the salary rule
  definitions in `salary_rules` so you can sanity-check your own
  salary-rule execution engine against them.

## For feature/frontend (Vyshnavi)

- Until the API is ready, you can still see real data shapes by
  running `npm run verify`, or by connecting with any Postgres client
  (pgAdmin, DBeaver, the `psql` CLI, or a VS Code Postgres extension) -
  no need to fall back to hand-written mock JSON for field names/shapes.
