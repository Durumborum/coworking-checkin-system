import { useState } from "react";

export function useDailyActive() {
  const [dailyActiveData, setDailyActiveData] = useState([]);

  const generateDailyActiveUsersChart = (checkIns, start, end) => {
    const dailyCounts = {};
    const startDate = new Date(start);
    const endDate = new Date(end);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyCounts[d.toISOString().slice(0, 10)] = 0;
    }

    checkIns.forEach(c => {
      const dateStr = new Date(c.check_in).toISOString().slice(0, 10);
      if (dateStr in dailyCounts) dailyCounts[dateStr]++;
    });

    setDailyActiveData(Object.entries(dailyCounts));
  };

  return { dailyActiveData, generateDailyActiveUsersChart };
}
