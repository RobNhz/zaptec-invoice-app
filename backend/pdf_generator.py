from jinja2 import Template
from weasyprint import HTML


def generate_invoice_pdf(owner, consumptions, total_amount, output_path, period_start, period_end):
    html_template = """
    <h1>Invoice for {{ owner.name }}</h1>
    <p>{{ owner.address }}</p>
    <p>Period: {{ period_start }} – {{ period_end }}</p>
    <table border="1" cellspacing="0" cellpadding="4">
        <tr><th>Session date</th><th>kWh</th><th>Cost</th></tr>
        {% for c in consumptions %}
        <tr>
            <td>{{ c.period_start.strftime('%Y-%m-%d') }}</td>
            <td>{{ "%.2f" | format(c.kwh_used) }}</td>
            <td>{{ "%.2f" | format(c.total_cost) }} €</td>
        </tr>
        {% endfor %}
    </table>
    <h3>Total: {{ "%.2f" | format(total_amount) }} €</h3>
    """
    html = Template(html_template).render(
        owner=owner,
        consumptions=consumptions,
        period_start=period_start,
        period_end=period_end,
        total_amount=total_amount,
    )
    HTML(string=html).write_pdf(output_path)
    return output_path
