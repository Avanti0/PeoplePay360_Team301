# PeoplePay360 — Project Status & Sync File

This file lives on `main`. Update it every time you reach a meaningful commit point and when merging to main.

---

## Tech Stack (Finalized)

| Layer           | Technology                       |
|-----------------|----------------------------------|
| Backend         | Python + FastAPI                 |
| Frontend        | React + TypeScript               |
| Database        | PostgreSQL                       |
| API Style       | REST                             |
| Authentication  | JWT + Refresh Tokens             |
| Authorization   | RBAC (5 roles)                   |
| PDF Generation  | reportlab                        |
| Email           | SMTP (smtplib)                   |
| Deployment      | Docker Compose                   |
| Dev Environment | WSL 2 + Ubuntu + VS Code         |

---

## Branches

| Branch             | Owner                | Responsibility       |
|--------------------|----------------------|----------------------|
| `feature/backend`  | Avanti Dharmapurikar | API + Business Logic |
| `feature/frontend` | T. Lakshmi Vyshnavi  | UI                   |
| `feature/database` | Maddi Soumya         | Schema + Seed Data   |

---

## Naming Conventions (Everyone Must Follow)

- **Database / Backend (Python):** `snake_case`
- **Frontend (TypeScript/React):** `camelCase`
- **API routes:** `/api/v1/<resource>` (plural, snake_case)

### Employee Name Fields
- Backend/DB: `first_name` + `last_name` (two separate columns)
- Full name constructed as: `f"{first_name} {last_name}"` wherever needed
- Frontend: `firstName` + `lastName` (camelCase after conversion)

### Model / Table Names

| Entity           | Table Name          |
|------------------|---------------------|
| Employee         | `employees`         |
| Contract         | `contracts`         |
| Working Schedule | `working_schedules` |
| Schedule Line    | `working_schedule_lines` |
| Attendance       | `attendance`        |
| Time Off Type    | `time_off_types`    |
| Allocation       | `leave_allocations` |
| Time Off Request | `time_off_requests` |
| Salary Structure | `salary_structures` |
| Salary Rule      | `salary_rules`      |
| Payrun           | `payruns`           |
| Payrun Employee  | `payrun_employees`  |
| Payslip          | `payslips`          |
| Payslip Line     | `payslip_lines`     |
| Payroll Warning  | `payroll_warnings`  |
| User             | `users`             |

### Key Field Names

| Field              | Agreed Name     |
|--------------------|-----------------|
| Primary key        | `id`            |
| Employee FK        | `employee_id`   |
| Contract start     | `start_date`    |
| Contract end       | `end_date`      |
| Payrun period from | `period_start`  |
| Payrun period to   | `period_end`    |
| Net salary         | `net_salary`    |
| Gross salary       | `gross_salary`  |
| Created timestamp  | `created_at`    |
| Updated timestamp  | `updated_at`    |

### Status Enums

| Entity     | Values                                       |
|------------|----------------------------------------------|
| Contract   | `draft`, `running`, `expired`, `cancelled`   |
| Payrun     | `draft`, `computed`, `validated`, `paid`     |
| Payslip    | `draft`, `computed`, `validated`, `paid`     |
| Leave      | `submitted`, `approved`, `refused`           |
| Allocation | `draft`, `confirmed`, `approved`, `refused`  |

---

## Module Progress

| Module                  | Database       | Backend        | Frontend       |
|-------------------------|----------------|----------------|----------------|
| Employee Management     | ✅ Done        | ✅ Done        | ✅ Done        |
| Contract Management     | ✅ Done        | ✅ Done        | ✅ Done        |
| Working Schedules       | ✅ Done        | ✅ Done        | ✅ Done        |
| Attendance              | ✅ Done        | ✅ Done        | ✅ Done        |
| Time Off                | ✅ Done        | ✅ Done        | ✅ Done        |
| Salary Structures/Rules | ✅ Done        | ✅ Done        | ✅ Done        |
| Payrun Processing       | ✅ Done        | ✅ Done        | ✅ Done        |
| Payslip Generation      | ✅ Done        | ✅ Done        | ✅ Done        |
| Payroll Dashboard       | ✅ Done        | ✅ Done        | ✅ Done        |
| Auth / RBAC             | ✅ Done        | ✅ Done        | ✅ Done        |

Status key: ⬜ Not started | 🔄 In progress | ✅ Done | 🔀 Merged to main

---

## Merge Log

| Date       | Branch             | Merged by            | What was merged |
|------------|--------------------|----------------------|-----------------|
| 2026-09-05 | `feature/database` | Maddi Soumya         | Full schema.sql + seed.sql (all tables, constraints, triggers, demo data) |
| 2026-09-05 | `feature/frontend` | T. Lakshmi Vyshnavi  | Login UI (Form validation, loading state, invalid credentials banner, API error handling, demo persona quick login, password toggle) |
| 2026-09-05 | `feature/frontend` | T. Lakshmi Vyshnavi  | Frontend Routes (Complete route suite: `/dashboard`, `/employees`, `/employees/:id`, `/contracts`, `/contracts/:id`, `/working-schedules`, `/attendance`, `/time-off/types`, `/time-off/allocations`, `/time-off/requests`, `/salary-structures`, `/salary-rules`, `/payruns`, `/payruns/:id`, `/payslips`, `/payslips/:id`) |
| 2026-09-05 | `feature/frontend` | T. Lakshmi Vyshnavi  | App Shell (Sidebar with 5 grouped navigation sections, Topbar with responsive search/notifications/breadcrumbs, UserMenu with profile/role switcher) |
| 2026-09-05 | `feature/backend`  | Avanti Dharmapurikar | FastAPI scaffold, JWT auth, RBAC, all module APIs, payrun engine, salary rule execution, PDF, email, dashboard |
| 2026-09-05 | all branches       | Team                 | Merged feature/backend + feature/frontend into main — full integration |

---

## Open Decisions / Blockers

| # | Raised by | Question / Blocker | Status |
|---|-----------|--------------------|--------|
| 1 | All       | docker-compose.yml not created yet — needed before end-to-end testing | Open |

---

## How to Update This File

When you reach a meaningful commit:
1. Update **Module Progress** rows
2. Finalize any TBDs in Tech Stack or Naming
3. Add a row to **Merge Log** when merging to main
4. Commit alongside your code: `git commit -m "status: <what changed>"`
