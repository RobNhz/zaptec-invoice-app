import os
from datetime import datetime, timedelta, timezone

import requests

ZAPTEC_BASE_URL = os.getenv("ZAPTEC_BASE_URL", "https://api.zaptec.com")
TOKEN_URL = os.getenv("ZAPTEC_TOKEN_URL", f"{ZAPTEC_BASE_URL}/oauth/token")


def _api_get(path, access_token, params=None):
#    headers = {"Authorization": f"Bearer {access_token}"}
    headers = {"accept": "text/plain","authorization": f"Bearer {access_token}"}
#    response = requests.post(f"{ZAPTEC_BASE_URL}{path}", headers=headers, params=params, timeout=30)
    response = requests.get(f"{ZAPTEC_BASE_URL}{path}", headers=headers, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def authenticate_user(username, password):
    payload = {
        "grant_type": "password",
        "username": username,
        "password": password
    }
    response = requests.post(TOKEN_URL, data=payload, timeout=30)
    response.raise_for_status()
    token = response.json()
    token.setdefault("token_type", "Bearer")
    return token


def fetch_chargers(access_token):
    response = _api_get("/api/chargers", access_token)
    if isinstance(response, list):
        return response

    for key in ("Data", "data", "Items", "items"):
        if isinstance(response, dict) and isinstance(response.get(key), list):
            return response[key]
    return []


def fetch_charge_history(access_token, charger_id, start_time=None, end_time=None):
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(days=90)

    params = {
        "ChargerId": charger_id,
        "From": start_time.isoformat(),
        "To": end_time.isoformat(),
    }
    response = _api_get("/api/chargehistory", access_token, params=params)

    if isinstance(response, list):
        return response

    for key in ("Data", "data", "Items", "items"):
        if isinstance(response, dict) and isinstance(response.get(key), list):
            return response[key]
    return []