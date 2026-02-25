# Zaptec Invoice App

Open-source online invoicing for EV charging that:
- logs in with a personal Zaptec account,
- pulls chargers and charge history from Zaptec APIs,
- stores session/invoice metadata in a cloud Postgres database (Supabase free tier),
- generates monthly invoice PDFs from a web management UI.

## Architecture

- **Frontend:** React + Vite (deploy on Vercel/Netlify free tier).
- **Backend:** FastAPI (deploy on Render/Fly.io free tier).
- **Database:** Supabase Postgres free tier via `DATABASE_URL`.
- **PDF engine:** WeasyPrint in backend.

## User Flow

1. User logs in on the start page using Zaptec username + password.
2. Frontend exchanges credentials via backend `POST /auth/login` and receives an access token.
3. User opens dashboard and runs `POST /sync` to import:
   - charger list (`GET /api/chargers`)
   - charger load history (`GET /api/chargehistory`)
4. User generates monthly PDFs with `POST /generate-invoices?target_month=YYYY-MM`.
5. Invoices are listed in dashboard and served from `GET /files/{invoice_id}.pdf`.

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
Alternative:

```bash
uv init
cd backend
uv venv
.venv\Scripts\activate
uv pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Set these frontend environment variables (for browser Supabase API access):
- `VITE_SUPABASE_URL` = your Supabase Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable (anon) key
- optional fallback: `VITE_SUPABASE_ANON_KEY`


## Baseload Script

Initialize chargers + charge history into your DB:

```bash
cd backend
python scripts/baseload.py --username you@example.com --history-days 180
```

- password is read from `ZAPTEC_PASSWORD` env var or prompted interactively.
- script creates missing owners using charger metadata and inserts missing consumption rows.

## API Endpoints

- `GET /health` - health check.
- `POST /auth/login` - Zaptec credential login; returns access token.
- `POST /sync` - sync chargers and charge history into DB.
- `POST /generate-invoices?target_month=YYYY-MM` - generate invoice PDFs for one month.
- `GET /invoices` - list generated invoices.
- `GET /files/{invoice_id}.pdf` - open generated PDF.

## Deployment (free tiers)

- **Database:** Supabase project + Postgres URL in `DATABASE_URL`.
- **Backend:** Render/Fly.io with env vars from `backend/.env.example`.
- **Frontend:** Vercel/Netlify with `VITE_API_URL` pointing to backend URL.


### Vercel note (monorepo root)

This repository keeps the frontend in `frontend/`. To make Vercel builds work from the repo root, the project includes:
- root `package.json` that installs/builds the frontend via `npm --prefix frontend ...`
- `vercel.json` with `outputDirectory: frontend/dist`

So in Vercel, you can keep **Root Directory = repository root**.
