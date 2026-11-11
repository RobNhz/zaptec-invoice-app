import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from backend.main import app
import os

client = TestClient(app)

# Mocking the database session to avoid real DB connections
@pytest.fixture(autouse=True)
def mock_db():
    with patch("backend.main.SessionLocal") as mock_session_local:
        mock_session = Mock()
        mock_session_local.return_value = mock_session
        yield mock_session

# Mocking Zaptec API calls
@patch("backend.main.fetch_chargers")
@patch("backend.main.fetch_charge_history")
def test_sync_data(mock_fetch_history, mock_fetch_chargers):
    # Mock charger data
    mock_fetch_chargers.return_value = [
        {"Id": "charger_1", "Name": "Charger 1", "Address": "Street 1"}
    ]
    # Mock history data
    mock_fetch_history.return_value = [
        {"StartDateTime": "2024-10-01T10:00:00Z", "EndDateTime": "2024-10-01T11:00:00Z", "KWh": 10.0}
    ]

    response = client.post(
        "/sync",
        json={"access_token": "fake_token", "history_days": 30}
    )

    assert response.status_code == 200
    assert "synchronized" in response.json()["message"]

@patch("backend.main.generate_invoice_pdf")
@patch("backend.main._upload_invoice_to_supabase")
def test_generate_invoices(mock_upload, mock_generate):
    # Create mock objects for data
    mock_owner = Mock(owner_id="owner_1", charger_id="charger_1", name="Test Owner", address="Address")
    mock_consumption = Mock(total_cost=50.0, period_start="2024-10-01", period_end="2024-10-31")

    # Configure the mock_session.query.all() behavior
    # We need to handle two different types of queries: Owner and Consumption
    # We can use side_effect to return different results based on the call
    def query_side_effect(model):
        mock_query = Mock()
        if model.__name__ == "Owner":
            mock_query.all.return_value = [mock_owner]
        elif model.__name__ == "Consumption":
            mock_query.all.return_value = [mock_consumption]
        else:
            mock_query.all.return_value = []
        return mock_query

    with patch("backend.main.SessionLocal") as mock_session_local:
        mock_session = Mock()
        mock_session_local.return_value = mock_session
        mock_session.query.side_effect = query_side_effect

        response = client.post("/generate-invoices?target_month=2024-10")

        assert response.status_code == 200
        assert "Generated 1 invoice(s)" in response.json()["message"]
        assert len(response.json()["invoice_ids"]) == 1

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
