import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

export function useCheckIns() {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCheckIns = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/checkins`);
      const data = await res.json();
      setCheckIns(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load check-ins", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckIns();
    const interval = setInterval(loadCheckIns, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return { checkIns, setCheckIns, loadCheckIns, loading };
}
