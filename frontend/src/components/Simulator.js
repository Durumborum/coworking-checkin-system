import { API_BASE_URL } from "../config";
import { useState } from "react";

export default function Simulator({ reload }) {
  const [cardId, setCardId] = useState("");

  const simulate = async () => {
    if (!cardId) return;

    await fetch(`${API_BASE_URL}/api/simulate-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId })
    });

    setCardId("");
    reload();
  };

  return (
    <div className="p-4 border rounded shadow w-full max-w-lg">
      <h3 className="font-bold mb-2">Simulate Check-in/Check-out</h3>

      <input
        type="text"
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        placeholder="Enter card ID"
        className="border px-3 py-2 rounded w-full mb-3"
      />

      <button onClick={simulate} className="px-4 py-2 bg-black text-white rounded">
        Simulate
      </button>
    </div>
  );
}
