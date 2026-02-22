import os

import requests

ZAPTEC_BASE_URL = "https://api.zaptec.com/api"
ZAPTEC_API_KEY = os.getenv("ZAPTEC_API_KEY")
OCPP_API_URL = os.getenv("OCPP_API_URL")
OCPP_API_TOKEN = os.getenv("OCPP_API_TOKEN")


def _fetch_from_ocpp(charger_id):
    if not OCPP_API_URL:
        return None

    headers = {"Authorization": f"Bearer {OCPP_API_TOKEN}"} if OCPP_API_TOKEN else {}
    url = f"{OCPP_API_URL.rstrip('/')}/chargers/{charger_id}/sessions"
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def _fetch_from_zaptec(charger_id):
    if not ZAPTEC_API_KEY:
        raise RuntimeError("Missing ZAPTEC_API_KEY. Configure OCPP_API_URL or ZAPTEC_API_KEY.")

    headers = {"Authorization": f"Bearer {ZAPTEC_API_KEY}"}
    url = f"{ZAPTEC_BASE_URL}/chargers/{charger_id}/sessions"
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def fetch_charger_sessions(charger_id):
    return _fetch_from_ocpp(charger_id) or _fetch_from_zaptec(charger_id)
