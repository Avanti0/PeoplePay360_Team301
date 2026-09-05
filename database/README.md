# PeoplePay360 - Database Module (`feature/database`)

Owner: Maddi Soumya

This folder is the complete data layer for PeoplePay360: schema,
migration runner, demo seed data, and a verification script, running
against a local PostgreSQL server.

Field/table names, enum values, and the entity-relationship shape here
follow the conventions agreed in the repo's `status.md` and
`docs/modules/*.md` (written by the team after the first version of
this schema existed) - so this is the second, spec-aligned revision.
If you're wondering why a name looks unusual (e.g. `date_start` instead
of `start_date`, or department/job_position as plain text instead of a
foreign key), it's because it mirrors those docs exactly - check there
before assuming a naming choice was arbitrary.

## Tech Stack

| Concern              | Choice                                   | Why |
|-----------------------|-------------------------------------------|-----|
| Database engine       | PostgreSQL (local server)                  | Full relational engine with native enum types, real numeric precision for money, and a mature ecosystem. Runs entirely on your own machine - no cloud account required. Matches `docs/spec.md`'s stack table. |
| Driver                | [`pg`](https://node-postgres.com/) (`node-postgres`) | Pure JavaScript wire-protocol client for the setup/seed tooling in this folder - no native/compiled addon, so `npm install` never needs a C++ build toolchain. (The actual backend is Python/FastAPI + SQLAlchemy per `docs/spec.md`; this `pg`-based tooling only bootstraps the database, it isn't the app's runtime data layer.) |
| Schema definition     | Plain `schema.sql` (DDL)                   | Matches `docs/spec.md`'s project structure (`database/schema.sql`). Portable, reviewable, and can be mounted straight into the official `postgres` Docker image's init directory. |
| Seed data             | Plain `seed.sql` (INSERT statements)       | Matches `docs/spec.md`'s project structure (`database/seed.sql`). Real relational demo records (not static JSON), with fixed/readable UUID literals so rows are easy to reference by hand while testing. |
| Config                | `.env` (git-ignored) + `config.js`         | Standard `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` env vars, so every teammate points at their own local Postgres install without touching code, and feature/backend can reuse the exact same env vars for its own connection pool/`DATABASE_URL`. |
| Primary keys          | `UUID DEFAULT gen_random_uuid()`           | Matches every `docs/modules/*.md` field table (`id: UUID`). Built into PostgreSQL core since v13 - no `pgcrypto`/`uuid-ossp` extension needed. |

## Requirements

- **PostgreSQL installed and running locally.** Download from
  https://www.postgresql.org/download/ (Windows installer includes
  pgAdmin). Verified against PostgreSQL 18; anything 13+ works
  (needed for built-in `gen_random_uuid()`).
- Node.js v18+ (only needed to run the setup scripts in this folder -
  `pg` is pure JS, no native build tools required).

## Setup

1. Install PostgreSQL locally and make sure the server is running
   (on Windows, the installer sets it up as a Windows service that
   starts automatically).
2. From this `database/` directory:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your local Postgres
   credentials:
   ```bash
   cp .env.example .env
   ```
4. Run the setup scripts:
   ```bash
   npm run migrate   # creates the "peoplepay360" database (if missing) and applies schema.sql
   npm run seed       # applies seed.sql (run after migrate)
   npm run reset       # migrate + seed in one step (safe to re-run any time)
   npm run verify      # prints row counts and checks key business rules
   ```

`schema.sql` and `seed.sql` are also plain SQL files, so they can be
run directly with `psql -f schema.sql` / `psql -f seed.sql`, or dropped
into the official `postgres` Docker image's
`/docker-entrypoint-initdb.d/` directory for `docker compose up` to
apply automatically on first container start (per NFR-06).

`.env` is git-ignored - every developer/teammate keeps their own local
credentials there; only `.env.example` (a template with no real
secrets) is committed.

## What's in the schema

See [`schema.sql`](./schema.sql) for full DDL and inline comments, and
[`seed.sql`](./seed.sql) for the demo data. Tables, grouped by module:

- **Auth**: `users` (role stored directly as an enum column, embedded
  in the JWT payload per `docs/spec.md`)
- **People**: `employees` (department/job_position are plain text
  columns, not foreign keys - see `docs/modules/employee.md`)
- **Scheduling**: `working_schedules`, `schedule_lines`
- **Contracts**: `contracts` (historical, period-aware; a trigger
  prevents two overlapping `active` contracts for the same employee)
- **Attendance**: `attendance`
- **Time off**: `time_off_types`, `allocations`, `time_off_requests`
- **Payroll configuration**: `salary_structures`, `salary_rules`
- **Payroll processing**: `payruns`, `payrun_employees` (not in the
  ERD but needed to persist the payrun wizard's employee-selection
  step), `payslips` (warnings stored as a `warnings JSONB` column, per
  `docs/modules/payroll.md` - no separate warnings table), `payslip_lines`

Key business rules enforced at the database layer:

- **Contract resolution window**: payroll must pick the contract where
  `date_start <= period_start AND (date_end >= period_end OR date_end IS NULL) AND status = 'active'`,
  never just "the employee's latest contract." Demonstrated by the
  seed data for Rahul Sharma, who has two contracts; see `verify.js`
  for the exact query.
- **Only one active contract per employee**: enforced by the
  `trg_contracts_no_overlap` trigger (backed by
  `prevent_overlapping_active_contracts()`).
- **No duplicate payslips per payrun**: `UNIQUE (payrun_id, employee_id)`
  on `payslips`.
- **Leave balance**: `allocations.remaining` is a generated column
  (`number_of_days - taken`), always consistent with no application
  bookkeeping required. Demonstrated end-to-end (allocate 20 -> approve
  a 3-day request -> 17 remaining) in the seed data.

## For feature/backend (Avanti)

- Reuse the same `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`
  env vars (see `.env.example`) for SQLAlchemy's connection string -
  no need to duplicate connection config.
- Run `npm run reset` any time you want a clean, known-good dataset.
- Seed users have placeholder `password_hash` values
  (`DEMO_HASH_CHANGE_ME`) - replace with real bcrypt hashes before
  wiring up login (NFR-03).
- All computed/derived payroll values in the seed data (gross, net,
  payslip lines) were hand-checked against the salary rule definitions
  in `salary_rules` so you can sanity-check your own salary-rule
  execution engine (`docs/architecture.md`'s evaluation loop) against
  them.

## For feature/frontend (Vyshnavi)

- Until the API is ready, you can still see real data shapes by
  running `npm run verify`, or by connecting with any Postgres client
  (pgAdmin, DBeaver, the `psql` CLI, or a VS Code Postgres extension) -
  no need to fall back to hand-written mock JSON for field names/shapes.
