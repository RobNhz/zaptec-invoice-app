import { useCallback, useState } from "react";
import InvoiceList from "./components/InvoiceList";
import { generateInvoices, refreshData } from "./api";

function currentBillingMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [targetMonth, setTargetMonth] = useState(currentBillingMonth());

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

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial", maxWidth: 900, margin: "0 auto" }}>
      <h1>Zaptec OCPP Invoice Dashboard</h1>
      <p>Use the management dashboard to fetch charging sessions and generate monthly invoice PDFs.</p>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={loading} onClick={() => runAction(refreshData)}>
          🔄 Extract charging data
        </button>
        <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
        <button disabled={loading} onClick={() => runAction(() => generateInvoices(targetMonth))}>
          🧾 Generate monthly PDFs
        </button>
      </div>

      <p style={{ marginTop: "1rem" }}><strong>Status:</strong> {message}</p>
      <InvoiceList reloadToken={reloadToken} />
    </div>
  );
}
