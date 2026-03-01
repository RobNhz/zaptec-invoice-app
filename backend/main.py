import os
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import SessionLocal, engine
from models import Base, Consumption, Invoice, Owner
from pdf_generator import generate_invoice_pdf
from zaptec_api import authenticate_user, fetch_charge_history, fetch_chargers

BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Zaptec Invoice API")

default_origins = "https://zaptec-invoice-app.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", default_origins).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=GENERATED_DIR), name="files")
Base.metadata.create_all(bind=engine)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=3)


class SyncRequest(BaseModel):
    access_token: str = Field(min_length=10)
    history_days: int = Field(default=90, ge=1, le=365)


def _get_billing_period(target_month: str | None) -> tuple[date, date]:
    if target_month:
        period_start = datetime.strptime(f"{target_month}-01", "%Y-%m-%d").date()
    else:
        today = date.today().replace(day=1)
        period_start = (today - timedelta(days=1)).replace(day=1)

    next_month = (period_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    period_end = next_month - timedelta(days=1)
    return period_start, period_end


def _extract_session_bounds(entry):
    start_value = entry.get("StartDateTime") or entry.get("StartDate")
    end_value = entry.get("EndDateTime") or entry.get("EndDate") or start_value
    if not start_value:
        return None, None
    try:
        start = datetime.fromisoformat(start_value.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_value.replace("Z", "+00:00"))
        return start, end
    except ValueError:
        return None, None




SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_INVOICES_BUCKET", "Invoices")
SIGNED_URL_TTL_SECONDS = int(os.getenv("SUPABASE_SIGNED_URL_TTL_SECONDS", "604800"))


def _supabase_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _supabase_headers(content_type: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _upload_invoice_to_supabase(file_path: Path, object_name: str) -> str:
    if not _supabase_enabled():
        return f"/files/{object_name}"

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{quote(SUPABASE_BUCKET)}/{quote(object_name)}"
    with file_path.open("rb") as pdf_file:
        response = requests.post(
            upload_url,
            headers={**_supabase_headers("application/pdf"), "x-upsert": "true"},
            data=pdf_file.read(),
            timeout=30,
        )

    if response.status_code not in {200, 201}:
        raise HTTPException(status_code=502, detail=f"Failed to upload invoice PDF to Supabase: {response.text}")

    return f"supabase://{SUPABASE_BUCKET}/{object_name}"


def _create_signed_invoice_url(bucket: str, object_name: str) -> str:
    sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/{quote(bucket)}/{quote(object_name)}"
    response = requests.post(
        sign_url,
        headers=_supabase_headers("application/json"),
        json={"expiresIn": SIGNED_URL_TTL_SECONDS},
        timeout=15,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Failed to create signed invoice URL: {response.text}")

    payload = response.json()
    signed_path = payload.get("signedURL")
    if not signed_path:
        raise HTTPException(status_code=502, detail="Supabase response missing signedURL for invoice PDF")

    return f"{SUPABASE_URL}/storage/v1{signed_path}"


def _resolve_invoice_pdf_url(stored_url: str | None) -> str | None:
    if not stored_url:
        return stored_url

    if stored_url.startswith("supabase://"):
        if not _supabase_enabled():
            return stored_url

        bucket_and_path = stored_url.replace("supabase://", "", 1)
        bucket, _, object_name = bucket_and_path.partition("/")
        if not bucket or not object_name:
            return stored_url
        return _create_signed_invoice_url(bucket, object_name)

    return stored_url

def _extract_kwh(entry):
    if entry.get("KWh") is not None:
        return float(entry["KWh"])
    if entry.get("kWh") is not None:
        return float(entry["kWh"])
    if entry.get("Energy") is not None:
        return float(entry["Energy"])
    return 0.0


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login")
def login(payload: LoginRequest):
    try:
        token = authenticate_user(payload.username, payload.password)
        return {
            "access_token": token.get("access_token"),
            "token_type": token.get("token_type", "Bearer"),
            "expires_in": token.get("expires_in", 3600),
        }
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Zaptec login failed: {exc}") from exc


@app.post("/sync")
def sync_data(payload: SyncRequest):
    db = SessionLocal()
    inserted_count = 0
    owners_created = 0

    try:
        chargers = fetch_chargers(payload.access_token)
        if not chargers:
            return {"message": "No chargers found for this Zaptec account.", "inserted": 0, "owners_created": 0}

        history_from = datetime.now(timezone.utc) - timedelta(days=payload.history_days)

        for charger in chargers:
            charger_id = str(charger.get("Id") or charger.get("id") or "")
            if not charger_id:
                continue

            existing_owner = db.query(Owner).filter(Owner.charger_id == charger_id).first()
            if not existing_owner:
                owner = Owner(
                    owner_id=charger_id,
                    name=charger.get("Name") or f"Charger {charger_id}",
                    address=charger.get("Address") or "",
                    phone="",
                    charger_id=charger_id,
                    last_month_used=date.today(),
                )
                db.add(owner)
                owners_created += 1

            history_entries = fetch_charge_history(payload.access_token, charger_id, start_time=history_from)
            for entry in history_entries:
                start, end = _extract_session_bounds(entry)
                if not start or not end:
                    continue

                existing = (
                    db.query(Consumption)
                    .filter(
                        Consumption.charger_id == charger_id,
                        Consumption.period_start == start.date(),
                        Consumption.period_end == end.date(),
                    )
                    .first()
                )
                if existing:
                    continue

                kwh_used = _extract_kwh(entry)
                cost_per_kwh = float(os.getenv("COST_PER_KWH", 0.25))
                consumption = Consumption(
                    charger_id=charger_id,
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
        return {
            "message": "Zaptec chargers and charge history synchronized.",
            "inserted": inserted_count,
            "owners_created": owners_created,
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Sync failed: {exc}") from exc
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

            object_name = f"{invoice_id}.pdf"
            stored_pdf_url = _upload_invoice_to_supabase(pdf_path, object_name)

            invoice = Invoice(
                invoice_id=invoice_id,
                owner_id=owner.owner_id,
                period_start=period_start,
                period_end=period_end,
                total_amount=total_amount,
                pdf_url=stored_pdf_url,
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
        result = []
        for invoice in invoices:
            result.append(
                {
                    "invoice_id": invoice.invoice_id,
                    "owner_id": invoice.owner_id,
                    "period_start": invoice.period_start,
                    "period_end": invoice.period_end,
                    "total_amount": invoice.total_amount,
                    "pdf_url": _resolve_invoice_pdf_url(invoice.pdf_url),
                    "generated_at": invoice.generated_at,
                }
            )
        return result
    finally:
        db.close()
