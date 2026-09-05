# PeoplePay360 — Requirements

---

## Functional Requirements

### FR-01: Employee Management
- Create, read, update, deactivate employee records
- Fields: name, email, phone, department, job position, manager, working schedule, employment status
- View related contracts, attendance, time off from the employee record
- Support Kanban and List views

### FR-02: Contract Management
- Link multiple contracts to one employee (historical records)
- Fields: date_start, date_end, wage, department, job position, salary structure, status
- Only one active contract per employee at any point in time
- Payroll must resolve the contract whose period overlaps the payrun period

### FR-03: Working Schedules
- Define weekly patterns: day, start_time, end_time, break duration
- Auto-calculate total weekly hours from schedule lines
- Assign schedules to employees or contracts

### FR-04: Attendance Tracking
- Record check_in, check_out per employee per day
- Calculate worked_hours automatically
- Flag exceptions (missing check-out, overtime, late arrival)
- Allow manual corrections by authorized roles only

### FR-05: Time Off Types & Allocations
- Configure leave types: unit (days/hours), requires allocation, approval workflow
- Allocations grant balance to employees; require approval before usable
- Track: allocated, taken, remaining, validity period

### FR-06: Time Off Requests
- Employee submits request with type, dates, duration
- Approval workflow: draft → confirmed → approved / refused
- Approved requests auto-deduct from allocation balance

### FR-07: Salary Structures
- Container for an ordered set of salary rules
- Assign a structure to a contract
- Payrun uses the structure from the resolved contract

### FR-08: Salary Rules
- Fields: name, code, category, sequence, computation method (fixed / percentage / formula)
- Categories: Basic, Allowance, Gross, Deduction, Net
- Rules execute in sequence order; later rules can reference earlier results by code
- Drive the actual line items on a payslip

### FR-09: Payrun Processing
- Two-step wizard: Step 1 — select salary structure + period; Step 2 — select employees
- Payrun lifecycle: draft → computed → validated → paid
- Compute generates payslips for all selected employees
- Validation surfaces warnings: missing bank details, duplicate payslips, contract issues
- Finalized payruns are immutable historical records

### FR-10: Payslip Generation
- Per-employee breakdown of salary rule lines (Basic, Allowances, Deductions, Gross, Net)
- Uses the contract valid for the payrun period + the payrun's salary structure
- Print individual payslip as PDF
- Bulk email payslips from the payrun

### FR-11: Payroll Dashboard
- KPI cards: Total Net Salary Paid, Payslips Generated, Average Salary, Approved Time Off, Attendance Health
- Charts: Salary Cost by Department, Monthly Net Salary Trend
- Alerts: payroll warnings, missing data, duplicate payslips, contract issues
- Filters: period, department, employee type
- All data live from actual system records — no static charts

### FR-12: Role-Based Access Control
| Role               | Access                                                                 |
|--------------------|------------------------------------------------------------------------|
| Employee           | View own records; create attendance and time off requests              |
| HR Manager         | Full CRUD on employees, attendance, contracts, schedules, time off; approve/refuse leave |
| HR Payroll User    | HR Manager permissions + create/read/update payruns and payslips; read-only salary structures/rules |
| HR Payroll Manager | HR Payroll User permissions + full CRUD on payruns, payslips, salary structures, rules |
| Admin              | Full access to all modules + user management and role assignment       |

---

## Non-Functional Requirements

- **NFR-01:** API response time under 500ms for standard CRUD operations
- **NFR-02:** JWT access tokens expire in 15 minutes; refresh tokens in 7 days
- **NFR-03:** Passwords stored as bcrypt hashes — never plaintext
- **NFR-04:** All payroll computation logic in application code — no hardcoded salary values
- **NFR-05:** Finalized (validated/paid) payruns and payslips cannot be edited or deleted
- **NFR-06:** Docker Compose must bring up the full stack (db + backend + frontend) with a single command
- **NFR-07:** Database migrations versioned and repeatable
- **NFR-08:** All API endpoints protected by authentication except `/api/v1/auth/login`
