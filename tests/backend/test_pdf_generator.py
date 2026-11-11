import pytest
from unittest.mock import Mock, patch
from datetime import date
from backend.pdf_generator import generate_invoice_pdf, _format_currency, _format_number, _format_date

# Test formatters
def test_format_number():
    # Current implementation only replaces "." with "," and doesn't add thousands separators
    assert _format_number(1234.56) == "1234,56"
    assert _format_number(0.0) == "0,00"

def test_format_currency():
    assert _format_currency(1234.56) == "1234,56 kr"

def test_format_date():
    d = date(2024, 10, 24)
    assert _format_date(d) == "2024-10-24"

# Mocking objects for generate_invoice_pdf
class MockOwner:
    def __init__(self):
        self.name = "Test Owner"
        self.address = "Test Street 1\nTest City"
        self.charger_id = "CHARGER_001"

class MockConsumption:
    def __init__(self, kwh, cost_per_kwh):
        self.kwh_used = kwh
        self.period_start = date(2024, 10, 1)
        self.period_end = date(2024, 10, 31)
        self.cost_per_kwh = cost_per_kwh
        self.total_cost = kwh * cost_per_kwh

def test_generate_invoice_pdf_logic():
    owner = MockOwner()
    consumptions = [MockConsumption(100, 0.5), MockConsumption(50, 0.5)]
    total_amount = 75.0
    output_path = "test_invoice.pdf"
    period_start = date(2024, 10, 1)
    period_end = date(2024, 10, 31)

    # We mock the HTML class to prevent actual PDF generation
    # and to inspect the rendered HTML content.
    with patch("backend.pdf_generator.HTML") as mocked_html_class:
        # Create a mock instance for HTML
        mock_html_instance = Mock()
        mocked_html_class.return_value = mock_html_instance

        generate_invoice_pdf(owner, consumptions, total_amount, output_path, period_start, period_end)

        # Verify write_pdf was called
        mock_html_instance.write_pdf.assert_called_once()

        # Verify the first argument (the rendered HTML) contains the expected name
        # The call is: HTML(string=rendered_html, base_url=str(BASE_DIR)).write_pdf(output_path)
        # So write_pdf is called on an instance.
        # But we need to check the 'string' argument passed to the HTML constructor.

        # Get the call to the HTML constructor
        constructor_args = mocked_html_class.call_args[1]
        rendered_html = constructor_args.get("string")

        assert "Test Owner" in rendered_html
        assert "75,00 kr" in rendered_html
