from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError, OperationalError
import app.models  # noqa: F401  (registers all mapped classes before first query)
from app.routers import auth, employees, contracts, attendance, time_off, payroll, dashboard, working_schedules, users

app = FastAPI(title="PeoplePay360 API", version="1.0.0")

@app.exception_handler(OperationalError)
async def database_operational_exception_handler(request: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database connection failed. Please check that PostgreSQL is running and configured correctly."}
    )

@app.exception_handler(SQLAlchemyError)
async def database_general_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred."}
    )

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
app.include_router(users.router)
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
