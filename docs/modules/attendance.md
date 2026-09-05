# Module: Attendance

## Fields — attendance

| Field        | Type      | Notes                                      |
|--------------|-----------|--------------------------------------------|
| id           | UUID      | Primary key                                |
| employee_id  | UUID FK   | → employees.id                             |
| check_in     | timestamp |                                            |
| check_out    | timestamp | Nullable                                   |
| worked_hours | numeric   | Auto-calculated: (check_out - check_in) in hours |
| status       | enum      | `present`, `late`, `absent`, `overtime`    |
| is_manual    | boolean   | True if manually created/edited            |
| note         | string    | Nullable, for corrections                  |
| created_at   | timestamp |                                            |
| updated_at   | timestamp |                                            |

## Business Rules
- `worked_hours` is computed on save: `(check_out - check_in)` in hours; null if check_out is missing
- Missing check_out flagged as exception
- Manual edits restricted to HR Manager and above
- `is_manual = true` set automatically when an authorized user edits a record

## API
See `spec.md` → Attendance section
