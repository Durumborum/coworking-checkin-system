import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import Users from "./components/Users";
import History from "./components/History";
import Simulator from "./components/Simulator";
import { useUsers } from "./hooks/useUsers";
import { useCheckIns } from "./hooks/useCheckIns";

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const { users, loadUsers } = useUsers();
  const { checkIns, loadCheckIns } = useCheckIns();

  const getCurrentlyCheckedIn = () =>
    checkIns.filter((c) => !c.check_out);

  const getTodayCheckIns = () => {
    const today = new Date().toISOString().slice(0, 10);
    return checkIns.filter((c) => c.check_in.startsWith(today));
  };

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <img src="rami_logo_new.avif" alt="Logo" className="h-12" />
        <nav className="flex gap-4">
          <button className={tab==="dashboard"?"font-bold":""} onClick={() => setTab("dashboard")}>Dashboard</button>
          <button className={tab==="users"?"font-bold":""} onClick={() => setTab("users")}>Users</button>
          <button className={tab==="history"?"font-bold":""} onClick={() => setTab("history")}>History</button>
          <button className={tab==="simulator"?"font-bold":""} onClick={() => setTab("simulator")}>Simulator</button>
        </nav>
      </header>

      {tab === "dashboard" && (
        <Dashboard
          users={users}
          checkIns={checkIns}
          getCurrentlyCheckedIn={getCurrentlyCheckedIn}
          getTodayCheckIns={getTodayCheckIns}
        />
      )}

      {tab === "users" && (
        <Users
          users={users}
          loadUsers={loadUsers}
        />
      )}

      {tab === "history" && (
        <History
          users={users}
          checkIns={checkIns}
          reload={loadCheckIns}
        />
      )}

      {tab === "simulator" && (
        <Simulator reload={loadCheckIns} />
      )}
    </div>
  );
}
