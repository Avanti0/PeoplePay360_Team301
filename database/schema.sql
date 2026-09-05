-- =====================================================================
-- PeoplePay360 - Database Schema
-- Branch: feature/database (owner: Maddi Soumya)
-- Engine: PostgreSQL 15+ (this repo was verified against a local
-- PostgreSQL 18 install; connect via env vars, see .env.example and
-- config.js)
--
-- This schema follows the field/table/enum names agreed in status.md
-- and docs/modules/*.md (naming conventions, status enums) and
-- docs/architecture.md (entity relationships), so it lines up exactly
-- with what feature/backend (FastAPI/SQLAlchemy) expects to model.
--
-- Conventions (per status.md):
--   - Every table has a `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
--     gen_random_uuid() is built into PostgreSQL core since v13 - no
--     pgcrypto/uuid-ossp extension required.
--   - Timestamps use TIMESTAMPTZ with DEFAULT now().
--   - Calendar-only values use DATE; clock times within a schedule day
--     use TIME.
--   - Money/hours/day quantities use NUMERIC for exact arithmetic.
--   - Enumerated columns use native PostgreSQL ENUM types, values taken
--     verbatim from status.md's "Status Enums" table and each module's
--     doc under docs/modules/.
--   - department / job_position are plain strings on employees and
--     contracts (docs/modules/employee.md, contract.md type them as
--     `string`, not a foreign key) - there is deliberately no separate
--     departments/job_positions table.
--   - This file is idempotent: it can be re-run against an empty or an
--     already-migrated database (DROP ... CASCADE up front).
--
-- A few fields exist beyond what docs/modules/*.md lists verbatim,
-- added only where a documented business rule cannot be implemented
-- without somewhere to store the data. Each is called out with a
-- comment at its definition:
--   - employees.bank_account_number/bank_name/bank_ifsc: needed to
--     evaluate the "missing bank details" payroll warning (payroll.md).
--   - payrun_employees: needed to persist the payrun wizard's Step 2
--     employee selection (FR-09) before Compute creates payslips.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clean slate (safe to re-run). Types/tables are dropped in an order
-- that respects dependencies; CASCADE covers anything left over.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS payslip_lines CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payrun_employees CASCADE;
DROP TABLE IF EXISTS payruns CASCADE;
DROP TABLE IF EXISTS salary_rules CASCADE;
DROP TABLE IF EXISTS salary_structures CASCADE;
DROP TABLE IF EXISTS time_off_requests CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS time_off_types CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS schedule_lines CASCADE;
DROP TABLE IF EXISTS working_schedules CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tables from a pre-spec-alignment version of this schema (renamed or
-- removed below); dropped here too so a re-run against a database that
-- still has them (e.g. from before this rewrite) doesn't collide on
-- leftover index/constraint names.
DROP TABLE IF EXISTS leave_allocations CASCADE;
DROP TABLE IF EXISTS payroll_warnings CASCADE;
DROP TABLE IF EXISTS working_schedule_lines CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS job_positions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TYPE IF EXISTS role_name CASCADE;
DROP TYPE IF EXISTS employment_status_type CASCADE;
DROP TYPE IF EXISTS contract_status_enum CASCADE;
DROP TYPE IF EXISTS attendance_status_enum CASCADE;
DROP TYPE IF EXISTS time_off_unit_enum CASCADE;
DROP TYPE IF EXISTS allocation_status_enum CASCADE;
DROP TYPE IF EXISTS time_off_request_status_enum CASCADE;
DROP TYPE IF EXISTS salary_rule_category_enum CASCADE;
DROP TYPE IF EXISTS computation_type_enum CASCADE;
DROP TYPE IF EXISTS payrun_status_enum CASCADE;
DROP TYPE IF EXISTS payslip_status_enum CASCADE;

-- Enum types from the pre-spec-alignment version, dropped for the same
-- reason as the tables above.
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS schedule_type_enum CASCADE;
DROP TYPE IF EXISTS employment_type_enum CASCADE;
DROP TYPE IF EXISTS computation_method_enum CASCADE;
DROP TYPE IF EXISTS warning_type_enum CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS prevent_overlapping_running_contracts() CASCADE;
DROP FUNCTION IF EXISTS prevent_overlapping_active_contracts() CASCADE;

-- ---------------------------------------------------------------------
-- Enum types (values per status.md "Status Enums" + FR-12 role list)
-- ---------------------------------------------------------------------
CREATE TYPE role_name AS ENUM ('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin');
CREATE TYPE employment_status_type AS ENUM ('active', 'inactive', 'on_leave');
CREATE TYPE contract_status_enum AS ENUM ('draft', 'active', 'expired', 'cancelled');
CREATE TYPE attendance_status_enum AS ENUM ('present', 'late', 'absent', 'overtime');
CREATE TYPE time_off_unit_enum AS ENUM ('days', 'hours');
CREATE TYPE allocation_status_enum AS ENUM ('draft', 'confirmed', 'approved', 'refused');
CREATE TYPE time_off_request_status_enum AS ENUM ('draft', 'confirmed', 'approved', 'refused');
CREATE TYPE salary_rule_category_enum AS ENUM ('basic', 'allowance', 'gross', 'deduction', 'net');
CREATE TYPE computation_type_enum AS ENUM ('fixed', 'percentage', 'formula');
CREATE TYPE payrun_status_enum AS ENUM ('draft', 'computed', 'validated', 'paid');
CREATE TYPE payslip_status_enum AS ENUM ('draft', 'computed', 'validated', 'paid');

-- ---------------------------------------------------------------------
-- Shared trigger function: keep updated_at current on every UPDATE
-- ---------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Users
-- Role is stored directly on the user (also embedded in the JWT
-- payload as `role` per docs/spec.md Authentication section) - there
-- is no separate roles table.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- bcrypt hash only, per NFR-03 - never plaintext
    role          role_name NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Working Schedules
-- ---------------------------------------------------------------------
CREATE TABLE working_schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per working day of the week for a schedule (FR-03).
-- Total weekly hours are derived by the application from these rows
-- (start_time/end_time/break_minutes on working days), not stored.
-- day_of_week: 0 = Monday ... 6 = Sunday
CREATE TABLE schedule_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id     UUID NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_working_day  BOOLEAN NOT NULL DEFAULT TRUE,
    start_time      TIME, -- NULL when is_working_day = FALSE
    end_time        TIME,
    break_minutes   INTEGER NOT NULL DEFAULT 0,
    UNIQUE (schedule_id, day_of_week)
);

-- ---------------------------------------------------------------------
-- Employees (docs/modules/employee.md)
-- ---------------------------------------------------------------------
CREATE TABLE employees (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL, -- one user -> one employee
    name                 TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    phone                TEXT,
    department           TEXT, -- plain string per employee.md, not a FK
    job_position         TEXT, -- plain string per employee.md, not a FK
    manager_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    working_schedule_id  UUID REFERENCES working_schedules(id) ON DELETE SET NULL,
    employment_status    employment_status_type NOT NULL DEFAULT 'active',
    -- Not in employee.md's field list; added so the "missing bank
    -- details" payroll warning (payroll.md) has something to check.
    bank_account_number  TEXT,
    bank_name            TEXT,
    bank_ifsc            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_manager ON employees(manager_id);

CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Salary Structures & Salary Rules (docs/modules/payroll.md)
-- ---------------------------------------------------------------------
CREATE TABLE salary_structures (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE salary_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    code                TEXT NOT NULL, -- unique within structure; referenced by formulas (e.g. BASIC, HRA)
    category            salary_rule_category_enum NOT NULL,
    sequence            INTEGER NOT NULL DEFAULT 10,
    computation_type    computation_type_enum NOT NULL,
    amount              NUMERIC(14, 2),  -- used when computation_type = 'fixed'
    percentage_base     TEXT,            -- rule code to apply the percentage on
    percentage          NUMERIC(6, 3),   -- used when computation_type = 'percentage'
    formula              TEXT,            -- used when computation_type = 'formula'; a Python expression over prior rule codes (see docs/architecture.md)
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (salary_structure_id, code)
);

CREATE INDEX idx_salary_rules_structure ON salary_rules(salary_structure_id, sequence);

-- ---------------------------------------------------------------------
-- Contracts (docs/modules/contract.md)
-- Historical, period-aware. Payroll resolves the contract whose
-- validity window covers the payroll period:
--   date_start <= period_start AND (date_end >= period_end OR date_end IS NULL)
--   AND status = 'active'
-- ---------------------------------------------------------------------
CREATE TABLE contracts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date_start           DATE NOT NULL,
    date_end             DATE, -- NULL = open-ended / current contract
    wage                 NUMERIC(14, 2) NOT NULL CHECK (wage >= 0), -- monthly gross wage
    department           TEXT, -- plain string per contract.md, not a FK
    job_position         TEXT, -- plain string per contract.md, not a FK
    working_schedule_id  UUID REFERENCES working_schedules(id) ON DELETE SET NULL,
    salary_structure_id  UUID REFERENCES salary_structures(id) ON DELETE SET NULL,
    status               contract_status_enum NOT NULL DEFAULT 'draft',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (date_end IS NULL OR date_end >= date_start)
);

CREATE INDEX idx_contracts_employee_period ON contracts(employee_id, date_start, date_end);

CREATE TRIGGER trg_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enforce "only one active contract per employee at any point in time"
-- (contract.md Business Rules) at the database layer via a trigger.
-- feature/backend should still re-validate this before insert/update
-- for a friendlier error message (contract.md/spec.md rule #2).
CREATE FUNCTION prevent_overlapping_active_contracts() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.employee_id = NEW.employee_id
          AND c.status = 'active'
          AND c.id <> NEW.id
          AND NEW.date_start <= COALESCE(c.date_end, DATE '9999-12-31')
          AND COALESCE(NEW.date_end, DATE '9999-12-31') >= c.date_start
    ) THEN
        RAISE EXCEPTION 'Overlapping active contract exists for this employee';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contracts_no_overlap
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION prevent_overlapping_active_contracts();

-- ---------------------------------------------------------------------
-- Attendance (docs/modules/attendance.md)
-- ---------------------------------------------------------------------
CREATE TABLE attendance (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    check_in      TIMESTAMPTZ,
    check_out     TIMESTAMPTZ,
    worked_hours  NUMERIC(5, 2), -- computed on save: (check_out - check_in) in hours; NULL if check_out missing
    status        attendance_status_enum NOT NULL DEFAULT 'present',
    is_manual     BOOLEAN NOT NULL DEFAULT FALSE,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_employee ON attendance(employee_id, check_in);

CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Time Off: Types, Allocations, Requests (docs/modules/time_off.md)
-- ---------------------------------------------------------------------
CREATE TABLE time_off_types (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL UNIQUE,
    unit                  time_off_unit_enum NOT NULL DEFAULT 'days',
    requires_allocation   BOOLEAN NOT NULL DEFAULT TRUE,
    approval_required     BOOLEAN NOT NULL DEFAULT TRUE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE allocations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id  UUID NOT NULL REFERENCES time_off_types(id),
    number_of_days    NUMERIC(6, 2) NOT NULL CHECK (number_of_days >= 0),
    taken             NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (taken >= 0),
    remaining         NUMERIC(6, 2) GENERATED ALWAYS AS (number_of_days - taken) STORED,
    date_from         DATE NOT NULL,
    date_to           DATE,
    status            allocation_status_enum NOT NULL DEFAULT 'draft',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocations_employee ON allocations(employee_id, time_off_type_id);

CREATE TABLE time_off_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id  UUID NOT NULL REFERENCES time_off_types(id),
    allocation_id     UUID REFERENCES allocations(id) ON DELETE SET NULL, -- nullable if type doesn't require allocation
    date_from         DATE NOT NULL,
    date_to           DATE NOT NULL,
    duration          NUMERIC(6, 2) NOT NULL CHECK (duration > 0), -- in days or hours, per type's unit
    status            time_off_request_status_enum NOT NULL DEFAULT 'draft',
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (date_to >= date_from)
);

CREATE INDEX idx_timeoff_requests_employee ON time_off_requests(employee_id, status);

-- ---------------------------------------------------------------------
-- Payruns, Payslips, Payslip Lines (docs/modules/payroll.md)
-- ---------------------------------------------------------------------
CREATE TABLE payruns (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT NOT NULL,
    salary_structure_id  UUID NOT NULL REFERENCES salary_structures(id),
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,
    status               payrun_status_enum NOT NULL DEFAULT 'draft',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end >= period_start)
);

CREATE TRIGGER trg_payruns_updated_at
BEFORE UPDATE ON payruns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Not in the architecture.md ERD, but required to implement FR-09's
-- two-step wizard: Step 2 lets the payroll user explicitly choose
-- which employees are included, before Compute (which turns each
-- selected employee into a payslip) ever runs.
CREATE TABLE payrun_employees (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payrun_id    UUID NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE (payrun_id, employee_id)
);

CREATE TABLE payslips (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payrun_id        UUID NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_id      UUID REFERENCES contracts(id) ON DELETE SET NULL, -- contract resolved for this period
    period_start     DATE NOT NULL,
    period_end       DATE NOT NULL,
    worked_days      NUMERIC(5, 2) NOT NULL DEFAULT 0,
    gross_salary     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_salary       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status           payslip_status_enum NOT NULL DEFAULT 'draft',
    warnings         JSONB NOT NULL DEFAULT '[]'::jsonb, -- list of warning strings, per payroll.md
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (payrun_id, employee_id) -- duplicate-payslip guard; payroll.md also has the app re-check overlapping periods
);

CREATE INDEX idx_payslips_employee ON payslips(employee_id);

CREATE TABLE payslip_lines (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payslip_id     UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    salary_rule_id UUID REFERENCES salary_rules(id) ON DELETE SET NULL,
    name           TEXT NOT NULL,  -- rule name at time of computation
    code           TEXT NOT NULL,  -- rule code at time of computation
    category       salary_rule_category_enum NOT NULL, -- copied from rule
    sequence       INTEGER NOT NULL DEFAULT 10,          -- copied from rule
    amount         NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_payslip_lines_payslip ON payslip_lines(payslip_id, sequence);
