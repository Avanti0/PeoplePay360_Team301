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
| Employee Management     | ✅ Done          | ✅ Done          | ✅ Done          |
| Contract Management     | ✅ Done          | ✅ Done          | ✅ Done          |
| Working Schedules       | ✅ Done          | ✅ Done          | ✅ Done          |
| Attendance              | ✅ Done          | ✅ Done          | ✅ Done          |
| Time Off                | ✅ Done          | ✅ Done          | ✅ Done          |
| Salary Structures/Rules | ✅ Done          | ✅ Done          | ✅ Done          |
| Payrun Processing       | ✅ Done          | ✅ Done          | ✅ Done          |
| Payslip Generation      | ✅ Done          | ✅ Done          | ✅ Done          |
| Payroll Dashboard       | ✅ Done          | ✅ Done          | ✅ Done          |
| Auth / RBAC             | ✅ Done          | ✅ Done          | ✅ Done          |

### Backend Progress

All modules verified end-to-end against a live local PostgreSQL instance and a real running
`uvicorn` server (not just import/syntax checks) on 2026-09-05:

- Auth: `emp-004` / real bcrypt hash → real JWT → used to authenticate every endpoint below.
- Employees, Contracts, Attendance, Time Off (incl. the leave-approval → balance-deduction flow).
- Salary Structures/Rules, and the full Payrun lifecycle: compute → validate → mark-paid →
  send-payslips (fails gracefully with real SMTP-auth errors when no real mailbox is configured —
  that's expected, not a bug) → PDF download (real PDF bytes generated via reportlab).
- Dashboard KPIs/salary-by-dept/salary-trend/alerts, all reading real aggregated data.

Fixed along the way (see git log for the full list): `passlib`+`bcrypt` need `bcrypt==4.0.1` pinned
in requirements.txt (passlib 1.7.4 is incompatible with bcrypt>=4.1's stricter 72-byte check —
this was the actual cause of prior login 500s, not a design flaw); `config.py`'s `Settings` needed
`extra="ignore"` for the SMTP/PDF env vars; `main.py` was missing the payroll/dashboard/
working-schedules router registrations entirely; several services (`payroll_service.py`,
`dashboard_service.py`, `pdf_service.py`, `email_service.py`, `working_schedule_service.py`) still
referenced pre-spec-alignment field/table names (`computation_method` vs `computation_type`,
`PayrollWarning` table that no longer exists, `first_name`/`last_name`, etc.); a genuine payroll
calculation bug where `gross_salary` double-counted the GROSS rollup rule on top of its own
components (₹126,000 instead of ₹63,000) is now fixed. `docker-compose.yml` (the standing
blocker below) has been added, wiring db + backend + frontend with schema.sql/seed.sql as
Postgres init scripts — written to match the existing Dockerfiles/nginx.conf, but not yet
verified with an actual `docker compose up` (no Docker available in this environment).

**Important fix — `/auth/login` now returns the logged-in user**, not just a token
(`LoginOut`/`UserMeOut` in `schemas/auth.py`), and a new `GET /api/v1/auth/me` (using the
existing `get_current_user` dependency) lets the frontend restore a session after a page
refresh. Previously `TokenOut` only returned `{access_token, token_type}`, but
`frontend/services/api.ts` already expected a `user` field back — meaning even a fully correct
real login response would have set `user: undefined` in the frontend. This is the other half of
why the frontend never showed real seeded data (see Frontend Progress below).

### Frontend Progress

Found and fixed a serious pre-existing issue, independent of the backend work above:
**`AuthContext.tsx` defaulted every page load to a fake logged-in demo Admin
(`useState(demoUsers[0])`) with a fake, non-JWT access token
(`'in_memory_jwt_' + user.role`)**. The app never actually required login, so every real API
call carried an invalid token and the real backend correctly rejected it — the app was, by
design, never showing real data regardless of environment (local or Docker). Same root cause
behind four separate "Switch Persona/Role" UI shortcuts (login page, Header, UserMenu,
UnauthorizedPage) that all bypassed real auth the same way.

Fixed: `AuthContext` now starts logged-out and restores a session only via the real
`POST /auth/refresh` (httpOnly cookie) + `GET /auth/me`; `login()` uses the real
`POST /auth/login` response's `user` field. All four fake-role-switcher UI shortcuts were
removed (they had no real password to fall back on — by design, RBAC requires a real login per
role now). `api.ts`'s mock-data fallback was also narrowed: previously *any* error (including a
real backend's real 400/401/500 responses) silently fell back to fake mock data; now only a
genuine network failure (backend truly unreachable) falls back, and it's logged loudly when it
does, so it can never be mistaken for real data again.

Verified: `tsc --noEmit` and `npm run build` both clean; real login (`emp-004`/`Test@123`) →
`/auth/me` → real employee data, tested end-to-end through the actual Vite dev-server proxy
(not just curl to the backend directly).

### Database Progress

`schema.sql` + `seed.sql` cover the HR and payroll modules except the Payroll Dashboard, which does not require dedicated tables because it queries existing data.

The database implementation has been verified against a local PostgreSQL 18 installation using:

```text
npm run reset
npm run verify
```
