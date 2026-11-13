import { useCallback, useMemo, useState } from "react";
import InvoiceList from "./components/InvoiceList";
import { generateInvoices, loginZaptec, syncData } from "./api";
import Dashboard from "./components/Dashboard";

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

  return (
    <>
      <Dashboard />
      {!isLoggedIn && (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
          <div className="w-full max-w-md">
            <h1 className="text-4xl font-bold text-white mb-2 text-center">
              Zaptec Invoice Manager
            </h1>
            <p className="text-gray-300 text-center mb-8">
              Manage your electric vehicle charging invoices
            </p>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Zaptec Username
                </label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </main>
      )}
      
      {isLoggedIn && (
        <main className="min-h-screen bg-gray-50">
          <Dashboard isLoggedIn={true} 
                     onLogout={handleLogout}
                     message={message}
                     loading={loading}
                     targetMonth={targetMonth}
                     setTargetMonth={setTargetMonth}
                     historyDays={historyDays}
                     setHistoryDays={setHistoryDays}
                     handleSync={() => runAction(() => syncData(auth.access_token, historyDays))}
                     handleGenerate={() => runAction(() => generateInvoices(targetMonth))}
                     reloadToken={reloadToken} />
        </main>
      )}
    </>
  );
}
