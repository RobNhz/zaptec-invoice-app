import { useEffect, useState } from "react";
import { getInvoices } from "../api";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    getInvoices().then(setInvoices);
  }, []);

  return (
    <div>
      <h2>Invoices</h2>
      <ul>
        {invoices.map((i) => (
          <li key={i.invoice_id}>
            <a href={i.pdf_url} target="_blank" rel="noreferrer">
              Invoice {new Date(i.generated_at).toLocaleDateString()}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
