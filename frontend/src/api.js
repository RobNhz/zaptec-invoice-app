const DEFAULT_API_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
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
    throw new Error(data.error_description || data.msg || data.detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export function getApiUrl() {
  return API_URL;
}

async function fetchApi(path, options = {}) {
  try {
    return await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach backend API (${API_URL}). Check VITE_API_URL and backend CORS settings.`);
    }
    throw error;
  }
}


export function createSupabaseConnection(projectUrl, publishableKey) {
  if (!projectUrl || !publishableKey) {
    throw new Error("Supabase connection requires both project URL and publishable key.");
  }

  const baseUrl = projectUrl.replace(/\/$/, "");
  let accessToken = null;

  const withAuthHeaders = (headers = {}) => ({
    apikey: publishableKey,
    Authorization: `Bearer ${accessToken || publishableKey}`,
    ...headers,
  });

  const request = async (path, options = {}) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const response = await fetch(`${baseUrl}${normalizedPath}`, {
      ...options,
      headers: withAuthHeaders(options.headers),
    });

    return parseResponse(response);
  };

  return {
    projectUrl: baseUrl,
    publishableKey,
    get accessToken() {
      return accessToken;
    },
    setAccessToken(token) {
      accessToken = token || null;
    },
    clearAccessToken() {
      accessToken = null;
    },
    request,
    from(table, { schema = "public" } = {}) {
      const encodedTable = encodeURIComponent(table);
      return {
        select(query = "*", options = {}) {
          const encodedQuery = encodeURIComponent(query);
          return request(`/rest/v1/${encodedTable}?select=${encodedQuery}`, {
            ...options,
            method: options.method || "GET",
            headers: {
              Accept: "application/json",
              ...(options.headers || {}),
              "Accept-Profile": schema,
            },
          });
        },
        insert(values, options = {}) {
          return request(`/rest/v1/${encodedTable}`, {
            ...options,
            method: options.method || "POST",
            headers: {
              "Content-Type": "application/json",
              Prefer: "return=representation",
              ...(options.headers || {}),
              "Content-Profile": schema,
            },
            body: JSON.stringify(values),
          });
        },
      };
    },
    auth: {
      async signInWithPassword(email, password) {
        const data = await request("/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        accessToken = data?.access_token || null;
        return data;
      },
      async signUp(email, password) {
        return request("/auth/v1/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      },
      async signOut() {
        const result = await request("/auth/v1/logout", { method: "POST" });
        accessToken = null;
        return result;
      },
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
  const res = await fetchApi(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseResponse(res);
}

export async function syncData(accessToken, historyDays = 90) {
  const res = await fetchApi(`/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, history_days: historyDays }),
  });
  return parseResponse(res);
}

export async function generateInvoices(targetMonth) {
  const query = targetMonth ? `?target_month=${targetMonth}` : "";
  const res = await fetchApi(`/generate-invoices${query}`, { method: "POST" });
  return parseResponse(res);
}

export async function getInvoices() {
  const res = await fetchApi(`/invoices`);
  return parseResponse(res);
}
