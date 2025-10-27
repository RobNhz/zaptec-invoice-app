# Zaptec Invoice App

A free, web-based invoice generator for Zaptec chargers using FastAPI, Supabase, and React.

## ⚙️ Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
