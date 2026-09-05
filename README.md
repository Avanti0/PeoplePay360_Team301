# PeoplePay360: HR & Payroll

## An Integrated Human Resource and Payroll Operations Platform

PeoplePay360 is an integrated HR and Payroll Operations Platform designed to manage the complete employee lifecycle, from employee master data and working schedules to attendance, leave management, payroll computation, payslip generation, payment tracking, and management analytics.

Unlike conventional HR applications that maintain employee, attendance, leave, and payroll information as disconnected records, PeoplePay360 establishes a unified operational workflow in which each HR activity contributes to the final payroll outcome.

The platform is designed around robust business logic, historical data integrity, configurable payroll rules, role-based access control, validation, and live reporting rather than simple CRUD functionality.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Key Objectives](#key-objectives)
- [Core Workflow](#core-workflow)
- [System Architecture](#system-architecture)
- [Core Modules](#core-modules)
- [Payroll Engine](#payroll-engine)
- [Contract Resolution](#contract-resolution)
- [Attendance and Working Schedules](#attendance-and-working-schedules)
- [Time Off Management](#time-off-management)
- [Payroll Processing](#payroll-processing)
- [Validation and Error Detection](#validation-and-error-detection)
- [Role-Based Access Control](#role-based-access-control)
- [Payroll Dashboard](#payroll-dashboard)
- [Payslip Generation and Delivery](#payslip-generation-and-delivery)
- [Data Model](#data-model)
- [End-to-End Business Flow](#end-to-end-business-flow)
- [Key Business Rules](#key-business-rules)
- [Technical Design Principles](#technical-design-principles)
- [Demo Scenario](#demo-scenario)
- [Future Roadmap](#future-roadmap)
- [Project Outcomes](#project-outcomes)

---

# Problem Statement

Real-world HR and payroll operations involve multiple interconnected processes.

An employee may have multiple contracts throughout their employment. Payroll must identify the contract applicable to the selected payroll period rather than simply using the employee's latest contract.

Similarly:

- Working hours depend on the employee's assigned schedule.
- Attendance records contain daily working information and exceptions.
- Leave balances depend on allocations and approved requests.
- Salary computation depends on configurable salary structures and ordered salary rules.
- Payroll must validate employee information and identify potential issues before finalization.
- Finalized payroll must remain available as historical information.
- HR and payroll teams require consolidated analytics across employees, attendance, leave, contracts, and payroll.

PeoplePay360 addresses these requirements through a connected end-to-end HR and payroll workflow.

---

# Solution Overview

PeoplePay360 provides a centralized platform for:

1. Employee Management
2. Contract Management
3. Working Schedule Management
4. Attendance Tracking
5. Time Off and Leave Management
6. Salary Structure Configuration
7. Salary Rule Configuration
8. Payrun Processing
9. Payslip Generation
10. Payroll Validation
11. PDF Payslip Generation
12. Bulk Payslip Delivery
13. Payroll Analytics and Dashboarding
14. Role-Based Access Control

The platform transforms disconnected HR operations into a single business workflow:

```text
Employee
    |
    +---- Contract
    |
    +---- Working Schedule
    |
    +---- Attendance
    |
    +---- Time Off
    |
    +---- Leave Allocation
    |
    +---- Salary Structure
              |
              +---- Salary Rules
                       |
                       v
                    Payrun
                       |
                       v
                    Payslip
                       |
              +--------+--------+
              |                 |
              v                 v
          PDF Export         Email Delivery
              |
              v
       Payroll Dashboard
```

---

# Key Objectives

## 1. Unified HR Flow

Centralize employee information and provide direct navigation to related contracts, attendance, time off, and allocation records.

## 2. Period-Aware Contract Management

Maintain historical contracts while ensuring that payroll uses only the contract applicable to the selected payroll period.

## 3. Operational Tracking

Manage working schedules, check-in/check-out records, worked hours, attendance exceptions, and corrections.

## 4. Comprehensive Time Off Management

Support configurable leave types, allocations, requests, approvals, balances, and automatic consumption of approved allocations.

## 5. Configurable Payroll Processing

Allow payroll administrators to define salary structures and ordered salary rules that actively drive payslip computation.

## 6. Payroll Validation

Detect issues such as incomplete employee information, missing bank details, duplicate payslips, and contract-related problems before payroll finalization.

## 7. Real-Time Reporting

Aggregate live HR, attendance, leave, contract, and payroll data into a centralized dashboard.

---

# Core Workflow

The complete PeoplePay360 workflow is:

```text
EMPLOYEE CREATION
        |
        v
CONTRACT CONFIGURATION
        |
        v
WORKING SCHEDULE ASSIGNMENT
        |
        v
ATTENDANCE TRACKING
        |
        v
TIME OFF ALLOCATION
        |
        v
TIME OFF REQUEST
        |
        v
APPROVAL / REFUSAL
        |
        v
SALARY STRUCTURE
        |
        v
SALARY RULES
        |
        v
PAYRUN CREATION
        |
        v
PAYROLL PERIOD SELECTION
        |
        v
EMPLOYEE SELECTION
        |
        v
PAYROLL COMPUTATION
        |
        v
VALIDATION
        |
        +--------------------+
        |                    |
        v                    v
    VALIDATION FAIL       VALIDATION PASS
        |                    |
        v                    v
   Correct Data          MARK VALIDATED
                             |
                             v
                         MARK PAID
                             |
                  +----------+----------+
                  |                     |
                  v                     v
             PDF PAYSLIP          EMAIL PAYSLIPS
                  |
                  v
          PAYROLL HISTORY
                  |
                  v
        LIVE PAYROLL DASHBOARD
```

---

# System Architecture

PeoplePay360 is designed around a modular architecture that separates HR operations, payroll configuration, payroll computation, validation, and reporting.

```text
                    +----------------------+
                    |       Frontend       |
                    | Employee / HR /      |
                    | Payroll Interfaces   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |       API Layer      |
                    +----------+-----------+
                               |
             +-----------------+------------------+
             |                 |                  |
             v                 v                  v
      +-------------+   +-------------+   +-------------+
      | HR Service  |   | Payroll     |   | Reporting   |
      |             |   | Engine      |   | Service     |
      +------+------+   +------+------+   +------+------+
             |                 |                  |
             |                 |                  |
             v                 v                  v
      Employee             Contract           Analytics
      Attendance           Resolver           KPIs
      Schedule             Salary Rules       Charts
      Time Off             Computation        Alerts
      Contracts             Validation
                                |
                                v
                         +--------------+
                         |   Database   |
                         +--------------+
                                |
              +-----------------+----------------+
              |                 |                |
              v                 v                v
           Payslip             PDF             Email
```

The project requirements allow teams to select their own backend language, frontend framework, and database technology. The primary focus is business logic, data relationships, payroll computation, and end-to-end user experience.

---

# Core Modules

## Employee Management

The Employee module acts as the central operational hub.

### Employee Information

- Employee identity
- Department
- Manager
- Job position
- Employee type
- Working schedule
- Employment status

### Related Records

Each employee provides access to:

- Contracts
- Attendance
- Time Off
- Allocations
- Payroll records

The employee interface supports List, Kanban, and Form views, with related records accessible from the employee form.

---

# Contract Management

PeoplePay360 maintains complete employment contract history.

Each contract contains:

- Start date
- End date
- Wage
- Department
- Position
- Employment terms
- Salary structure
- Status

Example:

```text
Employee: Rahul Sharma

Contract A
01-Jan-2025 -> 31-Dec-2025
Annual Wage: ₹8,00,000

Contract B
01-Jan-2026 -> 31-Dec-2026
Annual Wage: ₹12,00,000
```

When processing payroll for March 2026, the payroll engine must resolve Contract B.

The system must not simply select the employee's latest contract.

The contract applicable to the payroll period must be identified based on the contract's validity period, while concurrent active contracts must be prevented.

---

# Working Schedules

Working Schedules define the expected working pattern for employees.

Each schedule supports:

- Day
- Start time
- End time
- Break duration
- Weekly hours
- Schedule type

Example:

```text
Monday       09:00 - 18:00
Tuesday      09:00 - 18:00
Wednesday    09:00 - 18:00
Thursday     09:00 - 18:00
Friday       09:00 - 18:00
Saturday     Off
Sunday       Off
```

Weekly hours are calculated automatically from the configured working pattern.

Schedules can be assigned to employees or contracts and provide the expected working context for attendance and payroll.

---

# Attendance and Working Schedules

Attendance records capture actual employee working activity.

Each attendance entry contains:

```text
Employee
Date
Check In
Check Out
Worked Hours
Status
```

The system supports:

- Check-in
- Check-out
- Worked-hour calculation
- Late detection
- Missing check-out detection
- Overtime tracking
- Attendance corrections
- Exception review

Authorized users can manually correct attendance records while maintaining the data for reporting and dashboard analysis.

---

# Time Off Management

PeoplePay360 separates leave configuration, allocation, and requests.

```text
Time Off Type
       |
       v
Allocation
       |
       v
Employee Balance
       |
       v
Leave Request
       |
       v
Approval
       |
       v
Balance Consumption
```

## Time Off Types

Define:

- Leave name
- Unit: Days / Hours
- Allocation requirement
- Approval workflow
- Payroll integration

## Allocations

Track:

- Allocated amount
- Taken amount
- Remaining amount
- Validity period
- Approval status

## Requests

Employees can submit requests containing:

- Leave type
- Start date
- End date
- Duration
- Status

When an allocation-based leave request is approved, the corresponding allocation is automatically consumed.

---

# Salary Structure

A Salary Structure defines the collection of salary rules used for payroll.

Example:

```text
Regular Salary
    |
    +-- Basic
    +-- HRA
    +-- Transport Allowance
    +-- Gross
    +-- PF
    +-- Tax
    +-- Net Salary
```

Salary structures contain:

- Structure name
- Associated salary rules
- Rule execution sequence
- Active status
- Employee association

The selected salary structure determines which rules are applied during Payrun processing.

---

# Salary Rule Engine

The Salary Rule Engine is the core payroll computation layer.

Each rule contains:

- Name
- Code
- Category
- Sequence
- Computation method
- Computation value/formula

Supported computation approaches include:

- Fixed amounts
- Percentages
- Formulas

Salary rules are executed sequentially so that dependent calculations can reference previously computed values.

### Example

```text
Rule 10: Basic
        |
        v
Rule 20: HRA
        |
        v
Rule 30: Allowance
        |
        v
Rule 40: Gross
        |
        v
Rule 50: PF
        |
        v
Rule 60: Tax
        |
        v
Rule 70: Net
```

Example computation:

```text
Basic             ₹50,000
HRA               ₹10,000
Allowance          ₹3,000
-------------------------
Gross             ₹63,000

PF                 ₹6,000
Tax                ₹2,500
-------------------------
Net               ₹54,500
```

The values are produced by configured salary rules rather than hardcoded payroll logic.

---

# Payroll Processing

## Payrun Creation

Payrun creation follows a two-step workflow.

### Step 1: Define Payroll Scope

The user selects:

```text
Salary Structure
Payroll Period
```

### Step 2: Select Employees

The system identifies eligible employees.

The payroll user explicitly selects which employees should be included.

Only the selected employees are added to the Payrun.

This prevents accidental processing of unintended employees.

---

# Payrun Lifecycle

```text
Draft
  |
  v
Compute
  |
  v
Computed
  |
  v
Validate
  |
  v
Validated
  |
  v
Mark Paid
  |
  v
Paid
```

The Payrun processing interface provides:

- Compute
- Validate
- Mark Paid
- Send Payslips

Warnings are displayed before finalization and completed payroll batches remain available as historical records.

---

# Payslip Computation

Each Payslip connects:

```text
Employee
+
Applicable Contract
+
Payroll Period
+
Salary Structure
+
Salary Rules
+
Attendance / Leave Context
```

The resulting payslip contains:

```text
Employee Information

Worked Days

Basic Salary
Allowances
Gross Salary

Deductions

Net Salary
```

The computation uses the contract applicable to the selected payroll period together with the Salary Structure assigned to the Payrun.

---

# Validation and Error Detection

Payroll errors can have direct financial consequences.

PeoplePay360 therefore introduces validation before finalization.

Potential warnings include:

```text
Missing Bank Details
Missing Required Employee Information
Duplicate Payslip
Contract Conflict
Missing Contract
Invalid Payroll Context
Missing Salary Configuration
```

The system surfaces potential payroll issues before the Payrun is finalized.

A validation-oriented architecture can be represented as:

```text
                  PAYRUN
                     |
                     v
              VALIDATION ENGINE
                     |
        +------------+------------+
        |                         |
        v                         v
     WARNINGS                  VALID
        |                         |
        v                         v
   User Correction          Finalization
                                  |
                                  v
                              Mark Paid
```

---

# Role-Based Access Control

PeoplePay360 implements five primary roles.

| Role | Primary Access |
|---|---|
| Employee | Own employee information, attendance, leave |
| HR Manager | HR records, contracts, schedules, attendance, time off |
| HR Payroll User | HR operations + Payruns/Payslips |
| HR Payroll Manager | Full HR and Payroll configuration |
| Admin | Complete platform administration |

## Employee

Can:

- View own details
- View own attendance
- View leave balances
- Create attendance records
- Create Time Off requests

Cannot access HR or payroll administration.

## HR Manager

Can manage:

- Employees
- Attendance
- Contracts
- Working Schedules
- Time Off

Can approve/refuse Time Off requests.

Has no payroll access.

## HR Payroll User

Includes HR Manager permissions and additionally provides:

- Create/Read/Update Payruns
- Create/Read/Update Payslips
- Read-only Salary Structures
- Read-only Salary Rules

## HR Payroll Manager

Provides full CRUD access to:

- Payruns
- Payslips
- Salary Structures
- Salary Rules

## Admin

Provides:

- Full system access
- User management
- Role assignment
- Permission updates
- Complete administration

---

# Payroll Dashboard

The Payroll Dashboard provides a consolidated view of HR and payroll operations.

## Key Performance Indicators

```text
Total Net Salary Paid
Payslips Generated
Average Salary
Approved Time Off
Attendance Health
```

## Analytics

### Salary

- Salary cost by department
- Monthly net salary trends

### Attendance

- Present
- Late
- Absent
- Overtime
- Missing check-outs
- Manual edits
- Attendance coverage

### Time Off

- Approved leave
- Pending requests
- Leave balances
- Approved days

### Department

- Headcount
- Total salary expenditure

The dashboard aggregates live information from Employees, Contracts, Payroll, Attendance, and Time Off.

---

# Payslip Generation and Delivery

After payroll finalization, the platform supports:

## Individual Payslip PDF

```text
Payrun
   |
   v
Payslip
   |
   v
Generate PDF
```

## Bulk Email Distribution

```text
Payrun
   |
   v
Send Payslips
   |
   +---- Employee A
   +---- Employee B
   +---- Employee C
   +---- Employee D
```

---

# Data Model

A logical data model for PeoplePay360 can be represented as:

```text
Employee
    |
    +------------------+
    |                  |
    v                  v
Contract          WorkingSchedule
    |
    v
SalaryStructure
    |
    v
SalaryRule


Employee
    |
    +---------> Attendance
    |
    +---------> TimeOffRequest
    |
    +---------> LeaveAllocation
    |
    +---------> Payslip


Payrun
    |
    +---------> Payslip
                    |
                    +---------> PayslipLine
```

## Primary Entities

```text
Employee
Department
Job Position

Contract
Working Schedule

Attendance

Time Off Type
Leave Allocation
Time Off Request

Salary Structure
Salary Rule

Payrun
Payslip
Payslip Line
```

---

# End-to-End Business Flow

## Scenario 1: Employee to Payslip

```text
1. Create Employee
       |
2. Assign Department and Position
       |
3. Create Employment Contract
       |
4. Assign Working Schedule
       |
5. Capture Attendance
       |
6. Process Time Off
       |
7. Configure Salary Structure
       |
8. Configure Salary Rules
       |
9. Create Payrun
       |
10. Select Payroll Period
       |
11. Select Employees
       |
12. Resolve Applicable Contract
       |
13. Compute Payslip
       |
14. Execute Salary Rules
       |
15. Validate Payroll
       |
16. Mark Payrun as Paid
       |
17. Generate Payslip PDF
       |
18. Send Payslip
       |
19. Update Dashboard
```

---

## Scenario 2: Leave Allocation to Request

```text
Create Time Off Type
        |
        v
Allocate Leave
        |
        v
Approve Allocation
        |
        v
Employee Leave Balance
        |
        v
Employee Creates Request
        |
        v
HR Reviews Request
        |
        +----------+
        |          |
        v          v
     Refused    Approved
                   |
                   v
            Deduct Allocation
                   |
                   v
            Update Balance
```

---

# Key Business Rules

## Contract Rule

Payroll must use the contract applicable to the selected payroll period.

```text
Contract Start <= Payroll Period End

AND

Contract End >= Payroll Period Start
```

Only one valid contract should apply to the payroll period.

---

## Schedule Rule

Weekly working hours must be derived from the configured schedule.

```text
Daily Working Hours
        ×
Working Days
        =
Weekly Working Hours
```

---

## Leave Rule

For allocation-based leave:

```text
Remaining Leave
=
Allocated Leave
-
Approved Leave Taken
```

Approval triggers balance consumption.

---

## Salary Rule

Salary rules execute according to sequence.

```text
Rule A
  ↓
Rule B
  ↓
Rule C
  ↓
Rule D
```

A rule may depend on the results of previously executed rules.

---

## Payroll Rule

A payslip is valid only when its required payroll context is available:

```text
Employee
+
Applicable Contract
+
Salary Structure
+
Salary Rules
+
Payroll Period
```

---

## Validation Rule

A Payrun should not be finalized when critical payroll issues remain unresolved.

---

## Historical Rule

Finalized and paid payroll records must remain available as historical records rather than being overwritten by future payroll cycles.

---

# Technical Design Principles

## Business Logic Over Hardcoded Values

Core business rules must be implemented in application logic.

This includes:

- Contract resolution
- Schedule calculations
- Leave logic
- Salary computation
- Validation

---

## Configuration-Driven Payroll

Salary Structures and Salary Rules should be functional configuration entities.

Changing a salary rule should change future payroll calculations without modifying application source code.

```text
Configuration
      |
      v
Salary Structure
      |
      v
Salary Rules
      |
      v
Payroll Engine
      |
      v
Payslip
```

---

## Historical Data Integrity

Historical contracts and payroll batches should remain accessible.

```text
2025 Contract
       |
2026 Contract
       |
2027 Contract
```

The system should preserve the employee's employment history while using the correct record for each payroll period.

---

## Live Reporting

Dashboards should query actual application records.

```text
HR Data
   +
Attendance
   +
Leave
   +
Payroll
   |
   v
Dashboard
```

---

# Demo Scenario

The final-round demonstration can focus on two connected workflows.

## Demo 1: Employee to Payslip

```text
Employee
   ↓
Contract
   ↓
Attendance
   ↓
Payroll Period
   ↓
Payrun
   ↓
Salary Rules
   ↓
Payslip
   ↓
Validation
   ↓
Paid
   ↓
PDF
```

Demonstrate:

- Employee profile
- Multiple contracts
- Applicable contract resolution
- Attendance
- Payrun creation
- Salary computation
- Validation warning
- Payslip
- PDF generation

---

## Demo 2: Leave Allocation to Request

```text
Leave Allocation
       ↓
Employee Balance
       ↓
Leave Request
       ↓
Approval
       ↓
Automatic Balance Deduction
```

Demonstrate:

```text
Allocated: 20 Days
Taken:      0 Days
Remaining: 20 Days

Employee requests: 3 Days

After approval:

Allocated: 20 Days
Taken:      3 Days
Remaining: 17 Days
```

---

# Future Roadmap

With additional development time, PeoplePay360 can be extended with:

- Advanced payroll analytics
- Expanded employee self-service capabilities
- Advanced attendance anomaly detection
- Automated payroll reconciliation
- Additional payroll compliance workflows
- Advanced reporting and export capabilities
- Expanded notification and approval workflows
- Predictive workforce analytics
- Intelligent payroll assistance

The current hackathon implementation prioritizes the required HR and payroll operational flow, while the roadmap provides a path toward a broader enterprise HR platform.

---

# Project Outcomes

PeoplePay360 delivers a unified HR and payroll workflow covering:

```text
Employee Master Data
        +
Contracts
        +
Working Schedules
        +
Attendance
        +
Time Off
        +
Salary Configuration
        +
Payroll Processing
        +
Validation
        +
Payslip Generation
        +
Payment Tracking
        +
Analytics
```

The resulting platform demonstrates:

- Connected HR operations
- Period-aware contract processing
- Configurable salary computation
- Automated leave balance management
- Role-based permissions
- Payroll validation
- Historical payroll tracking
- PDF payslip generation
- Bulk payslip distribution
- Live HR and payroll analytics

---

# Conclusion

PeoplePay360 transforms HR and payroll from a collection of disconnected administrative records into a unified operational system.

The platform follows a simple principle:

```text
Employee Activity
       ↓
HR Operations
       ↓
Business Rules
       ↓
Payroll Engine
       ↓
Validated Payroll
       ↓
Payslip
       ↓
Management Insight
```

The objective is not merely to build an HR management interface. It is to create a reliable business system in which every important HR event can flow through to payroll and reporting while maintaining correct contracts, leave balances, salary calculations, permissions, validations, and historical records.

**PeoplePay360 — From Employee Lifecycle to Accurate Payroll, in One Connected Platform.**
