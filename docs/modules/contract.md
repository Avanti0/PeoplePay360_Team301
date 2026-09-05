# Module: Contract Management

## Fields

| Field               | Type      | Notes                              |
|---------------------|-----------|------------------------------------|
| id                  | UUID      | Primary key                        |
| employee_id         | UUID FK   | → employees.id                     |
| date_start          | date      |                                    |
| date_end            | date      | Nullable = open-ended              |
| wage                | numeric   | Monthly gross wage                 |
| department          | string    |                                    |
| job_position        | string    |                                    |
| working_schedule_id | UUID FK   | → working_schedules.id             |
| salary_structure_id | UUID FK   | → salary_structures.id             |
| status              | enum      | `draft`, `active`, `expired`, `cancelled` |
| created_at          | timestamp |                                    |
| updated_at          | timestamp |                                    |

## Business Rules
- Only one `active` contract per employee at any point in time
- On activation, reject if another active contract overlaps the same period
- Payroll resolves contract by: `date_start <= period_start AND (date_end >= period_end OR date_end IS NULL) AND status = 'active'`
- Expired/cancelled contracts are kept as historical records — never deleted

## API
See `spec.md` → Contracts section
