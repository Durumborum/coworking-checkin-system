const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

// Use backend URL from index.html or fall back to current origin
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart & date range state
  const [chartStart, setChartStart] = useState('');
  const [chartEnd, setChartEnd] = useState('');
  const [dailyActiveData, setDailyActiveData] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, checkInsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users`),
        fetch(`${API_BASE_URL}/api/checkins`)
      ]);
      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setLoading(false);
      generateDailyActiveUsersChart(checkInsData);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
      setError('Failed to load data.');
    }
  };

  const handleCheckIn = async (cardId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId })
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        loadData();
      } else {
        alert(result.error || 'Error processing check-in');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.cardId) {
      alert('Name and Card ID are required');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          card_id: newUser.cardId
        })
      });
      if (response.ok) {
        setNewUser({ name: '', email: '', cardId: '' });
        loadData();
      } else {
        const err = await response.json();
        alert(err.error || 'Error adding user');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const updateUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          card_id: editingUser.card_id
        })
      });
      if (response.ok) {
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
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, { method: 'DELETE' });
      if (response.ok) loadData();
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const getCurrentlyCheckedIn = () => checkIns.filter(c => !c.check_out);
  const getTodayCheckIns = () => {
    const today = new Date().toDateString();
    return checkIns.filter(c => new Date(c.check_in).toDateString() === today);
  };

  const getUserStats = (userId) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out && new Date(c.check_in) >= firstDay);
    const totalMinutes = userCheckIns.reduce((acc, c) => acc + (new Date(c.check_out) - new Date(c.check_in)) / 60000, 0);
    const uniqueDays = [...new Set(userCheckIns.map(c => new Date(c.check_in).toDateString()))].length;
    return {
      checkIns: userCheckIns.length,
      hours: Math.floor(totalMinutes / 60),
      uniqueDays
    };
  };

  const generateDailyActiveUsersChart = (checkInsData) => {
    const end = chartEnd ? new Date(chartEnd) : new Date();
    const start = chartStart ? new Date(chartStart) : new Date(end.getTime() - 29*24*60*60*1000);
    const dailyCounts = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyCounts[d.toISOString().slice(0,10)] = 0;
    }
    checkInsData.forEach(c => {
      const dateStr = new Date(c.check_in).toISOString().slice(0,10);
      if (dateStr in dailyCounts) dailyCounts[dateStr]++;
    });
    setDailyActiveData(Object.entries(dailyCounts));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-quattrocento text-black">
      <div>Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-quattrocento text-black">
      <div>{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen font-quattrocento text-black bg-white">
      <div className="container mx-auto p-6">
        <header className="mb-6 flex items-center gap-4">
          <img 
            src="rami_logo_new.avif" 
            alt="Rami Ceramics Logo" 
            className="h-12 w-auto object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold mb-1">Rami Ceramics Coworking</h1>
            <p className="text-secondary">Check-in/out Management</p>
          </div>
        </header>

        <div className="flex gap-4 mb-6 flex-wrap">
          {['dashboard','users','history','simulator'].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className={`px-4 py-2 rounded ${activeTab===tab?'bg-black text-white':'bg-white text-black hover:text-secondary hover:border-secondary border border-black'}`}>
              {tab.charAt(0).toUpperCase()+tab.slice(1)}
            </button>
          ))}
        </div>

        {/* --- DASHBOARD --- */}
        {activeTab==='dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded shadow">
              <p>Currently In</p>
              <p className="text-2xl font-bold">{getCurrentlyCheckedIn().length}</p>
            </div>
            <div className="p-4 border rounded shadow">
              <p>Today's Check-ins</p>
              <p className="text-2xl font-bold">{getTodayCheckIns().length}</p>
            </div>
            <div className="p-4 border rounded shadow">
              <p>Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        )}

        {/* --- USERS --- */}
        {activeTab==='users' && (
          <div className="space-y-6">
            <div className="p-4 border rounded shadow">
              <h2 className="font-bold mb-2">Add New User</h2>
              <div className="flex gap-2 flex-wrap">
                <input placeholder="Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})}
                  className="border px-2 py-1"/>
                <input placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}
                  className="border px-2 py-1"/>
                <input placeholder="Card ID" value={newUser.cardId} onChange={e=>setNewUser({...newUser,cardId:e.target.value})}
                  className="border px-2 py-1"/>
                <button onClick={addUser} className="bg-black text-white px-4 py-1 rounded">Add</button>
              </div>
            </div>
            <div className="p-4 border rounded shadow">
              <h2 className="font-bold mb-2">Registered Users</h2>
              {users.map(u=>(
                <div key={u.id} className="border-b py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm">{u.email}</p>
                    <p className="text-xs">Card: {u.card_id}</p>
                    <p className="text-xs text-secondary">
                      {(()=>{const stats=getUserStats(u.id); return `${stats.checkIns} check-ins • ${stats.hours}h • ${stats.uniqueDays} unique days`})()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={()=>setEditingUser(u)} className="text-secondary">✏️</button>
                    <button onClick={()=>deleteUser(u.id)} className="text-red-600">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List Users */}
<div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
  <h2 className="text-xl font-bold mb-4">📋 Registered Users</h2>
  <div className="space-y-3">
    {users.map(user => (
      <div key={user.id} className="p-4 border border-secondary rounded">
        {editingUser?.id === user.id ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              value={editingUser.name}
              onChange={e => setEditingUser({...editingUser, name: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="email"
              value={editingUser.email}
              onChange={e => setEditingUser({...editingUser, email: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="text"
              value={editingUser.card_id}
              onChange={e => setEditingUser({...editingUser, card_id: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="number"
              value={editingUser.included_hours}
              onChange={e => setEditingUser({...editingUser, included_hours: parseInt(e.target.value)||0})}
              className="px-3 py-2 border rounded"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: editingUser.name,
                        email: editingUser.email,
                        card_id: editingUser.card_id,
                        included_hours: editingUser.included_hours
                      })
                    });
                    if (!res.ok) {
                      const error = await res.json();
                      alert(error.error || 'Failed to save user');
                    } else {
                      setEditingUser(null);
                      loadData();
                    }
                  } catch (err) {
                    alert('Network error: ' + err.message);
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                💾 Save
              </button>
              <button
                onClick={()=>setEditingUser(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                ✖
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm">{user.email}</p>
              <p className="text-xs">Card ID: {user.card_id}</p>
              <p className="text-xs">Included Hours: {user.included_hours}h</p>
              {(() => {
                const stats = getUserStats(user.id);
                return <p className="text-xs text-secondary">{stats.totalVisits} visits • {stats.totalHours}h total</p>
              })()}
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setEditingUser(user)} className="px-4 py-2 text-blue-600 rounded">✏️</button>
              <button onClick={()=>deleteUser(user.id)} className="px-4 py-2 text-red-600 rounded">🗑️</button>
            </div>
          </div>
        )}
      </div>
    ))}
    {users.length===0 && <p className="text-center text-secondary py-4">No users registered yet.</p>}
  </div>
</div>

        {/* --- HISTORY --- */}
        {activeTab==='history' && (
          <div className="space-y-6">
            <div className="p-4 border rounded shadow">
              <h2 className="font-bold mb-2">Check-in/out History</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">User</th>
                      <th className="border px-2 py-1">Check In</th>
                      <th className="border px-2 py-1">Check Out</th>
                      <th className="border px-2 py-1">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkIns.slice().reverse().map(c=>(
                      <tr key={c.id}>
                        <td className="border px-2 py-1">{c.user_name}</td>
                        <td className="border px-2 py-1">{new Date(c.check_in).toLocaleString()}</td>
                        <td className="border px-2 py-1">{c.check_out?new Date(c.check_out).toLocaleString():'✅ In'}</td>
                        <td className="border px-2 py-1">{c.duration||'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border rounded shadow">
              <h2 className="font-bold mb-2">Daily Active Users (Last 30 Days)</h2>
              <div className="flex gap-2 mb-2">
                <input type="date" value={chartStart} onChange={e=>setChartStart(e.target.value)} className="border px-2 py-1"/>
                <input type="date" value={chartEnd} onChange={e=>setChartEnd(e.target.value)} className="border px-2 py-1"/>
                <button className="px-2 py-1 bg-black text-white rounded" onClick={()=>generateDailyActiveUsersChart(checkIns)}>Update</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Active Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyActiveData.map(([date,count])=>(
                      <tr key={date}>
                        <td className="border px-2 py-1">{date}</td>
                        <td className="border px-2 py-1">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- SIMULATOR --- */}
        {activeTab==='simulator' && (
          <div className="p-4 border rounded shadow">
            <h2 className="font-bold mb-2">NFC Simulator</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {users.map(u=>(
                <button key={u.id} onClick={()=>handleCheckIn(u.card_id)}
                  className="p-2 border rounded hover:bg-secondary transition-colors">
                  <p>{u.name}</p>
                  <p className="text-xs">Card: {u.card_id}</p>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// React 18 createRoot API
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<CoworkingApp />);
