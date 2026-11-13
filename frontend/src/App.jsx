import { useCallback, useEffect, useMemo, useState } from "react";
import InvoiceList from "./components/InvoiceList";
import { getApiUrl, generateInvoices, loginZaptec, syncData, getInvoices } from "./api";

function currentBillingMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Welcome to Zaptec Invoice Manager");
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [targetMonth, setTargetMonth] = useState(currentBillingMonth());
  const [historyDays, setHistoryDays] = useState(90);
  const [usageTimeFrame, setUsageTimeFrame] = useState("30");
  const [stats, setStats] = useState({ totalKWh: 0, avgPerDay: 0, estimatedCost: 0 });

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
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    try {
      const tokenData = await loginZaptec(username, password);
      setAuth(tokenData);
      sessionStorage.setItem("zaptec_access_token", tokenData.access_token);
      setMessage("Successfully logged in");
      setPassword("");
    } catch (error) {
      setMessage(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("zaptec_access_token");
    setAuth(null);
    setMessage("Logged out. Please log in again.");
  };

  const fetchUsageData = async () => {
    if (!auth?.access_token) return;
    
    setLoading(true);
    try {
      const days = usageTimeFrame === "30" ? 30 : 
                     usageTimeFrame === "60" ? 60 :
                     usageTimeFrame === "90" ? 90 :
                     usageTimeFrame === "180" ? 180 : 7;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startTimestamp = Math.floor(startDate.getTime() / 1000);

      const response = await fetch(`${getApiUrl()}/api/chargehistory`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${auth.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          start_timestamp: startTimestamp,
          end_timestamp: Math.floor(Date.now() / 1000),
          owner_ids: ["owner_1"]
        })
      });

      if (!response.ok) throw new Error("Failed to fetch usage data");
      
      const data = await response.json();
      
      let totalKWh = 0;
      data.chargers.forEach(charger => {
        charger.charge_history?.forEach(session => {
          if (session.charge_amount_kwh !== null) {
            totalKWh += session.charge_amount_kwh;
          }
        });
      });

      const avgPerDay = totalKWh / days;
      const estimatedCost = avgPerDay * 2; // $0.20 per kWh average
      
      setStats({
        totalKWh: parseFloat(totalKWh.toFixed(2)),
        avgPerDay: parseFloat(avgPerDay.toFixed(2)),
        estimatedCost: parseFloat(estimatedCost.toFixed(2))
      });
    } catch (error) {
      console.error("Failed to fetch usage:", error);
      setMessage(`Failed to load usage data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!auth?.access_token) return;
    await runAction(() => syncData(auth.access_token, historyDays));
  };

  const handleGenerate = async () => {
    await runAction(() => generateInvoices(targetMonth));
  };

  const getLatestInvoiceUrl = () => {
    if (!auth?.access_token) return null;
    
    fetch(`${getApiUrl()}/invoices`, {
      headers: {
        "Authorization": `Bearer ${auth.access_token}`
      }
    }).then(res => res.json())
      .then(invoices => {
        if (invoices.length > 0 && invoices[0].pdf_url) {
          return `${getApiUrl()}/files/${invoices[0].invoice_id}.pdf`;
        }
        return null;
      })
      .catch(() => null);
  };

  const handleDownloadLatestUnpaid = async () => {
    const url = await getLatestInvoiceUrl();
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("No invoice available to download");
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [usageTimeFrame, auth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-950">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xl font-bold text-white">⚡ Zaptec Invoice Manager</span>
            </div>
            {isLoggedIn && (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-lg transition-all border border-red-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!isLoggedIn ? (
          /* Login Screen */
          <div className="min-h-[calc(100vh-256px)] flex items-center justify-center">
            <div className="w-full max-w-md animate-fadeIn">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Zaptec Invoice Manager
                </h1>
                <p className="text-purple-200 text-lg">
                  Manage your EV charging invoices and usage
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl animate-slideUp">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Logging in...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Sign In
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {message && (
                  <p className={`text-center text-sm ${message.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                    {message}
                  </p>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Dashboard */
          <>
            {/* Usage Card */}
            <section className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Electricity Usage
                </h2>
              </div>

              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <span className="text-sm font-medium text-gray-700">Time Period:</span>
                  <select
                    value={usageTimeFrame}
                    onChange={(e) => setUsageTimeFrame(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="14">Last 14 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="60">Last 60 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 6 months</option>
                  </select>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.totalKWh} kWh</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded-full">Daily</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">${stats.avgPerDay.toFixed(2)}</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-purple-600 bg-purple-200 px-2 py-1 rounded-full">Est. Cost</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">${stats.estimatedCost.toFixed(2)}</div>
                  </div>
                </div>

                <button
                  onClick={fetchUsageData}
                  disabled={loading || !auth?.access_token}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading data..." : "Refresh Usage Data"}
                </button>
              </div>
            </section>

            {/* Invoice Card */}
            <section className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Invoices
                </h2>
              </div>

              <div className="p-6">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !auth?.access_token}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Generate Latest Invoice
                  </button>

                  <button
                    onClick={handleSync}
                    disabled={loading || !auth?.access_token}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium rounded-xl shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Data
                  </button>

                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownloadLatestUnpaid();
                    }}
                    disabled={!auth?.access_token}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Latest Invoice
                  </a>

                  <div className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl border border-gray-300 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    View All PDFs
                  </div>
                </div>

                {/* Invoice List */}
                <InvoiceList reloadToken={reloadToken} />
              </div>
            </section>

            {/* Message Toast */}
            {message && (
              <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg transform transition-all animate-slideUp ${
                message.includes('Failed') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}>
                {message}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 py-6 text-center text-purple-200 text-sm">
          <p>Zaptec Invoice Manager &copy; {new Date().getFullYear()}</p>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
