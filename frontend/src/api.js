const API_URL = "http://localhost:8000"; // Replace with Render URL after deploy

export async function refreshData() {
  const res = await fetch(`${API_URL}/refresh`);
  return await res.json();
}

export async function getInvoices() {
  const res = await fetch(`${API_URL}/invoices`);
  return await res.json();
}
