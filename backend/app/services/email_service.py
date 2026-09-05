import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.payroll import Payrun, Payslip
from app.models.employee import Employee
from app.services.pdf_service import generate_payslip_pdf

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER)


def _send_email(to: str, subject: str, body: str, attachment_path: str):
    msg = MIMEMultipart()
    msg["From"]    = EMAIL_FROM
    msg["To"]      = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    with open(attachment_path, "rb") as f:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(f.read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f"attachment; filename={os.path.basename(attachment_path)}")
    msg.attach(part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(EMAIL_FROM, to, msg.as_string())


def send_payslips_bulk(db: Session, payrun_id) -> dict:
    payrun = db.query(Payrun).filter(Payrun.id == payrun_id).first()
    if not payrun:
        raise HTTPException(status_code=404, detail="Payrun not found")
    if payrun.status not in ("validated", "paid"):
        raise HTTPException(status_code=400, detail="Payrun must be validated or paid before sending payslips")

    sent, failed = 0, []

    for payslip in payrun.payslips:
        emp = db.query(Employee).filter(Employee.id == payslip.employee_id).first()
        if not emp or not emp.email:
            failed.append({"employee_id": payslip.employee_id, "reason": "No email address"})
            continue

        try:
            pdf_path = generate_payslip_pdf(db, payslip.id)
            total_deductions = float(payslip.gross_salary) - float(payslip.net_salary)

            period = f"{payrun.period_start} to {payrun.period_end}"
            body = f"""
            <p>Dear {emp.name},</p>
            <p>Please find attached your payslip for the period <strong>{period}</strong>.</p>
            <table style="border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:4px 12px 4px 0;color:#666">Gross Salary</td>
                  <td><strong>₹ {float(payslip.gross_salary):,.2f}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666">Deductions</td>
                  <td><strong>₹ {total_deductions:,.2f}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666">Net Salary</td>
                  <td><strong>₹ {float(payslip.net_salary):,.2f}</strong></td></tr>
            </table>
            <p style="color:#888;font-size:12px;margin-top:24px">
              This is a system-generated email from PeoplePay360. Please do not reply.
            </p>
            """

            _send_email(
                to=emp.email,
                subject=f"Your Payslip — {period}",
                body=body,
                attachment_path=pdf_path,
            )

            sent += 1

        except Exception as e:
            failed.append({"employee_id": payslip.employee_id, "reason": str(e)})

    return {"sent": sent, "failed": failed}
