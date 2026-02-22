import os
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import SessionLocal, engine
from models import Base, Consumption, Invoice, Owner
from pdf_generator import generate_invoice_pdf
from zaptec_api import fetch_charger_sessions

BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Zaptec Invoice API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=GENERATED_DIR), name="files")

Base.metadata.create_all(bind=engine)


def _get_billing_period(target_month: str | None) -> tuple[date, date]:
    if target_month:
        period_start = datetime.strptime(f"{target_month}-01", "%Y-%m-%d").date()
    else:
        today = date.today().replace(day=1)
        period_start = (today - timedelta(days=1)).replace(day=1)

    next_month = (period_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    period_end = next_month - timedelta(days=1)
    return period_start, period_end


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/refresh")
def refresh_data():
    db = SessionLocal()
    inserted_count = 0

    try:
        owners = db.query(Owner).all()
        if not owners:
            return {"message": "No owners configured. Add owners to the owners table first.", "inserted": 0}

        for owner in owners:
            sessions = fetch_charger_sessions(owner.charger_id)
            for s in sessions:
                start = datetime.fromisoformat(s["StartDate"])
                end = datetime.fromisoformat(s["EndDate"])

                already_exists = (
                    db.query(Consumption)
                    .filter(
                        Consumption.charger_id == owner.charger_id,
                        Consumption.period_start == start.date(),
                        Consumption.period_end == end.date(),
                    )
                    .first()
                )
                if already_exists:
                    continue

                kwh_used = float(s["kWh"])
                cost_per_kwh = float(os.getenv("COST_PER_KWH", 0.25))
                consumption = Consumption(
                    charger_id=owner.charger_id,
                    period_start=start.date(),
                    period_end=end.date(),
                    kwh_used=kwh_used,
                    cost_per_kwh=cost_per_kwh,
                    total_cost=kwh_used * cost_per_kwh,
                    fetched_at=datetime.utcnow(),
                )
                db.add(consumption)
                inserted_count += 1

        db.commit()
        return {"message": "Charging sessions refreshed.", "inserted": inserted_count}
    finally:
        db.close()


@app.post("/generate-invoices")
def generate_invoices(target_month: str | None = Query(default=None, description="YYYY-MM")):
    db = SessionLocal()
    period_start, period_end = _get_billing_period(target_month)

    try:
        owners = db.query(Owner).all()
        created = []

        for owner in owners:
            consumptions = (
                db.query(Consumption)
                .filter(
                    Consumption.charger_id == owner.charger_id,
                    Consumption.period_start >= period_start,
                    Consumption.period_end <= period_end,
                )
                .order_by(Consumption.period_start.asc())
                .all()
            )

            if not consumptions:
                continue

            total_amount = sum(item.total_cost for item in consumptions)
            invoice_id = str(uuid.uuid4())
            pdf_path = GENERATED_DIR / f"{invoice_id}.pdf"
            generate_invoice_pdf(owner, consumptions, total_amount, str(pdf_path), period_start, period_end)

            invoice = Invoice(
                invoice_id=invoice_id,
                owner_id=owner.owner_id,
                period_start=period_start,
                period_end=period_end,
                total_amount=total_amount,
                pdf_url=f"/files/{invoice_id}.pdf",
                generated_at=datetime.utcnow(),
            )
            db.add(invoice)
            created.append(invoice_id)

        db.commit()
        return {
            "message": f"Generated {len(created)} invoice(s) for {period_start.strftime('%Y-%m')}",
            "invoice_ids": created,
        }
    finally:
        db.close()


@app.get("/invoices")
def list_invoices():
    db = SessionLocal()
    try:
        invoices = db.query(Invoice).order_by(Invoice.generated_at.desc()).all()
        return invoices
    finally:
        db.close()

