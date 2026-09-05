# PeoplePay360 — Technical Specification

---

## Stack

| Layer    | Technology              |
|----------|-------------------------|
| Backend  | Python 3.11 + FastAPI   |
| Frontend | React 18 + TypeScript   |
| Database | PostgreSQL 15           |
| Auth     | JWT + Refresh Tokens    |
| Deploy   | Docker Compose          |

---

## Project Structure

```
PeoplePay360_Team301/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          # config, security, dependencies
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── routers/       # one file per module
│   │   ├── services/      # business logic
│   │   └── db/            # database session, migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/      # API calls
│   │   ├── hooks/
│   │   └── types/         # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
├── database/
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml
├── status.md
└── docs/
```

---

## Authentication

- `POST /api/v1/auth/login` — returns `access_token` (15 min) + `refresh_token` (7 days)
- `POST /api/v1/auth/refresh` — returns new `access_token`
- `POST /api/v1/auth/logout` — invalidates refresh token
- All other endpoints require `Authorization: Bearer <access_token>` header
- Role stored in JWT payload as `role`

---

## API Endpoints

### Auth
| Method | Endpoint                  | Access  |
|--------|---------------------------|---------|
| POST   | /api/v1/auth/login        | Public  |
| POST   | /api/v1/auth/refresh      | Public  |
| POST   | /api/v1/auth/logout       | Auth    |

### Employees
| Method | Endpoint                        | Access         |
|--------|---------------------------------|----------------|
| GET    | /api/v1/employees               | HR Manager+    |
| POST   | /api/v1/employees               | HR Manager+    |
| GET    | /api/v1/employees/{id}          | HR Manager+ / own |
| PUT    | /api/v1/employees/{id}          | HR Manager+    |
| DELETE | /api/v1/employees/{id}          | Admin          |
| GET    | /api/v1/employees/{id}/contracts    | HR Manager+    |
| GET    | /api/v1/employees/{id}/attendance   | HR Manager+ / own |
| GET    | /api/v1/employees/{id}/time-off     | HR Manager+ / own |

### Contracts
| Method | Endpoint                  | Access      |
|--------|---------------------------|-------------|
| GET    | /api/v1/contracts         | HR Manager+ |
| POST   | /api/v1/contracts         | HR Manager+ |
| GET    | /api/v1/contracts/{id}    | HR Manager+ |
| PUT    | /api/v1/contracts/{id}    | HR Manager+ |
| DELETE | /api/v1/contracts/{id}    | Admin       |

### Working Schedules
| Method | Endpoint                        | Access      |
|--------|---------------------------------|-------------|
| GET    | /api/v1/working-schedules       | HR Manager+ |
| POST   | /api/v1/working-schedules       | HR Manager+ |
| GET    | /api/v1/working-schedules/{id}  | HR Manager+ |
| PUT    | /api/v1/working-schedules/{id}  | HR Manager+ |
| DELETE | /api/v1/working-schedules/{id}  | Admin       |

### Attendance
| Method | Endpoint                    | Access                  |
|--------|-----------------------------|-------------------------|
| GET    | /api/v1/attendance          | HR Manager+             |
| POST   | /api/v1/attendance          | Employee+               |
| GET    | /api/v1/attendance/{id}     | HR Manager+ / own       |
| PUT    | /api/v1/attendance/{id}     | HR Manager+             |
| DELETE | /api/v1/attendance/{id}     | Admin                   |

### Time Off Types
| Method | Endpoint                        | Access      |
|--------|---------------------------------|-------------|
| GET    | /api/v1/time-off-types          | HR Manager+ |
| POST   | /api/v1/time-off-types          | HR Manager+ |
| GET    | /api/v1/time-off-types/{id}     | HR Manager+ |
| PUT    | /api/v1/time-off-types/{id}     | HR Manager+ |
| DELETE | /api/v1/time-off-types/{id}     | Admin       |

### Allocations
| Method | Endpoint                    | Access      |
|--------|-----------------------------|-------------|
| GET    | /api/v1/allocations         | HR Manager+ |
| POST   | /api/v1/allocations         | HR Manager+ |
| GET    | /api/v1/allocations/{id}    | HR Manager+ |
| PUT    | /api/v1/allocations/{id}    | HR Manager+ |

### Time Off Requests
| Method | Endpoint                            | Access              |
|--------|-------------------------------------|---------------------|
| GET    | /api/v1/time-off-requests           | HR Manager+ / own   |
| POST   | /api/v1/time-off-requests           | Employee+           |
| GET    | /api/v1/time-off-requests/{id}      | HR Manager+ / own   |
| PUT    | /api/v1/time-off-requests/{id}      | HR Manager+         |
| POST   | /api/v1/time-off-requests/{id}/approve  | HR Manager+     |
| POST   | /api/v1/time-off-requests/{id}/refuse   | HR Manager+     |

### Salary Structures
| Method | Endpoint                          | Access               |
|--------|-----------------------------------|----------------------|
| GET    | /api/v1/salary-structures         | HR Payroll User+     |
| POST   | /api/v1/salary-structures         | HR Payroll Manager+  |
| GET    | /api/v1/salary-structures/{id}    | HR Payroll User+     |
| PUT    | /api/v1/salary-structures/{id}    | HR Payroll Manager+  |
| DELETE | /api/v1/salary-structures/{id}    | Admin                |

### Salary Rules
| Method | Endpoint                      | Access               |
|--------|-------------------------------|----------------------|
| GET    | /api/v1/salary-rules          | HR Payroll User+     |
| POST   | /api/v1/salary-rules          | HR Payroll Manager+  |
| GET    | /api/v1/salary-rules/{id}     | HR Payroll User+     |
| PUT    | /api/v1/salary-rules/{id}     | HR Payroll Manager+  |
| DELETE | /api/v1/salary-rules/{id}     | Admin                |

### Payruns
| Method | Endpoint                          | Access               |
|--------|-----------------------------------|----------------------|
| GET    | /api/v1/payruns                   | HR Payroll User+     |
| POST   | /api/v1/payruns                   | HR Payroll User+     |
| GET    | /api/v1/payruns/{id}              | HR Payroll User+     |
| PUT    | /api/v1/payruns/{id}              | HR Payroll User+     |
| POST   | /api/v1/payruns/{id}/compute      | HR Payroll User+     |
| POST   | /api/v1/payruns/{id}/validate     | HR Payroll Manager+  |
| POST   | /api/v1/payruns/{id}/mark-paid    | HR Payroll Manager+  |
| POST   | /api/v1/payruns/{id}/send-payslips| HR Payroll Manager+  |

### Payslips
| Method | Endpoint                          | Access               |
|--------|-----------------------------------|----------------------|
| GET    | /api/v1/payslips                  | HR Payroll User+     |
| GET    | /api/v1/payslips/{id}             | HR Payroll User+     |
| GET    | /api/v1/payslips/{id}/pdf         | HR Payroll User+     |

### Dashboard
| Method | Endpoint                          | Access           |
|--------|-----------------------------------|------------------|
| GET    | /api/v1/dashboard/kpis            | HR Payroll User+ |
| GET    | /api/v1/dashboard/salary-by-dept  | HR Payroll User+ |
| GET    | /api/v1/dashboard/salary-trend    | HR Payroll User+ |
| GET    | /api/v1/dashboard/alerts          | HR Payroll User+ |
| GET    | /api/v1/dashboard/attendance      | HR Payroll User+ |
| GET    | /api/v1/dashboard/time-off        | HR Payroll User+ |

---

## Pydantic Schema Conventions

- Request bodies: `<Model>Create`, `<Model>Update`
- Response bodies: `<Model>Out`
- All timestamps as ISO 8601 strings in responses
- Enums as lowercase strings matching the values in `status.md`

---

## Business Logic Rules (Backend Enforced)

1. **Contract resolution:** When computing a payslip, select the contract where `date_start <= period_start` and (`date_end >= period_end` OR `date_end IS NULL`) and `status = 'active'`
2. **No overlapping active contracts:** On contract activation, reject if another active contract exists for the same employee in the same period
3. **Salary rule execution:** Sort rules by `sequence` ASC; evaluate each rule's formula with a context dict containing all previously computed rule codes
4. **Leave balance deduction:** On approval, deduct `duration` from the linked allocation's remaining balance; reject if insufficient balance
5. **Payrun immutability:** Payruns and payslips in `validated` or `paid` status cannot be updated or deleted
6. **Duplicate payslip check:** On compute, warn if a payslip already exists for the same employee + overlapping period
