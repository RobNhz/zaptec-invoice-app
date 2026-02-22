const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function parseResponse(res) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed (${res.status})`);
  }
  return res.json();
}

export function getApiUrl() {
  return API_URL;
}

export async function refreshData() {
  const res = await fetch(`${API_URL}/refresh`, { method: "POST" });
  return parseResponse(res);
}

export async function generateInvoices(targetMonth) {
  const query = targetMonth ? `?target_month=${targetMonth}` : "";
  const res = await fetch(`${API_URL}/generate-invoices${query}`, { method: "POST" });
  return parseResponse(res);
}

export async function getInvoices() {
  const res = await fetch(`${API_URL}/invoices`);
  return parseResponse(res);
}
