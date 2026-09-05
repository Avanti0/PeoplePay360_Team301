# Module: Time Off

## Fields — time_off_types

| Field                | Type    | Notes                              |
|----------------------|---------|------------------------------------|
| id                   | UUID    | Primary key                        |
| name                 | string  |                                    |
| unit                 | enum    | `days`, `hours`                    |
| requires_allocation  | boolean |                                    |
| approval_required    | boolean |                                    |
| is_active            | boolean |                                    |

## Fields — allocations

| Field           | Type      | Notes                              |
|-----------------|-----------|------------------------------------|
| id              | UUID      | Primary key                        |
| employee_id     | UUID FK   | → employees.id                     |
| time_off_type_id| UUID FK   | → time_off_types.id                |
| number_of_days  | numeric   | Total allocated                    |
| taken           | numeric   | Auto-updated on leave approval     |
| remaining       | numeric   | Computed: number_of_days - taken   |
| date_from       | date      | Validity start                     |
| date_to         | date      | Validity end                       |
| status          | enum      | `draft`, `confirmed`, `approved`, `refused` |
| created_at      | timestamp |                                    |

## Fields — time_off_requests

| Field           | Type      | Notes                              |
|-----------------|-----------|------------------------------------|
| id              | UUID      | Primary key                        |
| employee_id     | UUID FK   | → employees.id                     |
| time_off_type_id| UUID FK   | → time_off_types.id                |
| allocation_id   | UUID FK   | → allocations.id (nullable if no allocation required) |
| date_from       | date      |                                    |
| date_to         | date      |                                    |
| duration        | numeric   | In days or hours per type unit     |
| status          | enum      | `draft`, `confirmed`, `approved`, `refused` |
| note            | string    | Nullable                           |
| created_at      | timestamp |                                    |

## Business Rules
- Allocation must be `approved` before a request can consume its balance
- On request approval: `allocation.taken += request.duration`, `allocation.remaining -= request.duration`
- Reject approval if `allocation.remaining < request.duration`
- Refused requests do not affect allocation balance

## API
See `spec.md` → Time Off sections
