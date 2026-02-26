from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import styles
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

from datetime import datetime


def generate_invoice(data, filename="invoice.pdf"):
    doc = SimpleDocTemplate(filename, pagesize=A4)
    elements = []

    styles_sheet = styles.getSampleStyleSheet()

    # ---- Title ----
    elements.append(Paragraph("<b>Faktura</b>", styles_sheet["Title"]))
    elements.append(Spacer(1, 10))

    # ---- Sender & Receiver ----
    sender_receiver_data = [
        ["Avsändare:", "Mottagare:"],
        [data["sender_name"], data["receiver_name"]],
        [data["sender_address"], data["receiver_address"]],
    ]

    table = Table(sender_receiver_data, colWidths=[90*mm, 90*mm])
    elements.append(table)
    elements.append(Spacer(1, 10))

    # ---- Invoice Info ----
    invoice_info = [
        ["Fakturadatum:", data["invoice_date"]],
        ["Fakturanr:", data["invoice_number"]],
        ["Laddboxnr:", data["charger_number"]],
        ["Förfallodatum:", data["due_date"]],
    ]

    table = Table(invoice_info, colWidths=[50*mm, 50*mm])
    elements.append(table)
    elements.append(Spacer(1, 15))

    # ---- Specification Table ----
    spec_data = [
        ["Specifikation", "Antal kWh", "Mätperiod", "Schablonpris/kWh", "Total kr"]
    ]

    for row in data["rows"]:
        spec_data.append([
            row["description"],
            row["kwh"],
            row["period"],
            f'{row["price_per_kwh"]} kr',
            f'{row["total"]} kr'
        ])

    table = Table(spec_data, colWidths=[35*mm, 25*mm, 30*mm, 35*mm, 30*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 15))

    # ---- Totals ----
    totals_data = [
        ["Summa faktura:", f'{data["total_invoice"]} kr'],
        ["Öresutjämning:", f'{data["rounding"]} kr'],
        ["Summa att betala:", f'{data["total_to_pay"]} kr'],
    ]

    table = Table(totals_data, colWidths=[70*mm, 30*mm])
    table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 20))

    # ---- Payment Info ----
    elements.append(Paragraph("<b>Betalningsuppgifter</b>", styles_sheet["Heading2"]))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph(
        f"Var vänlig ange referensnumret {data['reference_number']} vid betalning.",
        styles_sheet["Normal"]
    ))

    doc.build(elements)


# -------------------------
# Example usage
# -------------------------

invoice_data = {
    "sender_name": "Samfälligheten Skogsbrynet Västra",
    "sender_address": "Nils Kaggs gata 7C\n254 54 Helsingborg",
    "receiver_name": "Robert Nehez",
    "receiver_address": "CBV 12E\n254 54 Helsingborg",
    "invoice_date": "2026-02-11",
    "invoice_number": "52",
    "charger_number": "ZPG014932 60996",
    "due_date": "2026-02-28",
    "rows": [
        {"description": "", "kwh": "77,76", "period": "Nov-2025", "price_per_kwh": "2,00", "total": "155,52"},
        {"description": "", "kwh": "84,16", "period": "Dec-2025", "price_per_kwh": "2,00", "total": "168,31"},
        {"description": "", "kwh": "85,73", "period": "Jan-2026", "price_per_kwh": "2,00", "total": "171,46"},
        {"description": "Administrationsavgift", "kwh": "3 Per månad", "period": "", "price_per_kwh": "15,00", "total": "45,00"},
    ],
    "total_invoice": "540,30",
    "rounding": "-0,30",
    "total_to_pay": "540,00",
    "reference_number": "60996",
}

generate_invoice(invoice_data, "generated_invoice.pdf")