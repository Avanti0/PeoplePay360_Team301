import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.payroll import Payslip
from app.models.employee import Employee

PDF_DIR = os.getenv("PDF_DIR", "/tmp/payslips")


def _ensure_dir():
    os.makedirs(PDF_DIR, exist_ok=True)


def generate_payslip_pdf(db: Session, payslip_id: int) -> str:
    payslip = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    if payslip.status not in ("computed", "validated", "paid"):
        raise HTTPException(status_code=400, detail="Payslip must be computed before generating PDF")

    emp = db.query(Employee).filter(Employee.id == payslip.employee_id).first()
    _ensure_dir()

    filename = f"payslip_{payslip.employee_id}_{payslip.payrun_id}.pdf"
    filepath = os.path.join(PDF_DIR, filename)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style  = ParagraphStyle("title",  parent=styles["Heading1"], alignment=TA_CENTER, fontSize=16)
    header_style = ParagraphStyle("header", parent=styles["Normal"],   alignment=TA_CENTER, fontSize=10, textColor=colors.grey)
    label_style  = ParagraphStyle("label",  parent=styles["Normal"],   fontSize=9,  textColor=colors.grey)
    value_style  = ParagraphStyle("value",  parent=styles["Normal"],   fontSize=9)
    right_style  = ParagraphStyle("right",  parent=styles["Normal"],   fontSize=9,  alignment=TA_RIGHT)

    elements = []

    # Header
    elements.append(Paragraph("PeoplePay360", title_style))
    elements.append(Paragraph("Payslip", header_style))
    elements.append(Spacer(1, 6*mm))

    # Employee + period info
    period = f"{payslip.payrun.period_start} to {payslip.payrun.period_end}"
    info_data = [
        ["Employee", f"{emp.first_name} {emp.last_name}", "Period", period],
        ["Employee Code", emp.employee_code, "Status", payslip.status.upper()],
        ["Email", emp.email, "Worked Days", str(payslip.worked_days)],
    ]
    info_table = Table(info_data, colWidths=[35*mm, 65*mm, 30*mm, 50*mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",   (0, 0), (0, -1), colors.grey),
        ("TEXTCOLOR",   (2, 0), (2, -1), colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    # Salary lines
    line_data = [["#", "Component", "Category", "Amount (₹)"]]
    for i, line in enumerate(sorted(payslip.lines, key=lambda l: l.sequence), 1):
        line_data.append([
            str(i),
            line.name,
            line.category.upper(),
            f"{float(line.amount):,.2f}",
        ])

    line_table = Table(line_data, colWidths=[10*mm, 90*mm, 40*mm, 40*mm])
    line_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ALIGN",         (3, 0), (3, -1), "RIGHT"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f7fa")]),
        ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 4*mm))

    # Summary
    summary_data = [
        ["Gross Salary",     f"₹ {float(payslip.gross_salary):,.2f}"],
        ["Total Deductions", f"₹ {float(payslip.total_deductions):,.2f}"],
        ["Net Salary",       f"₹ {float(payslip.net_salary):,.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[140*mm, 40*mm])
    summary_table.setStyle(TableStyle([
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ALIGN",         (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME",      (0, 2), (-1, 2), "Helvetica-Bold"),
        ("LINEABOVE",     (0, 2), (-1, 2), 1, colors.HexColor("#1e3a5f")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8*mm))

    # Footer
    elements.append(Paragraph(
        f"Generated on {datetime.utcnow().strftime('%d %b %Y %H:%M')} UTC — This is a system-generated payslip.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=7, textColor=colors.grey, alignment=TA_CENTER)
    ))

    doc.build(elements)

    with open(filepath, "wb") as f:
        f.write(buf.getvalue())

    # persist path
    payslip.pdf_path = filepath
    db.commit()

    return filepath
