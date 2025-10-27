import { refreshData } from "../api";

export default function RefreshButton() {
  const handleClick = async () => {
    const res = await refreshData();
    alert(res.message);
  };

  return <button onClick={handleClick}>🔄 Refresh Data</button>;
}
