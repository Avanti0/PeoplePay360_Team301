-- =====================================================================
-- PeoplePay360 - Demo Seed Data
-- Branch: feature/database (owner: Maddi Soumya)
--
-- Plain SQL (per docs/spec.md's project structure: database/schema.sql
-- + database/seed.sql), so it can be run directly with psql, mounted
-- into the official postgres Docker image's /docker-entrypoint-initdb.d
-- for `docker compose up`, or run via `npm run seed` in this folder.
--
-- Uses fixed, readable UUID literals (not gen_random_uuid()) so rows
-- can reference each other directly without procedural code, and so
-- teammates can paste a literal ID while testing the API by hand.
-- Numbering scheme: <entity-prefix>0000000-0000-0000-0000-000000000NNN
--
-- Reproduces the exact worked examples from README.md:
--   - Rahul Sharma: two historical contracts, so payroll must resolve
--     the contract applicable to the selected period (not just "latest").
--   - "Regular Salary" structure producing Basic 50,000 / HRA 10,000 /
--     Transport 3,000 / Gross 63,000 / PF 6,000 / Tax 2,500 / Net 54,500.
--   - Leave allocation -> request -> approval -> balance deduction demo
--     (Allocated 20 / Taken 3 / Remaining 17 after approval).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Working Schedules
-- ---------------------------------------------------------------------
INSERT INTO working_schedules (id, name, is_active) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Standard 9-to-6 (Mon-Fri)', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'Part-Time 9-to-1 (Mon-Fri)', TRUE);

INSERT INTO schedule_lines (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes) VALUES
    ('a0000000-0000-0000-0000-000000000001', 0, TRUE,  '09:00', '18:00', 60),
    ('a0000000-0000-0000-0000-000000000001', 1, TRUE,  '09:00', '18:00', 60),
    ('a0000000-0000-0000-0000-000000000001', 2, TRUE,  '09:00', '18:00', 60),
    ('a0000000-0000-0000-0000-000000000001', 3, TRUE,  '09:00', '18:00', 60),
    ('a0000000-0000-0000-0000-000000000001', 4, TRUE,  '09:00', '18:00', 60),
    ('a0000000-0000-0000-0000-000000000001', 5, FALSE, NULL, NULL, 0),
    ('a0000000-0000-0000-0000-000000000001', 6, FALSE, NULL, NULL, 0),
    ('a0000000-0000-0000-0000-000000000002', 0, TRUE,  '09:00', '13:00', 0),
    ('a0000000-0000-0000-0000-000000000002', 1, TRUE,  '09:00', '13:00', 0),
    ('a0000000-0000-0000-0000-000000000002', 2, TRUE,  '09:00', '13:00', 0),
    ('a0000000-0000-0000-0000-000000000002', 3, TRUE,  '09:00', '13:00', 0),
    ('a0000000-0000-0000-0000-000000000002', 4, TRUE,  '09:00', '13:00', 0),
    ('a0000000-0000-0000-0000-000000000002', 5, FALSE, NULL, NULL, 0),
    ('a0000000-0000-0000-0000-000000000002', 6, FALSE, NULL, NULL, 0);

-- ---------------------------------------------------------------------
-- Salary Structures & Rules
-- "Regular Salary": Basic 50,000 | HRA 10,000 | Transport 3,000
--                   Gross 63,000 | PF 6,000 | Tax 2,500 | Net 54,500
-- ---------------------------------------------------------------------
INSERT INTO salary_structures (id, name, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Regular Salary', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'Intern Stipend', TRUE);

INSERT INTO salary_rules (salary_structure_id, name, code, category, sequence, computation_type, amount, percentage_base, percentage, formula) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Basic Salary', 'BASIC', 'basic', 10, 'fixed', 50000, NULL, NULL, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'House Rent Allowance', 'HRA', 'allowance', 20, 'fixed', 10000, NULL, NULL, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Transport Allowance', 'TRANSPORT', 'allowance', 30, 'fixed', 3000, NULL, NULL, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Gross Salary', 'GROSS', 'gross', 40, 'formula', NULL, NULL, NULL, 'BASIC + HRA + TRANSPORT'),
    ('b0000000-0000-0000-0000-000000000001', 'Provident Fund', 'PF', 'deduction', 50, 'fixed', 6000, NULL, NULL, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Professional Tax / TDS', 'TAX', 'deduction', 60, 'fixed', 2500, NULL, NULL, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Net Salary', 'NET', 'net', 70, 'formula', NULL, NULL, NULL, 'GROSS - PF - TAX'),
    ('b0000000-0000-0000-0000-000000000002', 'Stipend', 'STIPEND', 'basic', 10, 'fixed', 15000, NULL, NULL, NULL),
    ('b0000000-0000-0000-0000-000000000002', 'Net Salary', 'NET', 'net', 20, 'formula', NULL, NULL, NULL, 'STIPEND');

-- ---------------------------------------------------------------------
-- Time Off Types
-- ---------------------------------------------------------------------
INSERT INTO time_off_types (id, name, unit, requires_allocation, approval_required) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Casual Leave', 'days', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'Sick Leave', 'days', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'Earned Leave', 'days', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'Unpaid Leave', 'days', FALSE, TRUE);

-- ---------------------------------------------------------------------
-- Users (login accounts).
-- Password for all seeded demo accounts is 'Test@123' (bcrypt cost 12).
-- ---------------------------------------------------------------------
INSERT INTO users (id, username, password_hash, role) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'emp-001', '$2b$12$7BWWqZpksmA6z8key2DTJ.npLthckzLkNGXYkQxs.58DaYgcAUSp.', 'hr_manager'),
    ('d0000000-0000-0000-0000-000000000002', 'emp-002', '$2b$12$SXwVQT/PxDHv2gXtvEWV/OI3vbUYJYnRVOOaEkVOo1ZxPnn.e/hO6', 'employee'),
    ('d0000000-0000-0000-0000-000000000003', 'emp-003', '$2b$12$Rd1TkTCNg.ZI9kaNwZM.MOAPJD5a7doSXovQ.Ykuqo3j7p0Cc.qF2', 'employee'),
    ('d0000000-0000-0000-0000-000000000004', 'emp-004', '$2b$12$0g7dHEYmWPuP1lz5OKBxvOQbZ.VxgIIBZOcvGSFzPY/ynKOajLMgO', 'hr_payroll_manager'),
    ('d0000000-0000-0000-0000-000000000005', 'emp-005', '$2b$12$.wO13bw8UAlioonWOIZM2ux2OH5M/Wmmmgx5BsNcwfcTm6KCFgYjq', 'hr_payroll_user'),
    ('d0000000-0000-0000-0000-000000000006', 'emp-006', '$2b$12$8yIhk2q5rOuwP9gYjDkU/.vtgFhad5lppCFbTNalSatwQNjgwtH/G', 'employee'),
    ('d0000000-0000-0000-0000-000000000007', 'emp-007', '$2b$12$Wo/XIXASmhhZLovXIWvtweNlhVNRySDXFlLpsKStA0V1doFdDj41q', 'employee'),
    ('d0000000-0000-0000-0000-000000000008', 'emp-008', '$2b$12$YS.ihbZD3Tdz1Sosfv1NXOVzwM4T4dmgTbCE1.qVp2NeZMtukSn2K', 'employee'),
    ('d0000000-0000-0000-0000-000000000009', 'admin',   '$2b$12$xd06RwGvQC//ectF7ASfnOPb3eF6mEooaF6KtHq7FtyLEAAXDD622', 'admin');

-- ---------------------------------------------------------------------
-- Employees
-- department/job_position are plain strings (see schema.sql comment).
-- EMP-008 (Ishaan) intentionally has no bank details, to demonstrate
-- the "missing bank details" payroll warning later in this file.
-- ---------------------------------------------------------------------
INSERT INTO employees (id, user_id, name, email, department, job_position, working_schedule_id, employment_status, bank_account_number, bank_name, bank_ifsc) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Ananya Iyer',      'ananya.iyer@peoplepay360.demo',      'Human Resources',   'HR Manager',            'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-001-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Rahul Sharma',      'rahul.sharma@peoplepay360.demo',     'Engineering',       'Software Engineer',     'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-002-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'Priya Nair',        'priya.nair@peoplepay360.demo',       'Engineering',       'Engineering Manager',    'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-003-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'Vikram Rao',        'vikram.rao@peoplepay360.demo',       'Finance & Payroll', 'Payroll Manager',        'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-004-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'Sneha Deshmukh',    'sneha.deshmukh@peoplepay360.demo',   'Finance & Payroll', 'Payroll Administrator',  'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-005-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'Arjun Menon',       'arjun.menon@peoplepay360.demo',      'Sales',             'Sales Executive',        'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-006-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 'Kavya Reddy',       'kavya.reddy@peoplepay360.demo',      'Human Resources',   'HR Executive',           'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-007-BANKACC-0001', 'National Trust Bank', 'NTBK0001234'),
    ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'Ishaan Kapoor',     'ishaan.kapoor@peoplepay360.demo',    'Engineering',       'Software Engineer',     'a0000000-0000-0000-0000-000000000002', 'active', NULL, NULL, NULL),
    ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', 'Admin User',        'admin@peoplepay360.demo',            'Human Resources',   'HR Manager',             'a0000000-0000-0000-0000-000000000001', 'active', 'EMP-009-BANKACC-0001', 'National Trust Bank', 'NTBK0001234');

-- Manager hierarchy
UPDATE employees SET manager_id = 'e0000000-0000-0000-0000-000000000003' WHERE id = 'e0000000-0000-0000-0000-000000000002'; -- Rahul -> Priya
UPDATE employees SET manager_id = 'e0000000-0000-0000-0000-000000000003' WHERE id = 'e0000000-0000-0000-0000-000000000008'; -- Ishaan -> Priya
UPDATE employees SET manager_id = 'e0000000-0000-0000-0000-000000000004' WHERE id = 'e0000000-0000-0000-0000-000000000005'; -- Sneha -> Vikram
UPDATE employees SET manager_id = 'e0000000-0000-0000-0000-000000000001' WHERE id = 'e0000000-0000-0000-0000-000000000007'; -- Kavya -> Ananya
UPDATE employees SET manager_id = 'e0000000-0000-0000-0000-000000000001' WHERE id = 'e0000000-0000-0000-0000-000000000006'; -- Arjun -> Ananya

-- ---------------------------------------------------------------------
-- Contracts
-- Rahul Sharma (EMP-002) gets TWO historical contracts, exactly
-- matching the README's contract-resolution example:
--   Contract A: 01-Jan-2025 -> 31-Dec-2025, wage 8,00,000/12 (expired)
--   Contract B: 01-Jan-2026 -> (open-ended), wage 12,00,000/12 (active)
-- Payroll for March 2026 must resolve Contract B by validity window,
-- not by "whichever row was inserted last".
-- (wage is monthly per contract.md; annual figures /12, rounded)
-- ---------------------------------------------------------------------
INSERT INTO contracts (id, employee_id, date_start, date_end, wage, department, job_position, working_schedule_id, salary_structure_id, status) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', '2025-01-01', '2025-12-31', 66666.67,  'Engineering', 'Software Engineer', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'expired'),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '2026-01-01', NULL,         100000.00, 'Engineering', 'Software Engineer', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', '2022-03-01', NULL,         75000.00,  'Human Resources', 'HR Manager', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', '2021-06-15', NULL,         125000.00, 'Engineering', 'Engineering Manager', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', '2020-11-10', NULL,         116666.67, 'Finance & Payroll', 'Payroll Manager', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', '2023-02-20', NULL,         58333.33,  'Finance & Payroll', 'Payroll Administrator', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000006', '2024-07-01', NULL,         50000.00,  'Sales', 'Sales Executive', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000007', '2024-09-05', NULL,         45833.33,  'Human Resources', 'HR Executive', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'active'),
    ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000008', '2026-01-15', '2026-07-14', 15000.00,  'Engineering', 'Software Engineer', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'active');

-- ---------------------------------------------------------------------
-- Attendance: last 14 calendar days for every active employee,
-- Mon-Fri only, with a few realistic exceptions.
-- ---------------------------------------------------------------------
INSERT INTO attendance (employee_id, check_in, check_out, worked_hours, status, is_manual, note)
SELECT e.id::uuid,
       d::date + TIME '09:05',
       d::date + TIME '18:10',
       8.08,
       'present',
       FALSE,
       NULL
FROM (VALUES
    ('e0000000-0000-0000-0000-000000000001'), ('e0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000003'), ('e0000000-0000-0000-0000-000000000004'),
    ('e0000000-0000-0000-0000-000000000005'), ('e0000000-0000-0000-0000-000000000006'),
    ('e0000000-0000-0000-0000-000000000007'), ('e0000000-0000-0000-0000-000000000008')
) AS e(id)
CROSS JOIN LATERAL (
    SELECT generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day'::interval) AS d
) AS days
WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5; -- Monday(1)..Friday(5)

-- A few realistic exceptions layered on top of the "present" baseline above.
UPDATE attendance SET status = 'late', check_in = (check_in::date + TIME '10:35'), worked_hours = 6.58
WHERE employee_id = 'e0000000-0000-0000-0000-000000000002' AND check_in::date = CURRENT_DATE - 2;

UPDATE attendance SET status = 'overtime', check_out = (check_out::date + TIME '21:30'), worked_hours = 11.42
WHERE employee_id = 'e0000000-0000-0000-0000-000000000003' AND check_in::date = CURRENT_DATE - 3;

UPDATE attendance SET status = 'absent', check_in = NULL, check_out = NULL, worked_hours = 0
WHERE employee_id = 'e0000000-0000-0000-0000-000000000006' AND check_in::date = CURRENT_DATE - 5;

UPDATE attendance SET check_out = NULL, worked_hours = NULL, is_manual = TRUE, note = 'Missing check-out, corrected by HR pending employee confirmation'
WHERE employee_id = 'e0000000-0000-0000-0000-000000000008' AND check_in::date = CURRENT_DATE - 1;

-- ---------------------------------------------------------------------
-- Time Off: allocation -> request -> approval -> balance demo
-- (matches README Scenario 2 exactly: 20 allocated, 3 taken,
-- 17 remaining after approval)
-- ---------------------------------------------------------------------
INSERT INTO allocations (id, employee_id, time_off_type_id, number_of_days, date_from, date_to, status) VALUES
    ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 20, '2026-01-01', '2026-12-31', 'approved'),
    ('10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 12, '2026-01-01', '2026-12-31', 'approved'),
    ('10000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 18, '2026-01-01', '2026-12-31', 'approved'),
    ('10000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 18, '2026-01-01', '2026-12-31', 'approved'),
    ('10000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 18, '2026-01-01', '2026-12-31', 'approved'),
    ('10000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 18, '2026-01-01', '2026-12-31', 'approved'),
    ('10000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', 18, '2026-01-01', '2026-12-31', 'approved');

INSERT INTO time_off_requests (employee_id, time_off_type_id, allocation_id, date_from, date_to, duration, status, note) VALUES
    ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '2026-08-10', '2026-08-12', 3, 'approved', 'Family function'),
    ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '2026-09-15', '2026-09-16', 2, 'confirmed', 'Personal work');

-- ---------------------------------------------------------------------
-- Payrun 1: March 2026, fully processed through "paid" - the
-- historical, immutable record demonstrating the full lifecycle and
-- the Contract B resolution for Rahul Sharma.
-- ---------------------------------------------------------------------
INSERT INTO payruns (id, name, salary_structure_id, period_start, period_end, status) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Payrun - March 2026', 'b0000000-0000-0000-0000-000000000001', '2026-03-01', '2026-03-31', 'paid');

INSERT INTO payrun_employees (payrun_id, employee_id) VALUES
    ('20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004'),
    ('20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005');

-- Rahul Sharma's payslip uses Contract B (active, wage 1,00,000/mo)
-- and reproduces the README's exact worked example.
INSERT INTO payslips (id, payrun_id, employee_id, contract_id, period_start, period_end, worked_days, gross_salary, net_salary, status, warnings) VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', '2026-03-01', '2026-03-31', 22, 63000, 54500, 'paid', '[]'::jsonb),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', '2026-03-01', '2026-03-31', 22, 63000, 54500, 'paid', '[]'::jsonb),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000004', '2026-03-01', '2026-03-31', 22, 150000, 128000, 'paid', '[]'::jsonb),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000005', '2026-03-01', '2026-03-31', 22, 140000, 119500, 'paid', '[]'::jsonb),
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000006', '2026-03-01', '2026-03-31', 22, 70000, 59500, 'paid', '[]'::jsonb);

INSERT INTO payslip_lines (payslip_id, salary_rule_id, name, code, category, sequence, amount)
SELECT '30000000-0000-0000-0000-000000000001', sr.id, sr.name, sr.code, sr.category, sr.sequence,
       CASE sr.code
           WHEN 'BASIC' THEN 50000
           WHEN 'HRA' THEN 10000
           WHEN 'TRANSPORT' THEN 3000
           WHEN 'GROSS' THEN 63000
           WHEN 'PF' THEN -6000
           WHEN 'TAX' THEN -2500
           WHEN 'NET' THEN 54500
       END
FROM salary_rules sr
WHERE sr.salary_structure_id = 'b0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- Payrun 2: April 2026, still in draft - lets the frontend demo the
-- two-step wizard (scope already chosen; employee selection under way)
-- plus the compute/validate actions.
-- ---------------------------------------------------------------------
INSERT INTO payruns (id, name, salary_structure_id, period_start, period_end, status) VALUES
    ('20000000-0000-0000-0000-000000000002', 'Payrun - April 2026', 'b0000000-0000-0000-0000-000000000001', '2026-04-01', '2026-04-30', 'draft');

INSERT INTO payrun_employees (payrun_id, employee_id) VALUES
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000007'),
    ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008');

-- EMP-008 (Ishaan) intentionally has no bank details on file, so his
-- computed payslip already carries the warning payroll.md describes -
-- gives the dashboard/validation UI something real to render immediately.
INSERT INTO payslips (id, payrun_id, employee_id, contract_id, period_start, period_end, worked_days, gross_salary, net_salary, status, warnings) VALUES
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000009', '2026-04-01', '2026-04-30', 10, 7500, 7500, 'computed',
     '["Employee missing bank details"]'::jsonb);

COMMIT;
