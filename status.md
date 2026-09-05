# PeoplePay360 — Project Status & Sync File

This file lives on `main`. Update it every time you reach a meaningful commit point and when merging to main.

---

## Tech Stack (Finalized)

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | Python + FastAPI                    |
| Frontend       | React + TypeScript                  |
| Database       | PostgreSQL                          |
| API Style      | REST                                |
| Authentication | JWT + Refresh Tokens                |
| Authorization  | RBAC (5 roles)                      |
| PDF Generation | TBD                                 |
| Email          | TBD                                 |
| Deployment     | Docker Compose                      |
| Dev Environment| WSL 2 + Ubuntu + VS Code            |

---

## Branches

| Branch             | Owner                | Responsibility        |
|--------------------|----------------------|-----------------------|
| `feature/backend`  | Avanti Dharmapurikar | API + Business Logic  |
| `feature/frontend` | T. Lakshmi Vyshnavi  | UI                    |
| `feature/database` | Maddi Soumya         | Schema + Seed Data    |

---

## Naming Conventions (Everyone Must Follow)

- **Database / Backend (Python):** `snake_case`
- **Frontend (TypeScript/React):** `camelCase`
- **API routes:** `/api/v1/<resource>` (plural, snake_case)

### Model / Table Names

| Entity           | Table Name         |
|------------------|--------------------|
| Employee         | `employees`        |
| Contract         | `contracts`        |
| Working Schedule | `working_schedules`|
| Schedule Line    | `schedule_lines`   |
| Attendance       | `attendance`       |
| Time Off Type    | `time_off_types`   |
| Allocation       | `allocations`      |
| Time Off Request | `time_off_requests`|
| Salary Structure | `salary_structures`|
| Salary Rule      | `salary_rules`     |
| Payrun           | `payruns`          |
| Payslip          | `payslips`         |
| Payslip Line     | `payslip_lines`    |
| User             | `users`            |

### Key Field Names

| Field              | Agreed Name         |
|--------------------|---------------------|
| Primary key        | `id`                |
| Employee FK        | `employee_id`       |
| Contract start     | `date_start`        |
| Contract end       | `date_end`          |
| Payrun period from | `period_start`      |
| Payrun period to   | `period_end`        |
| Net salary         | `net_salary`        |
| Gross salary       | `gross_salary`      |
| Created timestamp  | `created_at`        |
| Updated timestamp  | `updated_at`        |

### Status Enums

| Entity     | Values                                      |
|------------|---------------------------------------------|
| Contract   | `draft`, `active`, `expired`, `cancelled`  |
| Payrun     | `draft`, `computed`, `validated`, `paid`   |
| Payslip    | `draft`, `computed`, `validated`, `paid`   |
| Leave      | `draft`, `confirmed`, `approved`, `refused`|
| Allocation | `draft`, `confirmed`, `approved`, `refused`|

---

## Module Progress

| Module                  | Database         | Backend          | Frontend         |
|-------------------------|------------------|------------------|------------------|
| Employee Management     | ✅ Done          | 🔄 In progress   | ✅ Done          |
| Contract Management     | ✅ Done          | 🔄 In progress   | ✅ Done          |
| Working Schedules       | ✅ Done          | ⬜ Not started   | ✅ Done          |
| Attendance              | ✅ Done          | 🔄 In progress   | ✅ Done          |
| Time Off                | ✅ Done          | 🔄 In progress   | ⬜ Not started   |
| Salary Structures/Rules | ✅ Done          | ⬜ Not started   | ✅ Done          |
| Payrun Processing       | ✅ Done          | ⬜ Not started   | ✅ Done          |
| Payslip Generation      | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Payroll Dashboard       | ⬜ Not started   | ⬜ Not started   | ✅ Done          |
| Auth / RBAC             | ✅ Done          | 🔄 In progress   | ✅ Done          |

### Backend Progress

Models + CRUD/RBAC routers exist for:

- Employee
- Contract
- Attendance
- Time Off

The Time Off module includes the leave-approval → balance-deduction flow and matches the real `feature/database` `schema.sql`.
Backend modules are marked **In Progress** rather than **Done** because they have not yet been fully smoke-tested against a live PostgreSQL instance.

| Date | Branch | Merged by | What was merged |
|------|--------|-----------|-----------------|
| 2026-09-05 | `feature/frontend` | T. Lakshmi Vyshnavi | App Shell (Sidebar with 5 grouped navigation sections, Topbar with responsive search/notifications/breadcrumbs, UserMenu with profile/role switcher) |
| 2026-09-05 | `feature/database` | Maddi Soumya | Schema/seed rewritten to match this file's Naming Conventions + `docs/modules/*.md` exactly (UUID ids, `employees.name`, `date_start`/`date_end`, `allocations`, `schedule_lines`, etc.) - not yet re-merged into `main`, see note below |

Salary Structures/Rules and the Payrun engine are next.

### Database Progress

`schema.sql` + `seed.sql` cover the HR and payroll modules except the Payroll Dashboard, which does not require dedicated tables because it queries existing data.

The database implementation has been verified against a local PostgreSQL 18 installation using:

```text
npm run reset
npm run verify
