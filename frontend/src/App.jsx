import { useCallback, useMemo, useState } from "react";
import InvoiceList from "./components/InvoiceList";
import { generateInvoices, loginZaptec, syncData } from "./api";

function currentBillingMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [targetMonth, setTargetMonth] = useState(currentBillingMonth());
  const [historyDays, setHistoryDays] = useState(90);
  const [auth, setAuth] = useState(() => {
    const token = sessionStorage.getItem("zaptec_access_token");
    return token ? { access_token: token } : null;
  });

  const isLoggedIn = useMemo(() => Boolean(auth?.access_token), [auth]);
  const triggerReload = useCallback(() => setReloadToken((v) => v + 1), []);

  const runAction = async (action) => {
    setLoading(true);
    try {
      const response = await action();
      setMessage(response.message || "Done");
      triggerReload();
    } catch (error) {
      setMessage(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const tokenData = await loginZaptec(username, password);
      setAuth(tokenData);
      sessionStorage.setItem("zaptec_access_token", tokenData.access_token);
      setPassword("");
      setMessage("Logged in to Zaptec API.");
    } catch (error) {
      setMessage(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("zaptec_access_token");
    setAuth(null);
    setMessage("Logged out.");
  };

  if (!isLoggedIn) {
    return (
      <main style={{ padding: "2rem", fontFamily: "Arial", maxWidth: 540, margin: "0 auto" }}>
        <h1>Zaptec Invoice Manager</h1>
        <p>Login with your personal Zaptec account to fetch chargers and charge history.</p>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Zaptec username
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Zaptec password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        </form>
        <p style={{ marginTop: "1rem" }}><strong>Status:</strong> {message}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial", maxWidth: 980, margin: "0 auto" }}>
      <h1>Zaptec Invoice Dashboard</h1>
      <p>Step 1: sync chargers + load history to DB. Step 2: generate invoice PDFs for the selected month.</p>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <label>
          History days
          <input
            type="number"
            min="1"
            max="365"
            value={historyDays}
            onChange={(e) => setHistoryDays(Number(e.target.value))}
            style={{ marginLeft: "0.4rem", width: 80 }}
          />
        </label>
        <button disabled={loading} onClick={() => runAction(() => syncData(auth.access_token, historyDays))}>
          🔄 Sync chargers + charge history
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
        <button disabled={loading} onClick={() => runAction(() => generateInvoices(targetMonth))}>
          🧾 Generate monthly PDFs
        </button>
        <button disabled={loading} onClick={handleLogout}>Logout</button>
      </div>

      <p style={{ marginTop: "1rem" }}><strong>Status:</strong> {message}</p>
      <InvoiceList reloadToken={reloadToken} />
    </main>
  );
}
