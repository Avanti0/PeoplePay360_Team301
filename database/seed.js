/**
 * Seeds the local PostgreSQL database with realistic demo data so the
 * feature/backend and feature/frontend branches can develop and demo
 * against real, dynamic records instead of static JSON fixtures.
 *
 * Mirrors the scenarios described in README.md:
 *   - Rahul Sharma: two historical contracts, so payroll must resolve
 *     the contract applicable to the selected period (not just "latest").
 *   - A "Regular Salary" structure with Basic/HRA/Transport/Gross/PF/Tax/Net
 *     rules producing the exact example numbers from the README.
 *   - A leave allocation -> request -> approval -> balance deduction demo
 *     (Allocated 20 / Taken 3 / Remaining 17 after approval).
 *   - A fully paid historical payrun plus a draft payrun in progress.
 *
 * Usage: npm run seed   (run migrate first, or use `npm run reset`)
 */
const { Client } = require("pg");
const { PG_CONFIG } = require("./config");

async function run(client, sql, params = []) {
    const { rows } = await client.query(`${sql} RETURNING id`, params);
    return rows[0].id;
}

async function exec(client, sql, params = []) {
    await client.query(sql, params);
}

async function seed() {
    const client = new Client(PG_CONFIG);
    await client.connect();

    try {
        await client.query("BEGIN");

        // -------------------------------------------------------------
        // Roles
        // -------------------------------------------------------------
        const roleId = {};
        for (const [name, description] of [
            ["employee", "Own employee information, attendance, leave"],
            ["hr_manager", "HR records, contracts, schedules, attendance, time off"],
            ["hr_payroll_user", "HR operations + Payruns/Payslips (read-only salary config)"],
            ["hr_payroll_manager", "Full HR and Payroll configuration"],
            ["admin", "Complete platform administration"],
        ]) {
            roleId[name] = await run(
                client,
                "INSERT INTO roles (name, description) VALUES ($1, $2)",
                [name, description]
            );
        }

        // -------------------------------------------------------------
        // Working Schedules
        // -------------------------------------------------------------
        const scheduleFullTime = await run(
            client,
            "INSERT INTO working_schedules (name, schedule_type) VALUES ($1, $2)",
            ["Standard 9-to-6 (Mon-Fri)", "full_time"]
        );
        for (let day = 0; day <= 4; day++) {
            await exec(
                client,
                `INSERT INTO working_schedule_lines
                 (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes)
                 VALUES ($1, $2, TRUE, '09:00', '18:00', 60)`,
                [scheduleFullTime, day]
            );
        }
        for (const day of [5, 6]) {
            await exec(
                client,
                `INSERT INTO working_schedule_lines
                 (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes)
                 VALUES ($1, $2, FALSE, NULL, NULL, 0)`,
                [scheduleFullTime, day]
            );
        }

        const schedulePartTime = await run(
            client,
            "INSERT INTO working_schedules (name, schedule_type) VALUES ($1, $2)",
            ["Part-Time 9-to-1 (Mon-Fri)", "part_time"]
        );
        for (let day = 0; day <= 4; day++) {
            await exec(
                client,
                `INSERT INTO working_schedule_lines
                 (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes)
                 VALUES ($1, $2, TRUE, '09:00', '13:00', 0)`,
                [schedulePartTime, day]
            );
        }
        for (const day of [5, 6]) {
            await exec(
                client,
                `INSERT INTO working_schedule_lines
                 (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes)
                 VALUES ($1, $2, FALSE, NULL, NULL, 0)`,
                [schedulePartTime, day]
            );
        }

        // -------------------------------------------------------------
        // Departments
        // -------------------------------------------------------------
        const deptId = {};
        for (const name of ["Engineering", "Human Resources", "Finance & Payroll", "Sales"]) {
            deptId[name] = await run(
                client,
                "INSERT INTO departments (name, code) VALUES ($1, $2)",
                [name, name.split(/[\s&]+/).map((w) => w[0]).join("").toUpperCase()]
            );
        }

        // -------------------------------------------------------------
        // Job Positions
        // -------------------------------------------------------------
        const posId = {};
        const positions = [
            ["Software Engineer", "Engineering"],
            ["Engineering Manager", "Engineering"],
            ["HR Executive", "Human Resources"],
            ["HR Manager", "Human Resources"],
            ["Payroll Administrator", "Finance & Payroll"],
            ["Payroll Manager", "Finance & Payroll"],
            ["Sales Executive", "Sales"],
        ];
        for (const [title, dept] of positions) {
            posId[title] = await run(
                client,
                "INSERT INTO job_positions (title, department_id) VALUES ($1, $2)",
                [title, deptId[dept]]
            );
        }

        // -------------------------------------------------------------
        // Salary Structure: "Regular Salary" (matches README example)
        //   Basic 50,000 | HRA 10,000 | Transport Allowance 3,000
        //   Gross 63,000 | PF 6,000 | Tax 2,500 | Net 54,500
        // -------------------------------------------------------------
        const regularStructureId = await run(
            client,
            "INSERT INTO salary_structures (name, code, description) VALUES ($1, $2, $3)",
            ["Regular Salary", "REGULAR", "Standard monthly salary structure for full-time employees"]
        );

        const salaryRules = [
            ["Basic Salary", "BASIC", "basic", 10, "fixed", 50000, null, null, null],
            ["House Rent Allowance", "HRA", "allowance", 20, "fixed", 10000, null, null, null],
            ["Transport Allowance", "TRANSPORT", "allowance", 30, "fixed", 3000, null, null, null],
            ["Gross Salary", "GROSS", "gross", 40, "formula", null, null, null, "BASIC + HRA + TRANSPORT"],
            ["Provident Fund", "PF", "deduction", 50, "fixed", 6000, null, null, null],
            ["Professional Tax / TDS", "TAX", "deduction", 60, "fixed", 2500, null, null, null],
            ["Net Salary", "NET", "net", 70, "formula", null, null, null, "GROSS - PF - TAX"],
        ];
        for (const [name, code, category, sequence, method, amount, pct, pctOf, formula] of salaryRules) {
            await exec(
                client,
                `INSERT INTO salary_rules
                 (salary_structure_id, name, code, category, sequence, computation_method, amount, percentage, percentage_of_code, formula)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [regularStructureId, name, code, category, sequence, method, amount, pct, pctOf, formula]
            );
        }

        // A second, simpler structure to show configurability across roles.
        const internStructureId = await run(
            client,
            "INSERT INTO salary_structures (name, code, description) VALUES ($1, $2, $3)",
            ["Intern Stipend", "INTERN", "Fixed monthly stipend structure for interns"]
        );
        for (const [name, code, category, sequence, method, amount, formula] of [
            ["Stipend", "STIPEND", "basic", 10, "fixed", 15000, null],
            ["Net Salary", "NET", "net", 20, "formula", null, "STIPEND"],
        ]) {
            await exec(
                client,
                `INSERT INTO salary_rules
                 (salary_structure_id, name, code, category, sequence, computation_method, amount, formula)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [internStructureId, name, code, category, sequence, method, amount, formula]
            );
        }

        // -------------------------------------------------------------
        // Time Off Types
        // -------------------------------------------------------------
        const timeOffTypeId = {};
        for (const [name, unit, requiresAllocation] of [
            ["Casual Leave", "days", true],
            ["Sick Leave", "days", true],
            ["Earned Leave", "days", true],
            ["Unpaid Leave", "days", false],
        ]) {
            timeOffTypeId[name] = await run(
                client,
                "INSERT INTO time_off_types (name, unit, requires_allocation) VALUES ($1, $2, $3)",
                [name, unit, requiresAllocation]
            );
        }

        // -------------------------------------------------------------
        // Employees
        // employees.role_id refers to roles table; department/position/
        // schedule wired above. manager_id is patched in a second pass
        // once all employee ids are known.
        // -------------------------------------------------------------
        const employees = [
            // code, first, last, email, dept, position, schedule, role, joined
            ["EMP-001", "Ananya", "Iyer", "ananya.iyer@peoplepay360.demo", "Human Resources", "HR Manager", scheduleFullTime, "hr_manager", "2022-03-01"],
            ["EMP-002", "Rahul", "Sharma", "rahul.sharma@peoplepay360.demo", "Engineering", "Software Engineer", scheduleFullTime, "employee", "2025-01-01"],
            ["EMP-003", "Priya", "Nair", "priya.nair@peoplepay360.demo", "Engineering", "Engineering Manager", scheduleFullTime, "employee", "2021-06-15"],
            ["EMP-004", "Vikram", "Rao", "vikram.rao@peoplepay360.demo", "Finance & Payroll", "Payroll Manager", scheduleFullTime, "hr_payroll_manager", "2020-11-10"],
            ["EMP-005", "Sneha", "Deshmukh", "sneha.deshmukh@peoplepay360.demo", "Finance & Payroll", "Payroll Administrator", scheduleFullTime, "hr_payroll_user", "2023-02-20"],
            ["EMP-006", "Arjun", "Menon", "arjun.menon@peoplepay360.demo", "Sales", "Sales Executive", scheduleFullTime, "employee", "2024-07-01"],
            ["EMP-007", "Kavya", "Reddy", "kavya.reddy@peoplepay360.demo", "Human Resources", "HR Executive", scheduleFullTime, "employee", "2024-09-05"],
            ["EMP-008", "Ishaan", "Kapoor", "ishaan.kapoor@peoplepay360.demo", "Engineering", "Software Engineer", schedulePartTime, "employee", "2026-01-15"],
            ["EMP-009", "Admin", "User", "admin@peoplepay360.demo", "Human Resources", "HR Manager", scheduleFullTime, "admin", "2020-01-01"],
        ];

        const empId = {};
        for (const [code, first, last, email, dept, position, schedule, roleName, joined] of employees) {
            empId[code] = await run(
                client,
                `INSERT INTO employees
                 (employee_code, first_name, last_name, email, date_joined,
                  department_id, job_position_id, working_schedule_id, role_id,
                  bank_account_number, bank_name, bank_ifsc)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    code, first, last, email, joined,
                    deptId[dept], posId[position], schedule, roleId[roleName],
                    // EMP-008 intentionally left without bank details to
                    // demonstrate the "missing bank details" payroll warning.
                    code === "EMP-008" ? null : `${code}-BANKACC-0001`,
                    code === "EMP-008" ? null : "National Trust Bank",
                    code === "EMP-008" ? null : "NTBK0001234",
                ]
            );
        }

        // Manager hierarchy
        const managerLinks = [
            ["EMP-002", "EMP-003"], // Rahul -> Priya (Engineering Manager)
            ["EMP-008", "EMP-003"], // Ishaan -> Priya
            ["EMP-005", "EMP-004"], // Sneha -> Vikram
            ["EMP-007", "EMP-001"], // Kavya -> Ananya
            ["EMP-006", "EMP-001"], // Arjun -> Ananya (demo cross-dept reporting)
        ];
        for (const [emp, manager] of managerLinks) {
            await exec(client, "UPDATE employees SET manager_id = $1 WHERE id = $2", [empId[manager], empId[emp]]);
        }
        await exec(client, "UPDATE departments SET manager_id = $1 WHERE name = 'Engineering'", [empId["EMP-003"]]);
        await exec(client, "UPDATE departments SET manager_id = $1 WHERE name = 'Human Resources'", [empId["EMP-001"]]);
        await exec(client, "UPDATE departments SET manager_id = $1 WHERE name = 'Finance & Payroll'", [empId["EMP-004"]]);

        // Users (login accounts), one per employee, demo password hash placeholder.
        // feature/backend should replace this with real bcrypt/argon2 hashing.
        for (const code of Object.keys(empId)) {
            const username = code.toLowerCase();
            await exec(
                client,
                `INSERT INTO users (username, password_hash, role_id, employee_id)
                 VALUES ($1, $2, (SELECT role_id FROM employees WHERE id = $3), $3)`,
                [username, "DEMO_HASH_CHANGE_ME", empId[code]]
            );
        }

        // -------------------------------------------------------------
        // Contracts
        // Rahul Sharma (EMP-002) gets TWO historical contracts, exactly
        // matching the README's contract-resolution example:
        //   Contract A: 01-Jan-2025 -> 31-Dec-2025, wage 8,00,000 (expired)
        //   Contract B: 01-Jan-2026 -> (open-ended), wage 12,00,000 (running)
        // Payroll for March 2026 must resolve Contract B, not "the latest
        // created row" by coincidence -- both resolve the same way here,
        // which is exactly why the resolver must use the validity window.
        // -------------------------------------------------------------
        const contractId = {};
        contractId["EMP-002-A"] = await run(
            client,
            `INSERT INTO contracts
             (employee_id, start_date, end_date, wage, department_id, job_position_id,
              working_schedule_id, salary_structure_id, employment_type, status)
             VALUES ($1, '2025-01-01', '2025-12-31', 800000, $2, $3, $4, $5, 'permanent', 'expired')`,
            [empId["EMP-002"], deptId["Engineering"], posId["Software Engineer"], scheduleFullTime, regularStructureId]
        );
        contractId["EMP-002-B"] = await run(
            client,
            `INSERT INTO contracts
             (employee_id, start_date, end_date, wage, department_id, job_position_id,
              working_schedule_id, salary_structure_id, employment_type, status)
             VALUES ($1, '2026-01-01', NULL, 1200000, $2, $3, $4, $5, 'permanent', 'running')`,
            [empId["EMP-002"], deptId["Engineering"], posId["Software Engineer"], scheduleFullTime, regularStructureId]
        );

        // Straightforward single running contract for the rest of the staff.
        const simpleContracts = [
            ["EMP-001", "2022-03-01", 900000, "Human Resources", "HR Manager"],
            ["EMP-003", "2021-06-15", 1500000, "Engineering", "Engineering Manager"],
            ["EMP-004", "2020-11-10", 1400000, "Finance & Payroll", "Payroll Manager"],
            ["EMP-005", "2023-02-20", 700000, "Finance & Payroll", "Payroll Administrator"],
            ["EMP-006", "2024-07-01", 600000, "Sales", "Sales Executive"],
            ["EMP-007", "2024-09-05", 550000, "Human Resources", "HR Executive"],
        ];
        for (const [code, start, wage, dept, position] of simpleContracts) {
            await exec(
                client,
                `INSERT INTO contracts
                 (employee_id, start_date, end_date, wage, department_id, job_position_id,
                  working_schedule_id, salary_structure_id, employment_type, status)
                 VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, 'permanent', 'running')`,
                [empId[code], start, wage, deptId[dept], posId[position], scheduleFullTime, regularStructureId]
            );
        }
        // Ishaan Kapoor: intern on the part-time schedule + intern stipend structure.
        await exec(
            client,
            `INSERT INTO contracts
             (employee_id, start_date, end_date, wage, department_id, job_position_id,
              working_schedule_id, salary_structure_id, employment_type, status)
             VALUES ($1, '2026-01-15', '2026-07-14', 180000, $2, $3, $4, $5, 'intern', 'running')`,
            [empId["EMP-008"], deptId["Engineering"], posId["Software Engineer"], schedulePartTime, internStructureId]
        );

        // -------------------------------------------------------------
        // Attendance: last 14 calendar days for every employee, Mon-Fri
        // only, with a couple of realistic exceptions.
        // -------------------------------------------------------------
        const today = new Date();
        const isoDate = (d) => d.toISOString().slice(0, 10);

        const workDates = [];
        for (let offset = 13; offset >= 0; offset--) {
            const d = new Date(today);
            d.setDate(d.getDate() - offset);
            const dow = d.getDay(); // 0 Sun .. 6 Sat
            if (dow !== 0 && dow !== 6) workDates.push(isoDate(d));
        }

        const activeEmployeeCodes = Object.keys(empId).filter((c) => c !== "EMP-009");
        let attendanceExceptionToggle = 0;
        for (const code of activeEmployeeCodes) {
            for (const date of workDates) {
                attendanceExceptionToggle++;
                let checkIn = "09:05:00";
                let checkOut = "18:10:00";
                let status = "present";
                let workedHours = 8.08;
                let isManual = false;

                // Sprinkle in some exceptions for dashboard/demo purposes.
                if (attendanceExceptionToggle % 17 === 0) {
                    // Late arrival
                    checkIn = "10:35:00";
                    status = "late";
                    workedHours = 6.58;
                } else if (attendanceExceptionToggle % 23 === 0) {
                    // Missing check-out, later manually corrected by HR.
                    checkOut = null;
                    status = "half_day";
                    workedHours = 4;
                    isManual = true;
                } else if (attendanceExceptionToggle % 29 === 0) {
                    // Absence
                    checkIn = null;
                    checkOut = null;
                    status = "absent";
                    workedHours = 0;
                }

                await exec(
                    client,
                    `INSERT INTO attendance
                     (employee_id, work_date, check_in, check_out, worked_hours, status, is_manual_correction, corrected_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        empId[code],
                        date,
                        checkIn ? `${date}T${checkIn}` : null,
                        checkOut ? `${date}T${checkOut}` : null,
                        workedHours,
                        status,
                        isManual,
                        isManual ? empId["EMP-001"] : null,
                    ]
                );
            }
        }

        // -------------------------------------------------------------
        // Time Off: allocation -> request -> approval -> balance demo
        // (matches README Scenario 2 exactly: 20 allocated, 3 taken,
        // 17 remaining after approval)
        // -------------------------------------------------------------
        const rahulEarnedLeaveAllocationId = await run(
            client,
            `INSERT INTO leave_allocations
             (employee_id, time_off_type_id, allocated_amount, taken_amount, valid_from, valid_to, status, approved_by)
             VALUES ($1, $2, 20, 3, '2026-01-01', '2026-12-31', 'approved', $3)`,
            [empId["EMP-002"], timeOffTypeId["Earned Leave"], empId["EMP-003"]]
        );
        await exec(
            client,
            `INSERT INTO time_off_requests
             (employee_id, time_off_type_id, allocation_id, start_date, end_date, duration, status, reason, approved_by, approved_at)
             VALUES ($1, $2, $3, '2026-08-10', '2026-08-12', 3, 'approved', 'Family function', $4, '2026-08-05T10:00:00Z')`,
            [empId["EMP-002"], timeOffTypeId["Earned Leave"], rahulEarnedLeaveAllocationId, empId["EMP-003"]]
        );

        // A pending request awaiting HR action, for demoing the approval flow live.
        const priyaAllocationId = await run(
            client,
            `INSERT INTO leave_allocations
             (employee_id, time_off_type_id, allocated_amount, taken_amount, valid_from, valid_to, status, approved_by)
             VALUES ($1, $2, 12, 0, '2026-01-01', '2026-12-31', 'approved', $3)`,
            [empId["EMP-006"], timeOffTypeId["Casual Leave"], empId["EMP-001"]]
        );
        await exec(
            client,
            `INSERT INTO time_off_requests
             (employee_id, time_off_type_id, allocation_id, start_date, end_date, duration, status, reason)
             VALUES ($1, $2, $3, '2026-09-15', '2026-09-16', 2, 'submitted', 'Personal work')`,
            [empId["EMP-006"], timeOffTypeId["Casual Leave"], priyaAllocationId]
        );

        // Baseline allocations for everyone else so leave balances render sensibly.
        for (const code of ["EMP-001", "EMP-003", "EMP-004", "EMP-005", "EMP-007"]) {
            await exec(
                client,
                `INSERT INTO leave_allocations
                 (employee_id, time_off_type_id, allocated_amount, taken_amount, valid_from, valid_to, status, approved_by)
                 VALUES ($1, $2, 18, 0, '2026-01-01', '2026-12-31', 'approved', $3)`,
                [empId[code], timeOffTypeId["Earned Leave"], empId["EMP-001"]]
            );
        }

        // -------------------------------------------------------------
        // Payrun 1: March 2026, fully processed through "paid" -- this is
        // the historical, immutable record demonstrating the full
        // lifecycle and the Contract B resolution for Rahul Sharma.
        // -------------------------------------------------------------
        const march2026PayrunId = await run(
            client,
            `INSERT INTO payruns
             (name, salary_structure_id, period_start, period_end, status, created_by, computed_at, validated_at, paid_at)
             VALUES ($1, $2, '2026-03-01', '2026-03-31', 'paid', $3, '2026-04-01T09:00:00Z', '2026-04-01T11:00:00Z', '2026-04-02T09:00:00Z')`,
            [`Payrun - March 2026`, regularStructureId, empId["EMP-005"]]
        );

        const marchPayslipEmployees = ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005"];
        for (const code of marchPayslipEmployees) {
            await exec(
                client,
                "INSERT INTO payrun_employees (payrun_id, employee_id) VALUES ($1, $2)",
                [march2026PayrunId, empId[code]]
            );
        }

        // Rahul Sharma's payslip uses Contract B (running, wage 12,00,000)
        // and reproduces the README's exact worked example.
        const rahulPayslipId = await run(
            client,
            `INSERT INTO payslips
             (payrun_id, employee_id, contract_id, worked_days, gross_salary, total_deductions, net_salary, status)
             VALUES ($1, $2, $3, 22, 63000, 8500, 54500, 'paid')`,
            [march2026PayrunId, empId["EMP-002"], contractId["EMP-002-B"]]
        );
        const rahulLines = [
            ["BASIC", "Basic Salary", "basic", 10, 50000],
            ["HRA", "House Rent Allowance", "allowance", 20, 10000],
            ["TRANSPORT", "Transport Allowance", "allowance", 30, 3000],
            ["GROSS", "Gross Salary", "gross", 40, 63000],
            ["PF", "Provident Fund", "deduction", 50, -6000],
            ["TAX", "Professional Tax / TDS", "deduction", 60, -2500],
            ["NET", "Net Salary", "net", 70, 54500],
        ];
        for (const [code, name, category, sequence, amount] of rahulLines) {
            await exec(
                client,
                `INSERT INTO payslip_lines (payslip_id, salary_rule_id, code, name, category, sequence, amount)
                 VALUES ($1, (SELECT id FROM salary_rules WHERE salary_structure_id = $2 AND code = $3), $3, $4, $5, $6, $7)`,
                [rahulPayslipId, regularStructureId, code, name, category, sequence, amount]
            );
        }

        // Simplified payslips (same structure/rules) for the remaining March payrun members.
        const otherMarchPayslips = [
            ["EMP-001", 22, 63000, 8500, 54500],
            ["EMP-003", 22, 150000, 22000, 128000],
            ["EMP-004", 22, 140000, 20500, 119500],
            ["EMP-005", 22, 70000, 10500, 59500],
        ];
        for (const [code, workedDays, gross, deductions, net] of otherMarchPayslips) {
            const { rows } = await client.query(
                "SELECT id FROM contracts WHERE employee_id = $1 AND status = 'running' LIMIT 1",
                [empId[code]]
            );
            const contractRow = rows[0];
            await exec(
                client,
                `INSERT INTO payslips
                 (payrun_id, employee_id, contract_id, worked_days, gross_salary, total_deductions, net_salary, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid')`,
                [march2026PayrunId, empId[code], contractRow ? contractRow.id : null, workedDays, gross, deductions, net]
            );
        }

        // -------------------------------------------------------------
        // Payrun 2: April 2026, still in draft -- lets the frontend
        // demo the two-step wizard (scope selection already done here;
        // employee selection has begun) plus compute/validate actions.
        // -------------------------------------------------------------
        const april2026PayrunId = await run(
            client,
            `INSERT INTO payruns
             (name, salary_structure_id, period_start, period_end, status, created_by)
             VALUES ($1, $2, '2026-04-01', '2026-04-30', 'draft', $3)`,
            [`Payrun - April 2026`, regularStructureId, empId["EMP-005"]]
        );
        for (const code of ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005", "EMP-006", "EMP-007"]) {
            await exec(
                client,
                "INSERT INTO payrun_employees (payrun_id, employee_id) VALUES ($1, $2)",
                [april2026PayrunId, empId[code]]
            );
        }
        // EMP-008 (Ishaan) intentionally has no bank details on file, so once
        // a payslip is computed for him the validation engine should raise
        // a "missing_bank_details" warning -- pre-seed that warning here so
        // the dashboard/validation UI has something to render immediately.
        const ishaanDraftPayslipId = await run(
            client,
            `INSERT INTO payslips
             (payrun_id, employee_id, contract_id, worked_days, gross_salary, total_deductions, net_salary, status)
             VALUES ($1, $2, (SELECT id FROM contracts WHERE employee_id = $2), 10, 7500, 0, 7500, 'computed')`,
            [april2026PayrunId, empId["EMP-008"]]
        );
        await exec(
            client,
            `INSERT INTO payrun_employees (payrun_id, employee_id) VALUES ($1, $2)`,
            [april2026PayrunId, empId["EMP-008"]]
        );
        await exec(
            client,
            `INSERT INTO payroll_warnings (payslip_id, warning_type, message)
             VALUES ($1, 'missing_bank_details', 'Ishaan Kapoor has no bank account on file; payslip cannot be marked paid until resolved.')`,
            [ishaanDraftPayslipId]
        );

        await client.query("COMMIT");
        console.log(`Seed data inserted successfully into database "${PG_CONFIG.database}"`);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    seed().catch((err) => {
        console.error("Seeding failed:", err.message);
        process.exit(1);
    });
}

module.exports = { seed };
