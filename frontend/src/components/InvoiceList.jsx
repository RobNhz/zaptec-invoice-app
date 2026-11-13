import { useEffect, useState } from "react";
import { getApiUrl, getInvoices } from "../api";

export default function InvoiceList({ reloadToken }) {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    getInvoices().then(setInvoices).catch(() => setInvoices([]));
  }, [reloadToken]);

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500">No invoices generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <div key={invoice.invoice_id} className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <a 
            href={`${getApiUrl()}${invoice.pdf_url}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center justify-between group"
          >
            <div>
              <span className="font-medium text-slate-700">Invoice {invoice.period_start}</span>
              <span className="text-gray-500 mx-2">&rarr;</span>
              <span className="text-gray-600">{invoice.period_end}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-emerald-600 font-semibold">€{invoice.total_amount.toFixed(2)}</span>
              <svg 
                className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}
