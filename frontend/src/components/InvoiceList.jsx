import { useEffect, useState } from "react";
import { getApiUrl, getInvoices } from "../api";

export default function InvoiceList({ reloadToken }) {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    getInvoices().then(setInvoices).catch(() => setInvoices([]));
  }, [reloadToken]);

  return (
    <div>
      <h2>Invoices</h2>
      {invoices.length === 0 ? (
        <p>No invoices generated yet.</p>
      ) : (
        <ul>
          {invoices.map((invoice) => (
            <li key={invoice.invoice_id}>
              <a href={`${getApiUrl()}${invoice.pdf_url}`} target="_blank" rel="noreferrer">
                Invoice {invoice.period_start} to {invoice.period_end} ({invoice.total_amount.toFixed(2)} €)
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
