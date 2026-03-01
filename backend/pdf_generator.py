import json
from datetime import date, timedelta
from pathlib import Path

from jinja2 import Template
from weasyprint import HTML

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE_DIR / "skogsbrynet_invoice_template.html"
VARIABLES_PATH = BASE_DIR / "skogsbrynet_invoice_template_variables.json"


def _format_number(value: float) -> str:
    return f"{value:.2f}".replace(".", ",")


def _format_currency(value: float) -> str:
    return f"{_format_number(value)} kr"


def _format_date(value: date) -> str:
    return value.strftime("%Y-%m-%d")


def _build_charging_items(consumptions: list) -> list[dict[str, str]]:
    items = []
    for consumption in consumptions:
        period_text = _format_date(consumption.period_start)
        if consumption.period_end and consumption.period_end != consumption.period_start:
            period_text = f"{_format_date(consumption.period_start)} – {_format_date(consumption.period_end)}"

        items.append(
            {
                "kwh": _format_number(consumption.kwh_used),
                "period": period_text,
                "price_per_kwh": _format_currency(consumption.cost_per_kwh),
                "total": _format_currency(consumption.total_cost),
            }
        )
    return items


def generate_invoice_pdf(owner, consumptions, total_amount, output_path, period_start, period_end):
    template = Template(TEMPLATE_PATH.read_text(encoding="utf-8"))
    variables = json.loads(VARIABLES_PATH.read_text(encoding="utf-8"))

    charging_items = _build_charging_items(consumptions)
    due_date = period_end + timedelta(days=14)

    address_lines = [line.strip() for line in (owner.address or "").splitlines() if line.strip()]
    receiver_address = address_lines[0] if address_lines else owner.address or ""
    receiver_postal = address_lines[1] if len(address_lines) > 1 else ""

    variables.update(
        {
            "invoice_date": _format_date(date.today()),
            "receiver_name": owner.name,
            "receiver_address": receiver_address,
            "receiver_postal": receiver_postal,
            "laddbox_number": owner.charger_id,
            "reference_number": owner.charger_id,
            "due_date": _format_date(due_date),
            "message": f"Debitering av elförbrukning för perioden {_format_date(period_start)} – {_format_date(period_end)}.",
            "subtotal": _format_currency(total_amount),
            "rounding": _format_currency(0),
            "total_to_pay": _format_currency(total_amount),
            "charging_items": charging_items,
            "charging_items_count": len(charging_items),
            "charging_label": "Laddning",
        }
    )

    output_file = Path(output_path)
    variables["invoice_number"] = output_file.stem

    rendered_html = template.render(**variables)
    HTML(string=rendered_html, base_url=str(BASE_DIR)).write_pdf(output_path)
    return output_path
