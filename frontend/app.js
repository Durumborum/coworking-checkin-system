const { useState, useEffect, useRef } = React;

// Base URL for API
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range for graph
  const [fromDate, setFromDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const chartRef = useRef(null);
  const [dailyChart, setDailyChart] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) buildChart();
  }, [checkIns, fromDate, toDate]);

  const loadData = async () => {
    try {
      const [usersRes, checkInsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users`),
        fetch(`${API_BASE_URL}/api/checkins`)
      ]);

      if (!usersRes.ok || !checkInsRes.ok) throw new Error('API request failed');

      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setUsers([]);
      setCheckIns([]);
      setLoading(false);
    }
  };

  // ---------------- USER MANAGEMENT ----------------
  const handleCheckIn = async (cardId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId })
      });
      const result = await res.json();
      if (res.ok) alert(result.message);
      else alert(result.error || 'Error processing check-in');
      loadData();
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.cardId) return alert('Name and Card ID are required');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          card_id: newUser.cardId
        })
      });
      if (res.ok) {
        setNewUser({ name: '', email: '', cardId: '' });
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error adding user');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const updateUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          card_id: editingUser.card_id
        })
      });
      if (res.ok) {
        setEditingUser(null);
        loadData();
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  // ---------------- HELPERS ----------------
  const getCurrentlyCheckedIn = () => checkIns.filter(c => !c.check_out);
  const getTodayCheckIns = () => {
    const today = new Date().toDateString();
    return checkIns.filter(c => new Date(c.check_in).toDateString() === today);
  };

  const getUserStatsMonth = (userId) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out && new Date(c.check_in) >= monthStart);
    const totalMinutes = userCheckIns.reduce((acc, c) => acc + (new Date(c.check_out) - new Date(c.check_in)) / 60000, 0);
    const uniqueDays = [...new Set(userCheckIns.map(c => new Date(c.check_in).toDateString()))];
    return {
      checkIns: userCheckIns.length,
      hoursSpent: Math.floor(totalMinutes / 60),
      uniqueDays: uniqueDays.length
    };
  };

  // ---------------- CHART ----------------
  const buildChart = () => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const dayMap = {};
    for (let d = new Date(from); d <= to; d.setDate(d.getDate()+1)) {
      const dayStr = d.toISOString().split('T')[0];
      dayMap[dayStr] = 0;
    }

    checkIns.forEach(c => {
      const checkInDate = new Date(c.check_in);
      if (checkInDate >= from && checkInDate <= to) {
        const dayStr = checkInDate.toISOString().split('T')[0];
        dayMap[dayStr] += 1;
      }
    });

    const labels = Object.keys(dayMap);
    const data = Object.values(dayMap);

    if (dailyChart) dailyChart.destroy();

    const ctx = chartRef.current.getContext('2d');
    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Active Users',
          data,
          fill: false,
          borderColor: '#ABAEA0',
          backgroundColor: '#ABAEA0',
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
    setDailyChart(newChart);
  };

  // ---------------- LOADING / ERROR ----------------
  if (loading) return <div className="min-h-screen flex items-center justify-center text-black">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;

  // ---------------- RENDER ----------------
  return (
    <div className="min-h-screen bg-white text-black font-quattrocento">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2"><img src="rami_logo_new.avif" alt="Rami Ceramics" className="inline h-12"/> Coworking Studio</h1>
          <p className="text-secondary">Check-in/out Management System</p>
        </header>

        <div className="flex gap-4 mb-6 flex-wrap">
          {['dashboard', 'users', 'history', 'simulator'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab ? 'bg-black text-white' : 'bg-white text-black hover:text-secondary'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ---------------- TABS ---------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <p className="text-gray-600 text-sm">Currently In</p>
                <p className="text-3xl font-bold">{getCurrentlyCheckedIn().length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <p className="text-gray-600 text-sm">Today's Check-ins</p>
                <p className="text-3xl font-bold text-green-600">{getTodayCheckIns().length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-purple-600">{users.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold mb-4">📊 Daily Active Users</h2>
              <div className="flex gap-4 mb-4 flex-wrap">
                <div>
                  <label>From: </label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-2 py-1 rounded"/>
                </div>
                <div>
                  <label>To: </label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-2 py-1 rounded"/>
                </div>
              </div>
              <canvas ref={chartRef}></canvas>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold mb-4">📋 Monthly Usage Per User</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {users.map(user => {
                  const stats = getUserStatsMonth(user.id);
                  return (
                    <div key={user.id} className="border rounded-lg p-4 bg-gray-50">
                      <p className="font-semibold">{user.name}</p>
                      <p>Check-ins: {stats.checkIns}</p>
                      <p>Hours spent: {stats.hoursSpent}</p>
                      <p>Unique days: {stats.uniqueDays}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<CoworkingApp />, document.getElementById('root'));
