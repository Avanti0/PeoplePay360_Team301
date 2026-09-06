import sys
import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from app.db.session import SessionLocal
from app.models.employee import Employee
from app.models.contract import Contract
from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.models.time_off import TimeOffType, Allocation, TimeOffRequest
from app.models.payroll import SalaryStructure, SalaryRule, Payrun, Payslip, PayslipLine
from app.models.user import User
from app.core.dependencies import require_roles, require_admin, require_hr_manager
from app.services.contract_service import resolve_contract_for_period, _validate_no_overlap
from app.services.working_schedule_service import _weekly_hours
from app.services.payroll_service import _execute_rules, _count_worked_days
from app.services.dashboard_service import get_kpis, get_salary_by_dept, get_salary_trend
from fastapi import HTTPException


class TestPeoplePay360BusinessLogic(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_contract_period_resolution(self):
        """Rule 4 & 16A: The applicable contract for payroll is resolved by period window."""
        rahul = self.db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
        self.assertIsNotNone(rahul)

        # For March 2026, active contract B (wage 100,000) is resolved
        contract_2026 = resolve_contract_for_period(self.db, rahul.id, date(2026, 3, 1), date(2026, 3, 31))
        self.assertIsNotNone(contract_2026)
        self.assertEqual(contract_2026.date_start, date(2026, 1, 1))
        self.assertEqual(contract_2026.wage, Decimal("100000.00"))
        self.assertEqual(contract_2026.status, "active")

    def test_02_prevent_overlapping_active_contracts(self):
        """Rule 4: Prevent concurrent/conflicting active contracts for the same employee."""
        rahul = self.db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
        self.assertIsNotNone(rahul)

        with self.assertRaises(HTTPException) as ctx:
            _validate_no_overlap(self.db, rahul.id, date(2026, 6, 1), None)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Overlapping active contract", ctx.exception.detail)

    def test_03_working_schedule_weekly_hours_derived(self):
        """Rule 5 & 16B: Weekly hours are derived dynamically from schedule days."""
        schedule = self.db.query(WorkingSchedule).filter(WorkingSchedule.name == "Standard 9-to-6 (Mon-Fri)").first()
        self.assertIsNotNone(schedule)
        hours = _weekly_hours(schedule)
        self.assertEqual(hours, 40.0)

        part_time = self.db.query(WorkingSchedule).filter(WorkingSchedule.name == "Part-Time 9-to-1 (Mon-Fri)").first()
        self.assertIsNotNone(part_time)
        self.assertEqual(_weekly_hours(part_time), 20.0)

    def test_04_leave_balance_derived_from_requests(self):
        """Rule 7 & 16C: Leave balance is derived from Allocation - approved requests."""
        rahul = self.db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
        alloc = self.db.query(Allocation).filter(
            Allocation.employee_id == rahul.id,
            Allocation.status == "approved"
        ).first()
        self.assertIsNotNone(alloc)
        self.assertEqual(alloc.number_of_days, Decimal("20.00"))
        # Taken is derived as 3.00, remaining is 17.00
        self.assertEqual(alloc.taken, Decimal("3.00"))
        self.assertEqual(alloc.remaining, Decimal("17.00"))

    def test_05_salary_rules_sequence_computation(self):
        """Rule 9 & 16D: Salary rules execute in sequence and drive payslip computation."""
        structure = self.db.query(SalaryStructure).filter(SalaryStructure.name == "Regular Salary").first()
        self.assertIsNotNone(structure)

        rules = [r for r in structure.rules if r.is_active]
        ctx = _execute_rules(rules, wage=100000.0)

        self.assertEqual(ctx["BASIC"], 50000.0)
        self.assertEqual(ctx["HRA"], 10000.0)
        self.assertEqual(ctx["TRANSPORT"], 3000.0)
        self.assertEqual(ctx["GROSS"], 63000.0)
        self.assertEqual(ctx["PF"], 6000.0)
        self.assertEqual(ctx["TAX"], 2500.0)
        self.assertEqual(ctx["NET"], 54500.0)

    def test_06_payslip_breakdown_and_historical_immutability(self):
        """Rule 10 & 16F: Paid payslips preserve immutable snapshot lines and totals."""
        payslip = self.db.query(Payslip).filter(
            Payslip.id == "30000000-0000-0000-0000-000000000001"
        ).first()
        self.assertIsNotNone(payslip)
        self.assertEqual(payslip.status, "paid")
        self.assertEqual(payslip.gross_salary, Decimal("63000.00"))
        self.assertEqual(payslip.net_salary, Decimal("54500.00"))

        lines = {line.code: line.amount for line in payslip.lines}
        self.assertEqual(lines["BASIC"], Decimal("50000.00"))
        self.assertEqual(lines["HRA"], Decimal("10000.00"))
        self.assertEqual(lines["TRANSPORT"], Decimal("3000.00"))
        self.assertEqual(lines["GROSS"], Decimal("63000.00"))
        self.assertEqual(lines["NET"], Decimal("54500.00"))

    def test_07_dashboard_live_kpis(self):
        """Rule 12: Dashboard data is dynamically calculated from source-of-truth records."""
        kpis = get_kpis(self.db)
        self.assertGreater(kpis["total_net_salary_paid"], 0)
        self.assertGreaterEqual(kpis["payslips_generated"], 6)
        self.assertGreaterEqual(kpis["active_employees_count"], 8)
        self.assertEqual(kpis["approved_time_off_days"], 3.0)

    def test_08_rbac_authorization(self):
        """Rule 14: Role-based access control on backend layer."""
        admin_user = User(username="admin", role="admin")
        hr_mgr_user = User(username="emp-001", role="hr_manager")
        employee_user = User(username="emp-002", role="employee")

        admin_checker = require_roles("admin")
        hr_checker = require_roles("hr_manager", "admin")

        self.assertEqual(admin_checker(admin_user), admin_user)
        self.assertEqual(hr_checker(hr_mgr_user), hr_mgr_user)

        with self.assertRaises(HTTPException):
            admin_checker(hr_mgr_user)
        with self.assertRaises(HTTPException):
            hr_checker(employee_user)


if __name__ == "__main__":
    unittest.main(verbosity=2)
