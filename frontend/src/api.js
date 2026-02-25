const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;

async function parseResponse(res) {
  const body = await res.text();
  let data = {};
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = { message: body };
  }

  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export function getApiUrl() {
  return API_URL;
}

export function createSupabaseConnection(projectUrl, publishableKey) {
  if (!projectUrl || !publishableKey) {
    throw new Error("Supabase connection requires both project URL and publishable key.");
  }

  const baseUrl = projectUrl.replace(/\/$/, "");

  return {
    projectUrl: baseUrl,
    publishableKey,
    async request(path, options = {}) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const response = await fetch(`${baseUrl}${normalizedPath}`, {
        ...options,
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          ...(options.headers || {}),
        },
      });

      return parseResponse(response);
    },
  };
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseConnection(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return supabaseClient;
}

export async function loginZaptec(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseResponse(res);
}

export async function syncData(accessToken, historyDays = 90) {
  const res = await fetch(`${API_URL}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, history_days: historyDays }),
  });
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
