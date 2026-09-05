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

| Entity   | Values                                      |
|----------|---------------------------------------------|
| Contract | `draft`, `active`, `expired`, `cancelled`   |
| Payrun   | `draft`, `computed`, `validated`, `paid`    |
| Payslip  | `draft`, `computed`, `validated`, `paid`    |
| Leave    | `draft`, `confirmed`, `approved`, `refused` |
| Allocation | `draft`, `confirmed`, `approved`, `refused` |

---

## Module Progress

| Module                  | Database         | Backend          | Frontend         |
|-------------------------|------------------|------------------|------------------|
| Employee Management     | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Contract Management     | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Working Schedules       | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Attendance              | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Time Off                | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Salary Structures/Rules | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Payrun Processing       | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Payslip Generation      | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Payroll Dashboard       | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |
| Auth / RBAC             | ⬜ Not started   | ⬜ Not started   | ⬜ Not started   |

Status key: ⬜ Not started | 🔄 In progress | ✅ Done | 🔀 Merged to main

---

## Merge Log

| Date | Branch | Merged by | What was merged |
|------|--------|-----------|-----------------|
|      |        |           |                 |

---

## Open Decisions / Blockers

| # | Raised by | Question / Blocker              | Status |
|---|-----------|---------------------------------|--------|
| 1 |           | PDF library choice (TBD)        | Open   |
| 2 |           | Email service choice (TBD)      | Open   |

---

## How to Update This File

When you reach a meaningful commit:
1. Update **Module Progress** rows for what you completed
2. Finalize any **TBD** entries in Tech Stack or Naming
3. Add a row to **Merge Log** when merging to main
4. Commit alongside your code: `git commit -m "status: <what changed>"`
