# Zaptec Invoice App

Open-source online invoicing for EV charging that:
- extracts user charging sessions from Zaptec/OCPP-compatible APIs,
- stores session/invoice metadata in a free cloud Postgres database (Supabase free tier),
- generates monthly invoice PDFs,
- exposes all operations from a management frontend.

## Architecture

- **Frontend:** React + Vite (deploy on Vercel/Netlify free tier).
- **Backend:** FastAPI (deploy on Render/Fly.io free tier).
- **Database:** Supabase Postgres free tier via `DATABASE_URL`.
- **PDF engine:** WeasyPrint in backend.

The frontend triggers both key workflows:
1. **Extract charging data** → calls `POST /refresh`.
2. **Generate monthly PDFs** → calls `POST /generate-invoices?target_month=YYYY-MM`.

## Local Setup

### 1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3) Seed owners in database

Add rows to `owners` table (at least `owner_id`, `name`, `address`, and `charger_id`).

## API Endpoints

- `GET /health` - service health check.
- `POST /refresh` - fetch sessions from OCPP/Zaptec and insert missing consumptions.
- `POST /generate-invoices?target_month=YYYY-MM` - generate invoice PDFs for one month.
- `GET /invoices` - list generated invoices.
- `GET /files/{invoice_id}.pdf` - open generated PDF.

## Deployment (free tiers)

- **Database:** Supabase project + Postgres URL in backend `DATABASE_URL`.
- **Backend:** Render/Fly.io with env vars from `backend/.env.example`.
- **Frontend:** Vercel/Netlify with `VITE_API_URL` pointing to your backend URL.

## Notes on OCPP

Set `OCPP_API_URL` to your OCPP middleware endpoint implementing:

`GET /chargers/{charger_id}/sessions` returning items with:
- `StartDate` (ISO datetime)
- `EndDate` (ISO datetime)
- `kWh` (number)

If `OCPP_API_URL` is not configured, the app falls back to Zaptec API (`ZAPTEC_API_KEY`).
