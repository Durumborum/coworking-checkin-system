import { useState, useMemo } from "react";
   import { API_BASE_URL } from "../config";

export default function History({ users, checkIns, reload }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [sortKey, setSortKey] = useState("check_in");
  const [sortDir, setSortDir] = useState("desc");

  // --- Toggle selection ---
  const toggleUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedUserIds(users.map((u) => u.id));
  const selectNone = () => setSelectedUserIds([]);

  // --- Filter by selected users ---
  const filtered = useMemo(() => {
    if (selectedUserIds.length === 0) return checkIns;

    return checkIns.filter((c) => selectedUserIds.includes(c.user_id));
  }, [checkIns, selectedUserIds]);

  // --- Sorting ---
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const A = a[sortKey] || "";
      const B = b[sortKey] || "";
      if (sortDir === "asc") return A > B ? 1 : -1;
      return A < B ? 1 : -1;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // --- Daily Active Users Table ---
  const [dailyActive, setDailyActive] = useState([]);

  const buildDailyActive = (range) => {
    const today = new Date();

    let start, end;

    if (range === "7days") {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 6);
    }

    if (range === "thisMonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
    }

    if (range === "prevMonth") {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      start = first;
      end = last;
    }

    const daily = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      daily[key] = 0;
    }

    checkIns.forEach((c) => {
      const day = c.check_in.slice(0, 10);
      if (day in daily) daily[day]++;
    });

    setDailyActive(Object.entries(daily));
  };

  return (
    <div className="space-y-6">

      {/* ---------- USER SELECTION ---------- */}
      <section className="p-4 border rounded shadow">
        <h3 className="font-bold mb-2">Select Users</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={selectAll} className="border px-2 py-1 rounded">Select All</button>
          <button onClick={selectNone} className="border px-2 py-1 rounded">Clear</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedUserIds.includes(u.id)}
                onChange={() => toggleUser(u.id)}
              />
              {u.name}
            </label>
          ))}
        </div>
      </section>

      {/* ---------- CHECK-IN HISTORY TABLE ---------- */}
      <section className="p-4 border rounded shadow">
        <h3 className="font-bold mb-2">Check-in / Check-out History</h3>

        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              {["user_name", "check_in", "check_out", "duration"].map((h) => (
                <th
                  key={h}
                  className="border px-2 py-1 cursor-pointer"
                  onClick={() => handleSort(h)}
                >
                  {h.replace("_", " ").toUpperCase()}
                  {sortKey === h ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="border px-2 py-1">{c.user_name}</td>
                <td className="border px-2 py-1">{c.check_in}</td>
                <td className="border px-2 py-1">{c.check_out || "-"}</td>
                <td className="border px-2 py-1">{c.duration || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------- DAILY ACTIVE USERS ---------- */}
      <section className="p-4 border rounded shadow">
        <h3 className="font-bold mb-2">Daily Active Users</h3>

        <div className="flex gap-3 mb-3">
          <button onClick={() => buildDailyActive("7days")} className="border px-2 py-1 rounded">
            Last 7 Days
          </button>
          <button onClick={() => buildDailyActive("thisMonth")} className="border px-2 py-1 rounded">
            This Month
          </button>
          <button onClick={() => buildDailyActive("prevMonth")} className="border px-2 py-1 rounded">
            Previous Month
          </button>
        </div>

        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Active Users</th>
            </tr>
          </thead>
          <tbody>
            {dailyActive.map(([date, count]) => (
              <tr key={date} className="border-b">
                <td className="border px-2 py-1">{date}</td>
                <td className="border px-2 py-1">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
