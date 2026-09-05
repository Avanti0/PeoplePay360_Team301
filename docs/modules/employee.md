# Module: Employee Management

## Fields

| Field             | Type      | Notes                              |
|-------------------|-----------|------------------------------------|
| id                | UUID      | Primary key                        |
| user_id           | UUID FK   | Linked user account                |
| name              | string    |                                    |
| email             | string    | Unique                             |
| phone             | string    |                                    |
| department        | string    |                                    |
| job_position      | string    |                                    |
| manager_id        | UUID FK   | Self-referential → employees.id    |
| working_schedule_id | UUID FK | → working_schedules.id             |
| employment_status | enum      | `active`, `inactive`, `on_leave`   |
| created_at        | timestamp |                                    |
| updated_at        | timestamp |                                    |

## Business Rules
- Deactivating an employee does not delete their records
- Manager must be an existing active employee
- One user account per employee

## API
See `spec.md` → Employees section
