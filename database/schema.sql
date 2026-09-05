-- =====================================================================
-- PeoplePay360 - Database Schema
-- Branch: feature/database (owner: Maddi Soumya)
-- Engine: SQLite (via Node's built-in node:sqlite module)
--
-- Covers: employees, departments, job positions, contracts, working
-- schedules, attendance, time off (types/allocations/requests), salary
-- structures/rules, payruns, payslips, payroll warnings, and a minimal
-- users/roles model for role-based access control.
--
-- Conventions:
--   - Every table has an INTEGER PRIMARY KEY (rowid alias) `id`.
--   - Timestamps are stored as TEXT in ISO-8601 (UTC), default via
--     CURRENT_TIMESTAMP.
--   - Money/hours/day quantities use REAL (sufficient for a demo; a
--     production system would use fixed-point/integer minor units).
--   - Enumerated columns are enforced with CHECK constraints since
--     SQLite has no native ENUM type.
--   - Foreign keys are enforced (see migrate.js: PRAGMA foreign_keys=ON).
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Roles & Users (Role-Based Access Control)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
                    CHECK (name IN ('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin')),
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id       INTEGER NOT NULL REFERENCES roles(id),
    employee_id   INTEGER UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
    is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_login_at TEXT,
    created_at    TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------
-- Departments & Job Positions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    code        TEXT UNIQUE,
    manager_id  INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS job_positions (
    id            INTEGER PRIMARY KEY,
    title         TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (title, department_id)
);

-- ---------------------------------------------------------------------
-- Working Schedules
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS working_schedules (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    schedule_type  TEXT NOT NULL DEFAULT 'full_time'
                       CHECK (schedule_type IN ('full_time', 'part_time', 'shift')),
    is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at     TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- One row per working day of the week for a schedule.
-- day_of_week: 0 = Monday ... 6 = Sunday
CREATE TABLE IF NOT EXISTS working_schedule_lines (
    id              INTEGER PRIMARY KEY,
    schedule_id     INTEGER NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_working_day  INTEGER NOT NULL DEFAULT 1 CHECK (is_working_day IN (0, 1)),
    start_time      TEXT, -- 'HH:MM', NULL when is_working_day = 0
    end_time        TEXT, -- 'HH:MM'
    break_minutes   INTEGER NOT NULL DEFAULT 0,
    UNIQUE (schedule_id, day_of_week)
);

-- ---------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id                   INTEGER PRIMARY KEY,
    employee_code        TEXT NOT NULL UNIQUE,
    first_name           TEXT NOT NULL,
    last_name            TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    phone                TEXT,
    gender               TEXT CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
    date_of_birth        TEXT,
    date_joined          TEXT NOT NULL,
    department_id        INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    job_position_id      INTEGER REFERENCES job_positions(id) ON DELETE SET NULL,
    manager_id           INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    working_schedule_id  INTEGER REFERENCES working_schedules(id) ON DELETE SET NULL,
    role_id              INTEGER NOT NULL REFERENCES roles(id),
    employment_status    TEXT NOT NULL DEFAULT 'active'
                             CHECK (employment_status IN ('active', 'inactive', 'terminated')),
    bank_account_number  TEXT,
    bank_name            TEXT,
    bank_ifsc            TEXT,
    created_at           TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at           TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

-- ---------------------------------------------------------------------
-- Salary Structures & Salary Rules (payroll configuration)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_structures (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at  TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS salary_rules (
    id                  INTEGER PRIMARY KEY,
    salary_structure_id INTEGER NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    code                TEXT NOT NULL,
    category            TEXT NOT NULL
                            CHECK (category IN ('basic', 'allowance', 'gross', 'deduction', 'net', 'other')),
    sequence            INTEGER NOT NULL DEFAULT 10,
    computation_method  TEXT NOT NULL
                            CHECK (computation_method IN ('fixed', 'percentage', 'formula')),
    amount              REAL,     -- used when computation_method = 'fixed'
    percentage          REAL,     -- used when computation_method = 'percentage'
    percentage_of_code  TEXT,     -- rule code the percentage is applied to (e.g. HRA % of BASIC)
    formula             TEXT,     -- used when computation_method = 'formula'; simple expression over prior rule codes
    is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    UNIQUE (salary_structure_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_rules_structure ON salary_rules(salary_structure_id, sequence);

-- ---------------------------------------------------------------------
-- Contracts
-- Historical, period-aware. Payroll must resolve the contract whose
-- validity window covers the payroll period (see Key Business Rules in
-- README): contract.start_date <= period.end AND
-- (contract.end_date IS NULL OR contract.end_date >= period.start)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
    id                   INTEGER PRIMARY KEY,
    employee_id          INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date           TEXT NOT NULL,
    end_date             TEXT, -- NULL = open-ended / current contract
    wage                 REAL NOT NULL CHECK (wage >= 0), -- annual wage
    department_id        INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    job_position_id      INTEGER REFERENCES job_positions(id) ON DELETE SET NULL,
    working_schedule_id  INTEGER REFERENCES working_schedules(id) ON DELETE SET NULL,
    salary_structure_id  INTEGER REFERENCES salary_structures(id) ON DELETE SET NULL,
    employment_type      TEXT NOT NULL DEFAULT 'permanent'
                             CHECK (employment_type IN ('permanent', 'contract', 'intern')),
    status               TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'running', 'expired', 'cancelled')),
    created_at           TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at           TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_contracts_employee_period ON contracts(employee_id, start_date, end_date);

-- Enforce "no two RUNNING contracts may overlap for the same employee"
-- at the database layer via triggers (SQLite has no native exclusion
-- constraints). Application logic in feature/backend should still
-- re-validate this before insert/update for a friendlier error message.
CREATE TRIGGER IF NOT EXISTS trg_contracts_no_overlap_insert
BEFORE INSERT ON contracts
WHEN NEW.status = 'running'
BEGIN
    SELECT RAISE(ABORT, 'Overlapping running contract exists for this employee')
    WHERE EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.employee_id = NEW.employee_id
          AND c.status = 'running'
          AND NEW.start_date <= COALESCE(c.end_date, '9999-12-31')
          AND COALESCE(NEW.end_date, '9999-12-31') >= c.start_date
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_contracts_no_overlap_update
BEFORE UPDATE ON contracts
WHEN NEW.status = 'running'
BEGIN
    SELECT RAISE(ABORT, 'Overlapping running contract exists for this employee')
    WHERE EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.employee_id = NEW.employee_id
          AND c.status = 'running'
          AND c.id <> NEW.id
          AND NEW.start_date <= COALESCE(c.end_date, '9999-12-31')
          AND COALESCE(NEW.end_date, '9999-12-31') >= c.start_date
    );
END;

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id                  INTEGER PRIMARY KEY,
    employee_id         INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date           TEXT NOT NULL,
    check_in            TEXT,
    check_out           TEXT,
    worked_hours        REAL NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'present'
                            CHECK (status IN ('present', 'late', 'absent', 'half_day', 'on_leave')),
    is_manual_correction INTEGER NOT NULL DEFAULT 0 CHECK (is_manual_correction IN (0, 1)),
    corrected_by        INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id, work_date);

-- ---------------------------------------------------------------------
-- Time Off: Types, Allocations, Requests
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_off_types (
    id                    INTEGER PRIMARY KEY,
    name                  TEXT NOT NULL UNIQUE,
    unit                  TEXT NOT NULL DEFAULT 'days' CHECK (unit IN ('days', 'hours')),
    requires_allocation   INTEGER NOT NULL DEFAULT 1 CHECK (requires_allocation IN (0, 1)),
    affects_payroll       INTEGER NOT NULL DEFAULT 1 CHECK (affects_payroll IN (0, 1)),
    is_active             INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS leave_allocations (
    id                INTEGER PRIMARY KEY,
    employee_id       INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id  INTEGER NOT NULL REFERENCES time_off_types(id),
    allocated_amount  REAL NOT NULL CHECK (allocated_amount >= 0),
    taken_amount      REAL NOT NULL DEFAULT 0 CHECK (taken_amount >= 0),
    valid_from        TEXT NOT NULL,
    valid_to          TEXT,
    status            TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'approved', 'refused')),
    approved_by       INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at        TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_allocations_employee ON leave_allocations(employee_id, time_off_type_id);

CREATE TABLE IF NOT EXISTS time_off_requests (
    id                INTEGER PRIMARY KEY,
    employee_id       INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id  INTEGER NOT NULL REFERENCES time_off_types(id),
    allocation_id     INTEGER REFERENCES leave_allocations(id) ON DELETE SET NULL,
    start_date        TEXT NOT NULL,
    end_date          TEXT NOT NULL,
    duration          REAL NOT NULL CHECK (duration > 0),
    status            TEXT NOT NULL DEFAULT 'submitted'
                          CHECK (status IN ('draft', 'submitted', 'approved', 'refused', 'cancelled')),
    reason            TEXT,
    approved_by       INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    approved_at       TEXT,
    created_at        TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_timeoff_requests_employee ON time_off_requests(employee_id, status);

-- ---------------------------------------------------------------------
-- Payruns, Payslips, Payslip Lines, Payroll Warnings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payruns (
    id                   INTEGER PRIMARY KEY,
    name                 TEXT NOT NULL,
    salary_structure_id  INTEGER NOT NULL REFERENCES salary_structures(id),
    period_start         TEXT NOT NULL,
    period_end           TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'computed', 'validated', 'paid')),
    created_by           INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    computed_at          TEXT,
    validated_at         TEXT,
    paid_at              TEXT,
    created_at           TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (period_end >= period_start)
);

-- Employees explicitly selected into a payrun (step 2 of the wizard).
CREATE TABLE IF NOT EXISTS payrun_employees (
    id           INTEGER PRIMARY KEY,
    payrun_id    INTEGER NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE (payrun_id, employee_id)
);

CREATE TABLE IF NOT EXISTS payslips (
    id               INTEGER PRIMARY KEY,
    payrun_id        INTEGER NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_id      INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    worked_days      REAL NOT NULL DEFAULT 0,
    gross_salary     REAL NOT NULL DEFAULT 0,
    total_deductions REAL NOT NULL DEFAULT 0,
    net_salary       REAL NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'computed', 'validated', 'paid')),
    pdf_path         TEXT,
    emailed_at       TEXT,
    created_at       TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (payrun_id, employee_id) -- prevents duplicate payslips per payrun
);

CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);

CREATE TABLE IF NOT EXISTS payslip_lines (
    id             INTEGER PRIMARY KEY,
    payslip_id     INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    salary_rule_id INTEGER REFERENCES salary_rules(id) ON DELETE SET NULL,
    code           TEXT NOT NULL,
    name           TEXT NOT NULL,
    category       TEXT NOT NULL
                       CHECK (category IN ('basic', 'allowance', 'gross', 'deduction', 'net', 'other')),
    sequence       INTEGER NOT NULL DEFAULT 10,
    amount         REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payslip_lines_payslip ON payslip_lines(payslip_id, sequence);

CREATE TABLE IF NOT EXISTS payroll_warnings (
    id            INTEGER PRIMARY KEY,
    payslip_id    INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    warning_type  TEXT NOT NULL
                      CHECK (warning_type IN (
                          'missing_bank_details', 'missing_employee_info', 'duplicate_payslip',
                          'contract_conflict', 'missing_contract', 'invalid_payroll_context',
                          'missing_salary_configuration'
                      )),
    message       TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_payroll_warnings_payslip ON payroll_warnings(payslip_id);

-- ---------------------------------------------------------------------
-- updated_at maintenance triggers
-- ---------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_employees_updated_at
AFTER UPDATE ON employees
BEGIN
    UPDATE employees SET updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_contracts_updated_at
AFTER UPDATE ON contracts
BEGIN
    UPDATE contracts SET updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_attendance_updated_at
AFTER UPDATE ON attendance
BEGIN
    UPDATE attendance SET updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_timeoff_requests_updated_at
AFTER UPDATE ON time_off_requests
BEGIN
    UPDATE time_off_requests SET updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_payslips_updated_at
AFTER UPDATE ON payslips
BEGIN
    UPDATE payslips SET updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
