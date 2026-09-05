from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # noqa: F401  (registers all mapped classes before first query)
from app.routers import auth, employees, contracts, attendance, time_off, payroll, dashboard, working_schedules

app = FastAPI(title="PeoplePay360 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(contracts.router)
app.include_router(attendance.router)
app.include_router(time_off.types_router)
app.include_router(time_off.allocations_router)
app.include_router(time_off.requests_router)
app.include_router(payroll.structures_router)
app.include_router(payroll.rules_router)
app.include_router(payroll.payruns_router)
app.include_router(payroll.payslips_router)
app.include_router(dashboard.router)
app.include_router(working_schedules.router)

@app.get("/health")
def health():
    return {"status": "ok"}
