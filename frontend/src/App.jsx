import RefreshButton from "./components/RefreshButton";
import InvoiceList from "./components/InvoiceList";

export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Zaptec Invoice Dashboard</h1>
      <RefreshButton />
      <InvoiceList />
    </div>
  );
}
