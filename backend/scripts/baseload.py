"""Initialize DB with chargers + charge history from Zaptec.

Usage:
  cd backend
  python scripts/baseload.py --username user@example.com --history-days 180

Password can be entered interactively or passed via ZAPTEC_PASSWORD env var.
"""

import argparse
import getpass
import os
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal, engine
from models import Base, Consumption, Owner
from zaptec_api import authenticate_user, fetch_charge_history, fetch_chargers


def extract_session_bounds(entry):
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


def extract_kwh(entry):
    for key in ("KWh", "kWh", "Energy"):
        if entry.get(key) is not None:
            return float(entry[key])
    return 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--history-days", type=int, default=180)
    parser.add_argument("--cost-per-kwh", type=float, default=float(os.getenv("COST_PER_KWH", 0.25)))
    args = parser.parse_args()

    password = os.getenv("ZAPTEC_PASSWORD") or getpass.getpass("Zaptec password: ")

    token = authenticate_user(args.username, password)
    access_token = token["access_token"]

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    inserted = 0
    owners_created = 0
    from_time = datetime.now(timezone.utc) - timedelta(days=args.history_days)

    try:
        chargers = fetch_chargers(access_token)
        for charger in chargers:
            charger_id = str(charger.get("Id") or charger.get("id") or "")
#            charger_id = str(charger.get("deviceId") or "")
            if not charger_id:
                continue

            owner = db.query(Owner).filter(Owner.charger_id == charger_id).first()
            if not owner:
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

            for entry in fetch_charge_history(access_token, charger_id, start_time=from_time):
                start, end = extract_session_bounds(entry)
                if not start or not end:
                    continue

                exists = (
                    db.query(Consumption)
                    .filter(
                        Consumption.charger_id == charger_id,
                        Consumption.period_start == start.date(),
                        Consumption.period_end == end.date(),
                    )
                    .first()
                )
                if exists:
                    continue

                kwh = extract_kwh(entry)
                db.add(
                    Consumption(
                        charger_id=charger_id,
                        period_start=start.date(),
                        period_end=end.date(),
                        kwh_used=kwh,
                        cost_per_kwh=args.cost_per_kwh,
                        total_cost=kwh * args.cost_per_kwh,
                        fetched_at=datetime.utcnow(),
                    )
                )
                inserted += 1

        db.commit()
        print(f"Done. owners_created={owners_created}, sessions_inserted={inserted}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
