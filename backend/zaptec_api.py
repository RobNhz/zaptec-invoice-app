import requests, os

ZAPTEC_BASE_URL = "https://api.zaptec.com/api"
ZAPTEC_API_KEY = os.getenv("ZAPTEC_API_KEY")

def fetch_charger_sessions(charger_id):
    headers = {"Authorization": f"Bearer {ZAPTEC_API_KEY}"}
    url = f"{ZAPTEC_BASE_URL}/chargers/{charger_id}/sessions"
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()