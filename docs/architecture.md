# PeoplePay360 — Architecture

---

## System Overview

```
Browser (React + TypeScript)
          |
          | HTTP REST (JSON)
          v
    FastAPI Backend
          |
    +-----+-----+
    |           |
    v           v
 Services    Auth Middleware
    |         (JWT + RBAC)
    v
 PostgreSQL
```

---

## Layer Responsibilities

**Frontend (React + TypeScript)**
- Renders all views: Kanban, List, Form, Dashboard
- Manages auth state (stores JWT in memory, refresh token in httpOnly cookie)
- Calls backend REST API; maps snake_case responses to camelCase
- Enforces UI-level role visibility (hides nav items based on role in JWT)

**Backend (FastAPI)**
- Exposes REST API at `/api/v1/`
- Validates requests via Pydantic schemas
- Enforces authentication (JWT) and authorization (RBAC) on every route
- Contains all business logic in `services/` layer — routers only handle HTTP concerns
- Computes payslips, resolves contracts, sequences salary rules, deducts leave balances

**Database (PostgreSQL)**
- Single source of truth for all data
- Enforces referential integrity via foreign keys
- Schema managed via versioned migration files in `database/`

---

## Data Model (Entity Relationships)

```
users
  └── employees (one user → one employee)
        ├── contracts (one employee → many contracts)
        │     └── working_schedules (many contracts → one schedule)
        │     └── salary_structures (many contracts → one structure)
        │           └── salary_rules (one structure → many rules)
        ├── attendance (one employee → many records)
        ├── allocations (one employee → many allocations)
        │     └── time_off_types (many allocations → one type)
        └── time_off_requests (one employee → many requests)
              └── allocations (approved request deducts from allocation)

payruns
  ├── salary_structures (one payrun → one structure)
  └── payslips (one payrun → many payslips)
        ├── employees (one payslip → one employee)
        └── payslip_lines (one payslip → many lines, one per salary rule)
```

---

## Key Business Flows

### Employee → Payslip Flow
```
Employee record
    → has active Contract for payrun period
        → Contract has Salary Structure
            → Structure has ordered Salary Rules
                → Payrun.compute() iterates employees
                    → resolves contract by period overlap
                    → executes rules in sequence order
                    → creates Payslip + PayslipLines
                        → Payslip.validate() checks warnings
                            → Payrun.mark_paid() locks records
```

### Leave Request → Balance Deduction Flow
```
Time Off Type (defines policy)
    → Allocation (grants balance to employee, requires approval)
        → Time Off Request (employee submits)
            → HR Manager approves
                → balance deducted from Allocation automatically
```

---

## Auth Flow

```
Login → POST /api/v1/auth/login
      ← access_token (JWT, 15 min) + refresh_token (httpOnly cookie, 7 days)

Every request → Authorization: Bearer <access_token>
             → Middleware decodes JWT, extracts role
             → Route dependency checks role against required permission

Token expired → POST /api/v1/auth/refresh (uses httpOnly cookie)
             ← new access_token
```

---

## RBAC Permission Levels

```
Admin
  └── HR Payroll Manager
        └── HR Payroll User
              └── HR Manager
                    └── Employee
```

Each level inherits all permissions of the level below it.

---

## Salary Rule Computation

Rules are evaluated in `sequence` order. Each rule has a `computation_type`:

| Type        | Example                              |
|-------------|--------------------------------------|
| `fixed`     | `amount = 50000`                     |
| `percentage`| `amount = BASIC * 0.40`              |
| `formula`   | `amount = BASIC + HRA - PF - TDS`    |

The evaluation context is a dict built up as rules execute:
```python
context = {}
for rule in sorted(rules, key=lambda r: r.sequence):
    context[rule.code] = evaluate(rule, context)
```

---

## Docker Compose Services

```yaml
services:
  db:        PostgreSQL 15
  backend:   FastAPI (uvicorn)
  frontend:  React (nginx in prod / vite dev server in dev)
```

All three communicate on an internal Docker network. Only frontend port is exposed to host.
