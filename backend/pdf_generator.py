from weasyprint import HTML
from jinja2 import Template

def generate_invoice_pdf(owner, consumptions, total_amount, output_path):
    html_template = """
    <h1>Invoice for {{ owner.name }}</h1>
    <p>{{ owner.address }}</p>
    <p>Period: {{ start_date }} – {{ end_date }}</p>
    <table border="1" cellspacing="0" cellpadding="4">
        <tr><th>Month</th><th>kWh</th><th>Cost</th></tr>
        {% for c in consumptions %}
        <tr>
            <td>{{ c.period_start.strftime('%B %Y') }}</td>
            <td>{{ c.kwh_used }}</td>
            <td>{{ "%.2f" | format(c.total_cost) }} €</td>
        </tr>
        {% endfor %}
    </table>
    <h3>Total: {{ "%.2f" | format(total_amount) }} €</h3>
    """
    html = Template(html_template).render(
        owner=owner,
        consumptions=consumptions,
        start_date=consumptions[0].period_start,
        end_date=consumptions[-1].period_end,
        total_amount=total_amount
    )
    HTML(string=html).write_pdf(output_path)
    return output_path
