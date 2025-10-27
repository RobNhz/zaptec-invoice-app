from fastapi import FastAPI
from database import SessionLocal
from models import Owner, Consumption, Invoice
from zaptec_api import fetch_charger_sessions
from pdf_generator import generate_invoice_pdf
import os, uuid
from datetime import datetime

app = FastAPI()

@app.get("/refresh")
def refresh_data():
    db = SessionLocal()
    owners = db.query(Owner).all()
    for owner in owners:
        sessions = fetch_charger_sessions(owner.charger_id)
        for s in sessions:
            consumption = Consumption(
                charger_id=owner.charger_id,
                period_start=datetime.fromisoformat(s["StartDate"]),
                period_end=datetime.fromisoformat(s["EndDate"]),
                kwh_used=float(s["kWh"]),
                cost_per_kwh=float(os.getenv("COST_PER_KWH", 0.25)),
                total_cost=float(s["kWh"]) * float(os.getenv("COST_PER_KWH", 0.25)),
                fetched_at=datetime.now()
            )
            db.add(consumption)
        db.commit()
    db.close()
    return {"message": "Data refreshed successfully."}

@app.get("/invoices")
def list_invoices():
    db = SessionLocal()
    invoices = db.query(Invoice).order_by(Invoice.generated_at.desc()).all()
    db.close()
    return invoices