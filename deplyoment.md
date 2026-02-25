# Deployment Guide (Supabase + Render + Vercel)

This is a platform-specific, click-by-click production deployment recipe for this repository.

## Architecture

- **Database:** Supabase Postgres (`DATABASE_URL` on backend).
- **Backend:** FastAPI on Render.
- **Frontend:** React/Vite on Vercel (repo root deploy).

---

## 1) Supabase setup

1. Open **Supabase Dashboard** -> **New project**.
2. Choose organization, project name, region, and DB password.
3. After provisioning:
   - Go to **Settings -> Database** and copy the Postgres connection details.
   - Go to **Settings -> API** and copy:
     - **Project URL** (`https://<project-ref>.supabase.co`)
     - **Publishable key**.

### Backend DB URL format (SQLAlchemy + psycopg2)

```env
DATABASE_URL=postgresql+psycopg2://postgres:<SUPABASE_DB_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres
```

---

## 2) Render setup (Backend)

1. Open **Render** -> **New +** -> **Web Service**.
2. Connect your GitHub repo (`zaptec-invoice-app`).
3. Configure service:
   - **Root Directory:** `backend`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (Render -> Environment) using the block below.
5. Deploy.
6. Verify backend health:
   - `https://<render-service>.onrender.com/health` should return `{"status":"ok"}`.

### Ready-to-paste Render env vars

```env
DATABASE_URL=postgresql+psycopg2://postgres:<SUPABASE_DB_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres
ZAPTEC_BASE_URL=https://api.zaptec.com
ZAPTEC_TOKEN_URL=https://api.zaptec.com/oauth/token
COST_PER_KWH=2
CORS_ORIGINS=https://<YOUR_VERCEL_DOMAIN>
```

> If you use preview deployments too, use comma-separated origins:
> `CORS_ORIGINS=https://<prod-domain>,https://<preview-domain>`

---

## 3) Vercel setup (Frontend)

1. Open **Vercel** -> **Add New Project**.
2. Import this GitHub repo.
3. Keep **Root Directory = repository root**.
4. Vercel will use repo config:
   - install: `npm install`
   - build: `npm run build`
   - output: `frontend/dist`
5. Add environment variables (Vercel -> Project Settings -> Environment Variables) using block below.
6. Deploy.

### Ready-to-paste Vercel env vars

```env
VITE_API_URL=https://<YOUR_RENDER_SERVICE>.onrender.com
VITE_SUPABASE_URL=https://<SUPABASE_PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY>
VITE_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_KEY>
```

---

## 4) Production validation checklist

1. Backend health is OK (`GET /health`).
2. Frontend loads on Vercel domain.
3. Login to Zaptec works from frontend.
4. Sync succeeds (`POST /sync`).
5. Invoice generation works (`POST /generate-invoices`).
6. Invoice listing works (`GET /invoices`).

---

## 5) Important note about generated PDFs

The backend currently writes PDFs to local disk (`backend/generated`) and serves them via `/files/{invoice_id}.pdf`.
On some hosts, filesystem is ephemeral, so PDFs can be lost after restart/redeploy.

For robust production behavior, move PDFs to object storage (for example Supabase Storage or S3) and persist the public URL in `pdf_url`.
