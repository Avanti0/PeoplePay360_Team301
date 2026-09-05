# Module: Payroll (Salary Structures, Rules, Payruns, Payslips)

---

## Fields — salary_structures

| Field      | Type    | Notes                        |
|------------|---------|------------------------------|
| id         | UUID    | Primary key                  |
| name       | string  | e.g. "Regular Salary"        |
| is_active  | boolean |                              |
| created_at | timestamp |                            |

## Fields — salary_rules

| Field            | Type    | Notes                                              |
|------------------|---------|----------------------------------------------------|
| id               | UUID    | Primary key                                        |
| salary_structure_id | UUID FK | → salary_structures.id                        |
| name             | string  |                                                    |
| code             | string  | Unique within structure; used in formulas (e.g. `BASIC`, `HRA`) |
| category         | enum    | `basic`, `allowance`, `gross`, `deduction`, `net`  |
| sequence         | integer | Execution order (ascending)                        |
| computation_type | enum    | `fixed`, `percentage`, `formula`                   |
| amount           | numeric | Used when computation_type = `fixed`               |
| percentage_base  | string  | Rule code to apply percentage on                   |
| percentage       | numeric | Used when computation_type = `percentage`          |
| formula          | string  | Python expression; can reference other rule codes  |
| is_active        | boolean |                                                    |

## Fields — payruns

| Field               | Type      | Notes                              |
|---------------------|-----------|------------------------------------|
| id                  | UUID      | Primary key                        |
| name                | string    | e.g. "August 2026 Payrun"          |
| salary_structure_id | UUID FK   | → salary_structures.id             |
| period_start        | date      |                                    |
| period_end          | date      |                                    |
| status              | enum      | `draft`, `computed`, `validated`, `paid` |
| created_at          | timestamp |                                    |
| updated_at          | timestamp |                                    |

## Fields — payslips

| Field               | Type      | Notes                              |
|---------------------|-----------|------------------------------------|
| id                  | UUID      | Primary key                        |
| payrun_id           | UUID FK   | → payruns.id                       |
| employee_id         | UUID FK   | → employees.id                     |
| contract_id         | UUID FK   | Resolved contract for this period  |
| period_start        | date      |                                    |
| period_end          | date      |                                    |
| worked_days         | numeric   |                                    |
| gross_salary        | numeric   |                                    |
| net_salary          | numeric   |                                    |
| status              | enum      | `draft`, `computed`, `validated`, `paid` |
| warnings            | JSON      | List of warning strings            |
| created_at          | timestamp |                                    |

## Fields — payslip_lines

| Field           | Type    | Notes                              |
|-----------------|---------|------------------------------------|
| id              | UUID    | Primary key                        |
| payslip_id      | UUID FK | → payslips.id                      |
| salary_rule_id  | UUID FK | → salary_rules.id                  |
| name            | string  | Rule name at time of computation   |
| code            | string  | Rule code at time of computation   |
| category        | enum    | Copied from rule                   |
| sequence        | integer | Copied from rule                   |
| amount          | numeric | Computed value                     |

## Business Rules

### Salary Rule Execution
```
context = {}
for rule in sorted(structure.rules, key=lambda r: r.sequence):
    if rule.computation_type == 'fixed':
        context[rule.code] = rule.amount
    elif rule.computation_type == 'percentage':
        context[rule.code] = context[rule.percentage_base] * (rule.percentage / 100)
    elif rule.computation_type == 'formula':
        context[rule.code] = eval(rule.formula, {}, context)
```

### Payrun Lifecycle
- `draft` → `computed`: runs salary computation for all selected employees
- `computed` → `validated`: checks warnings; HR Payroll Manager confirms
- `validated` → `paid`: locks all payslips; no further edits allowed

### Warnings Checked Before Validation
- Employee missing bank details
- Duplicate payslip (same employee, overlapping period)
- No active contract found for the period
- Contract wage is zero

### Immutability
- Payruns and payslips in `validated` or `paid` status: PUT and DELETE return 403

## API
See `spec.md` → Payruns and Payslips sections
