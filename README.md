# PeoplePay360 — HR & Payroll Platform

An integrated HR and Payroll operations platform covering the complete employee lifecycle — from employee profiles and contracts to attendance, leave, payroll computation, payslip generation, and analytics.

---

## What This Repo Contains

- **Employee Management** — profiles, departments, job positions, employment status
- **Contract Management** — historical contracts with period-aware payroll resolution
- **Working Schedules** — weekly patterns with auto-calculated hours
- **Attendance Tracking** — check-in/out, worked hours, exceptions, corrections
- **Time Off Management** — leave types, allocations, requests, approvals, balance tracking
- **Salary Structures & Rules** — configurable, sequenced rules driving payslip computation
- **Payrun Processing** — two-step wizard, compute → validate → paid lifecycle
- **Payslip Generation** — per-employee breakdowns, PDF export, bulk email delivery
- **Payroll Dashboard** — live KPIs across salary, attendance, leave, and departments
- **Role-Based Access Control** — Employee, HR Manager, HR Payroll User, HR Payroll Manager, Admin

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/requirements.md](docs/requirements.md) | Functional and non-functional requirements |
| [docs/spec.md](docs/spec.md) | API endpoints, auth, business logic rules |
| [docs/architecture.md](docs/architecture.md) | System design, data model, key flows |
| [docs/modules/employee.md](docs/modules/employee.md) | Employee module fields and rules |
| [docs/modules/contract.md](docs/modules/contract.md) | Contract module fields and rules |
| [docs/modules/attendance.md](docs/modules/attendance.md) | Attendance module fields and rules |
| [docs/modules/time_off.md](docs/modules/time_off.md) | Time Off module fields and rules |
| [docs/modules/payroll.md](docs/modules/payroll.md) | Salary structures, rules, payruns, payslips |
| [status.md](status.md) | Live project sync — tech stack, naming conventions, progress |

---

## Project Architecture

```
Frontend (React + TypeScript)
          |
          | REST API
          v
    FastAPI Backend
          |
    +-----+-----+
    |           |
    v           v
 Services    JWT + RBAC
    |
    v
 PostgreSQL
```

**Key flows:**
- Employee → Contract → Salary Structure → Salary Rules → Payrun → Payslip
- Leave Type → Allocation → Request → Approval → Balance Deduction

---

## Repository Structure

```
PeoplePay360_Team301/
├── backend/          # FastAPI app, services, models, schemas
├── frontend/         # React + TypeScript UI
├── database/         # schema.sql and seed.sql
├── docs/             # Architecture, spec, requirements, module docs
├── status.md         # Cross-branch sync file
└── README.md
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Docker + Docker Compose

---

## Running Locally

```bash
git clone https://github.com/<org>/PeoplePay360_Team301.git
cd PeoplePay360_Team301
docker compose up --build
```

> Full setup instructions will be added once the stack is wired up.

---

## Demo

> Live demo link will be added after deployment.

---

## Contributors

| Name | GitHub |
|---|---|
| Avanti Dharmapurikar | [@Avanti0](https://github.com/Avanti0) |
| T. Lakshmi Vyshnavi | [@Vyshnavi22-tlv](https://github.com/Vyshnavi22-tlv) |
| Maddi Soumya | [@MaddiSoumya27](https://github.com/MaddiSoumya27) |
