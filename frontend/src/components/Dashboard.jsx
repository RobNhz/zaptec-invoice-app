import { useCallback, useMemo, useState } from "react";
import InvoiceList from "./InvoiceList";
import { generateInvoices, loginZaptec, syncData } from "../api";

function currentBillingMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard({ 
  isLoggedIn = false,
  onLogout,
  message,
  loading,
  targetMonth,
  setTargetMonth,
  historyDays,
  setHistoryDays,
  handleSync,
  handleGenerate,
  reloadToken
}) {
  const [usageTimeFrame, setUsageTimeFrame] = useState("90");

  const toggleLoading = useCallback((isLoading) => {
    setLoading(isLoading);
  }, [setLoading]);

  const handleLogin = async (event) => {
    event.preventDefault();
    toggleLoading(true);
    try {
      // Login handled by parent App component
    } catch (error) {
      toggleLoading(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">⚡ Zaptec Invoice Dashboard</h1>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Control Panel Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Manage Your Charging</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* History Days Control */}
            <div className="flex items-center gap-4">
              <label htmlFor="historyDays" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                History Days:
              </label>
              <input
                id="historyDays"
                type="number"
                min="1"
                max="365"
                value={historyDays}
                onChange={(e) => setHistoryDays(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Chargers + Charge History
                </>
              )}
            </button>

            <div className="border-t border-gray-200 pt-6"></div>

            {/* Generate Invoice Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Target Month:</label>
              <input 
                type="month" 
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Monthly Invoices
                  </>
                )}
              </button>
            </div>

            {/* Status Message */}
            {message && (
              <p className={`text-sm mt-4 ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Usage Statistics Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white">📊 Electricity Usage</h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Time Frame Selector */}
            <div className="flex items-center gap-4">
              <label htmlFor="timeFrame" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Time Frame:
              </label>
              <select
                id="timeFrame"
                value={usageTimeFrame}
                onChange={(e) => setUsageTimeFrame(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-xs"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
              </select>
            </div>

            {/* Usage Info */}
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-gray-700 text-sm mb-3">
                Your electricity usage for the selected time period will be fetched from Zaptec and displayed here after syncing.
              </p>
              
              {/* Usage Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-purple-600 mb-1">--- kWh</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Usage</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600 mb-1">---</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Avg Per Day</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">---</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Estimated Cost</div>
                </div>
              </div>

              {/* Sync Reminder */}
              <p className="text-sm text-orange-600 mt-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Tip: Sync your charger data to see usage statistics</span>
              </p>
            </div>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white">📄 Invoices</h2>
          </div>

          <div className="p-6">
            {/* Invoice Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-lg shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Latest Invoice
              </button>

              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  // Get latest unpaid invoice PDF - placeholder for implementation
                  alert('Latest unpaid invoice functionality will be implemented.');
                }}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-lg shadow-md transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Latest Unpaid Invoice
              </a>
            </div>

            {/* Invoice List */}
            <InvoiceList reloadToken={reloadToken} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-gray-500 text-sm">
        <p>Zaptec Invoice Manager &copy; {new Date().getFullYear()}</p>
      </footer>
    </>
  );
}
