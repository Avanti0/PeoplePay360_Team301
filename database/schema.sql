-- =====================================================================
-- PeoplePay360 - Database Schema
-- Branch: feature/database (owner: Maddi Soumya)
-- Engine: PostgreSQL (run as a local server; connect via env vars, see
-- .env.example and config.js)
--
-- Covers: employees, departments, job positions, contracts, working
-- schedules, attendance, time off (types/allocations/requests), salary
-- structures/rules, payruns, payslips, payroll warnings, and a minimal
-- users/roles model for role-based access control.
--
-- Conventions:
--   - Every table has an `id BIGINT GENERATED ALWAYS AS IDENTITY` PK.
--   - Timestamps use TIMESTAMPTZ with DEFAULT now().
--   - Calendar-only values use DATE; clock times within a schedule day
--     use TIME.
--   - Money/hours/day quantities use NUMERIC for exact arithmetic
--     (no floating-point rounding drift on payroll figures).
--   - Enumerated columns use native PostgreSQL ENUM types.
--   - Foreign keys are always enforced by Postgres itself.
--   - This file is idempotent: it can be re-run against an empty or an
--     already-migrated database (DROP ... CASCADE up front).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clean slate (safe to re-run). Types/tables are dropped in an order
-- that respects dependencies; CASCADE covers anything left over.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS payroll_warnings CASCADE;
DROP TABLE IF EXISTS payslip_lines CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payrun_employees CASCADE;
DROP TABLE IF EXISTS payruns CASCADE;
DROP TABLE IF EXISTS salary_rules CASCADE;
DROP TABLE IF EXISTS salary_structures CASCADE;
DROP TABLE IF EXISTS time_off_requests CASCADE;
DROP TABLE IF EXISTS leave_allocations CASCADE;
DROP TABLE IF EXISTS time_off_types CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS working_schedule_lines CASCADE;
DROP TABLE IF EXISTS working_schedules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS job_positions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TYPE IF EXISTS role_name CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS employment_status_type CASCADE;
DROP TYPE IF EXISTS schedule_type_enum CASCADE;
DROP TYPE IF EXISTS employment_type_enum CASCADE;
DROP TYPE IF EXISTS contract_status_enum CASCADE;
DROP TYPE IF EXISTS attendance_status_enum CASCADE;
DROP TYPE IF EXISTS time_off_unit_enum CASCADE;
DROP TYPE IF EXISTS allocation_status_enum CASCADE;
DROP TYPE IF EXISTS time_off_request_status_enum CASCADE;
DROP TYPE IF EXISTS salary_rule_category_enum CASCADE;
DROP TYPE IF EXISTS computation_method_enum CASCADE;
DROP TYPE IF EXISTS payrun_status_enum CASCADE;
DROP TYPE IF EXISTS payslip_status_enum CASCADE;
DROP TYPE IF EXISTS warning_type_enum CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS prevent_overlapping_running_contracts() CASCADE;

-- ---------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------
CREATE TYPE role_name AS ENUM ('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE employment_status_type AS ENUM ('active', 'inactive', 'terminated');
CREATE TYPE schedule_type_enum AS ENUM ('full_time', 'part_time', 'shift');
CREATE TYPE employment_type_enum AS ENUM ('permanent', 'contract', 'intern');
CREATE TYPE contract_status_enum AS ENUM ('draft', 'running', 'expired', 'cancelled');
CREATE TYPE attendance_status_enum AS ENUM ('present', 'late', 'absent', 'half_day', 'on_leave');
CREATE TYPE time_off_unit_enum AS ENUM ('days', 'hours');
CREATE TYPE allocation_status_enum AS ENUM ('draft', 'approved', 'refused');
CREATE TYPE time_off_request_status_enum AS ENUM ('draft', 'submitted', 'approved', 'refused', 'cancelled');
CREATE TYPE salary_rule_category_enum AS ENUM ('basic', 'allowance', 'gross', 'deduction', 'net', 'other');
CREATE TYPE computation_method_enum AS ENUM ('fixed', 'percentage', 'formula');
CREATE TYPE payrun_status_enum AS ENUM ('draft', 'computed', 'validated', 'paid');
CREATE TYPE payslip_status_enum AS ENUM ('draft', 'computed', 'validated', 'paid');
CREATE TYPE warning_type_enum AS ENUM (
    'missing_bank_details', 'missing_employee_info', 'duplicate_payslip',
    'contract_conflict', 'missing_contract', 'invalid_payroll_context',
    'missing_salary_configuration'
);

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
-- Roles & Users (Role-Based Access Control)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        role_name NOT NULL UNIQUE,
    description TEXT
);

-- ---------------------------------------------------------------------
-- Departments & Job Positions
-- ---------------------------------------------------------------------
CREATE TABLE departments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    code        TEXT UNIQUE,
    manager_id  BIGINT, -- FK to employees added after employees exists
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_positions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title         TEXT NOT NULL,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (title, department_id)
);

-- ---------------------------------------------------------------------
-- Working Schedules
-- ---------------------------------------------------------------------
CREATE TABLE working_schedules (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    schedule_type  schedule_type_enum NOT NULL DEFAULT 'full_time',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per working day of the week for a schedule.
-- day_of_week: 0 = Monday ... 6 = Sunday
CREATE TABLE working_schedule_lines (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_id     BIGINT NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_working_day  BOOLEAN NOT NULL DEFAULT TRUE,
    start_time      TIME, -- NULL when is_working_day = FALSE
    end_time        TIME,
    break_minutes   INTEGER NOT NULL DEFAULT 0,
    UNIQUE (schedule_id, day_of_week)
);

-- ---------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------
CREATE TABLE employees (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code        TEXT NOT NULL UNIQUE,
    first_name           TEXT NOT NULL,
    last_name            TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    phone                TEXT,
    gender               gender_type,
    date_of_birth        DATE,
    date_joined          DATE NOT NULL,
    department_id        BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    job_position_id      BIGINT REFERENCES job_positions(id) ON DELETE SET NULL,
    manager_id           BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    working_schedule_id  BIGINT REFERENCES working_schedules(id) ON DELETE SET NULL,
    role_id              BIGINT NOT NULL REFERENCES roles(id),
    employment_status    employment_status_type NOT NULL DEFAULT 'active',
    bank_account_number  TEXT,
    bank_name            TEXT,
    bank_ifsc            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);

CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id)
        REFERENCES employees(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Users (login accounts)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id       BIGINT NOT NULL REFERENCES roles(id),
    employee_id   BIGINT UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Salary Structures & Salary Rules (payroll configuration)
-- ---------------------------------------------------------------------
CREATE TABLE salary_structures (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE salary_rules (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    salary_structure_id BIGINT NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    code                TEXT NOT NULL,
    category            salary_rule_category_enum NOT NULL,
    sequence            INTEGER NOT NULL DEFAULT 10,
    computation_method  computation_method_enum NOT NULL,
    amount              NUMERIC(14, 2),  -- used when computation_method = 'fixed'
    percentage          NUMERIC(6, 3),   -- used when computation_method = 'percentage'
    percentage_of_code  TEXT,            -- rule code the percentage is applied to (e.g. HRA % of BASIC)
    formula             TEXT,            -- used when computation_method = 'formula'; simple expression over prior rule codes
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (salary_structure_id, code)
);

CREATE INDEX idx_salary_rules_structure ON salary_rules(salary_structure_id, sequence);

-- ---------------------------------------------------------------------
-- Contracts
-- Historical, period-aware. Payroll must resolve the contract whose
-- validity window covers the payroll period (see Key Business Rules in
-- README): contract.start_date <= period.end AND
-- (contract.end_date IS NULL OR contract.end_date >= period.start)
-- ---------------------------------------------------------------------
CREATE TABLE contracts (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id          BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date           DATE NOT NULL,
    end_date             DATE, -- NULL = open-ended / current contract
    wage                 NUMERIC(14, 2) NOT NULL CHECK (wage >= 0), -- annual wage
    department_id        BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    job_position_id      BIGINT REFERENCES job_positions(id) ON DELETE SET NULL,
    working_schedule_id  BIGINT REFERENCES working_schedules(id) ON DELETE SET NULL,
    salary_structure_id  BIGINT REFERENCES salary_structures(id) ON DELETE SET NULL,
    employment_type      employment_type_enum NOT NULL DEFAULT 'permanent',
    status               contract_status_enum NOT NULL DEFAULT 'draft',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_contracts_employee_period ON contracts(employee_id, start_date, end_date);

CREATE TRIGGER trg_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enforce "no two RUNNING contracts may overlap for the same employee"
-- at the database layer via a trigger (Postgres has no built-in temporal
-- exclusion over nullable ranges here without extra extensions, so a
-- trigger keeps this dependency-free). Application logic in
-- feature/backend should still re-validate this before insert/update
-- for a friendlier error message.
CREATE FUNCTION prevent_overlapping_running_contracts() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'running' AND EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.employee_id = NEW.employee_id
          AND c.status = 'running'
          AND c.id <> COALESCE(NEW.id, -1)
          AND NEW.start_date <= COALESCE(c.end_date, DATE '9999-12-31')
          AND COALESCE(NEW.end_date, DATE '9999-12-31') >= c.start_date
    ) THEN
        RAISE EXCEPTION 'Overlapping running contract exists for this employee';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contracts_no_overlap
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION prevent_overlapping_running_contracts();

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
CREATE TABLE attendance (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id          BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date            DATE NOT NULL,
    check_in             TIMESTAMPTZ,
    check_out            TIMESTAMPTZ,
    worked_hours         NUMERIC(5, 2) NOT NULL DEFAULT 0,
    status               attendance_status_enum NOT NULL DEFAULT 'present',
    is_manual_correction BOOLEAN NOT NULL DEFAULT FALSE,
    corrected_by         BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, work_date)
);

CREATE INDEX idx_attendance_date ON attendance(work_date);
CREATE INDEX idx_attendance_employee ON attendance(employee_id, work_date);

CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Time Off: Types, Allocations, Requests
-- ---------------------------------------------------------------------
CREATE TABLE time_off_types (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                  TEXT NOT NULL UNIQUE,
    unit                  time_off_unit_enum NOT NULL DEFAULT 'days',
    requires_allocation   BOOLEAN NOT NULL DEFAULT TRUE,
    affects_payroll       BOOLEAN NOT NULL DEFAULT TRUE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE leave_allocations (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id  BIGINT NOT NULL REFERENCES time_off_types(id),
    allocated_amount  NUMERIC(6, 2) NOT NULL CHECK (allocated_amount >= 0),
    taken_amount      NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (taken_amount >= 0),
    valid_from        DATE NOT NULL,
    valid_to          DATE,
    status            allocation_status_enum NOT NULL DEFAULT 'draft',
    approved_by       BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocations_employee ON leave_allocations(employee_id, time_off_type_id);

CREATE TABLE time_off_requests (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id  BIGINT NOT NULL REFERENCES time_off_types(id),
    allocation_id     BIGINT REFERENCES leave_allocations(id) ON DELETE SET NULL,
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    duration          NUMERIC(6, 2) NOT NULL CHECK (duration > 0),
    status            time_off_request_status_enum NOT NULL DEFAULT 'submitted',
    reason            TEXT,
    approved_by       BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    approved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_timeoff_requests_employee ON time_off_requests(employee_id, status);

CREATE TRIGGER trg_timeoff_requests_updated_at
BEFORE UPDATE ON time_off_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Payruns, Payslips, Payslip Lines, Payroll Warnings
-- ---------------------------------------------------------------------
CREATE TABLE payruns (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                 TEXT NOT NULL,
    salary_structure_id  BIGINT NOT NULL REFERENCES salary_structures(id),
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,
    status               payrun_status_enum NOT NULL DEFAULT 'draft',
    created_by           BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    computed_at          TIMESTAMPTZ,
    validated_at         TIMESTAMPTZ,
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end >= period_start)
);

-- Employees explicitly selected into a payrun (step 2 of the wizard).
CREATE TABLE payrun_employees (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payrun_id    BIGINT NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id  BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE (payrun_id, employee_id)
);

CREATE TABLE payslips (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payrun_id        BIGINT NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id      BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_id      BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
    worked_days      NUMERIC(5, 2) NOT NULL DEFAULT 0,
    gross_salary     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_salary       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status           payslip_status_enum NOT NULL DEFAULT 'draft',
    pdf_path         TEXT,
    emailed_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (payrun_id, employee_id) -- prevents duplicate payslips per payrun
);

CREATE INDEX idx_payslips_employee ON payslips(employee_id);

CREATE TRIGGER trg_payslips_updated_at
BEFORE UPDATE ON payslips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE payslip_lines (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payslip_id     BIGINT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    salary_rule_id BIGINT REFERENCES salary_rules(id) ON DELETE SET NULL,
    code           TEXT NOT NULL,
    name           TEXT NOT NULL,
    category       salary_rule_category_enum NOT NULL,
    sequence       INTEGER NOT NULL DEFAULT 10,
    amount         NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_payslip_lines_payslip ON payslip_lines(payslip_id, sequence);

CREATE TABLE payroll_warnings (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payslip_id    BIGINT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    warning_type  warning_type_enum NOT NULL,
    message       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_warnings_payslip ON payroll_warnings(payslip_id);
