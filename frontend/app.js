const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

// Use backend URL from index.html or fall back to current origin
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '', included_hours: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionDurations, setSessionDurations] = useState({});

  // Chart & date range state
  const [dailyActiveData, setDailyActiveData] = useState([]);
  const [activeRange, setActiveRange] = useState('30'); // default 30 days
  const [historyUserFilter, setHistoryUserFilter] = useState(['all']);
  const [historySortField, setHistorySortField] = useState('check_in');
  const [historySortAsc, setHistorySortAsc] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    generateDailyActiveUsersChart();
  }, [checkIns, activeRange]);

  // Update session durations every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateSessionDurations();
    }, 1000);
    return () => clearInterval(interval);
  }, [checkIns]);

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
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
      setError('Failed to load data.');
    }
  };

  const updateSessionDurations = () => {
    const durations = {};
    const now = new Date();
    checkIns.forEach(c => {
      if (!c.check_out) {
        const checkInTime = new Date(c.check_in);
        const diff = now - checkInTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        durations[c.id] = `${hours}h ${minutes}m ${seconds}s`;
      }
    });
    setSessionDurations(durations);
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

  const manualCheckout = async (sessionId, cardId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          card_id: cardId,
          timestamp: new Date().toISOString()
        })
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        loadData();
      } else {
        alert(result.error || 'Error processing checkout');
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
          card_id: newUser.cardId,
          included_hours: parseInt(newUser.included_hours) || 0
        })
      });
      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Failed to add user');
      } else {
        setNewUser({ name: '', email: '', cardId: '', included_hours: 0 });
        loadData();
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
          card_id: editingUser.card_id,
          included_hours: parseInt(editingUser.included_hours) || 0
        })
      });
      if (response.ok) {
        setEditingUser(null);
        loadData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to update user');
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

  const deleteCheckIn = async (checkInId) => {
    if (!confirm('Are you sure you want to delete this check-in record?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkins/${checkInId}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Check-in record deleted');
        loadData();
      } else {
        alert('Failed to delete check-in record');
      }
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

  const generateDailyActiveUsersChart = () => {
    const now = new Date();
    let start;
    if (activeRange === '7') start = new Date(now.getTime() - 6*24*60*60*1000);
    else if (activeRange === 'prev_month') {
      start = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setDailyActiveData(getDailyCounts(checkIns, start, end));
      return;
    } else if (activeRange === 'month_to_date') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else start = new Date(now.getTime() - 29*24*60*60*1000);

    const end = new Date(now);
    setDailyActiveData(getDailyCounts(checkIns, start, end));
  };

  const getDailyCounts = (data, start, end) => {
    const dailyCounts = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyCounts[d.toISOString().slice(0,10)] = 0;
    }
    data.forEach(c => {
      const dateStr = new Date(c.check_in).toISOString().slice(0,10);
      if (dateStr in dailyCounts) dailyCounts[dateStr]++;
    });
    return Object.entries(dailyCounts);
  };

  const sortedCheckIns = [...checkIns]
    .filter(c => historyUserFilter.includes('all') || historyUserFilter.includes(c.user_id))
    .sort((a,b) => {
      if (historySortAsc) return new Date(a[historySortField]) - new Date(b[historySortField]);
      return new Date(b[historySortField]) - new Date(a[historySortField]);
    });

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
          <img src="rami_logo_new.avif" alt="Rami Ceramics Logo" className="h-12 w-auto object-contain" />
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

        {/* DASHBOARD */}
        {activeTab==='dashboard' && (
          <div className="space-y-6">
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

            {/* Active Sessions Table */}
            <div className="p-4 border rounded shadow overflow-x-auto">
              <h2 className="font-bold mb-4">Currently Checked In</h2>
              {getCurrentlyCheckedIn().length === 0 ? (
                <p className="text-secondary">No users currently checked in</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Name</th>
                      <th className="border px-2 py-1">Check-in Time</th>
                      <th className="border px-2 py-1">Duration</th>
                      <th className="border px-2 py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentlyCheckedIn().map(session => {
                      const user = users.find(u => u.id === session.user_id);
                      return (
                        <tr key={session.id}>
                          <td className="border px-2 py-1">{session.user_name}</td>
                          <td className="border px-2 py-1">{new Date(session.check_in).toLocaleString()}</td>
                          <td className="border px-2 py-1 font-mono">{sessionDurations[session.id] || '0h 0m 0s'}</td>
                          <td className="border px-2 py-1">
                            <button 
                              onClick={() => manualCheckout(session.id, user.card_id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Check Out
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab==='users' && (
          <div className="space-y-6">
            <div className="p-4 border rounded shadow">
              <h2 className="font-bold mb-2">Add New User</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs font-semibold">Name</label>
                  <input placeholder="Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} className="border px-2 py-1 w-full"/>
                </div>
                <div>
                  <label className="text-xs font-semibold">Email</label>
                  <input placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} className="border px-2 py-1 w-full"/>
                </div>
                <div>
                  <label className="text-xs font-semibold">Card ID</label>
                  <input placeholder="Card ID" value={newUser.cardId} onChange={e=>setNewUser({...newUser,cardId:e.target.value})} className="border px-2 py-1 w-full"/>
                </div>
                <div>
                  <label className="text-xs font-semibold">Included Hours</label>
                  <input type="number" placeholder="Hours" value={newUser.included_hours} onChange={e=>setNewUser({...newUser,included_hours:e.target.value})} className="border px-2 py-1 w-full"/>
                </div>
              </div>
              <button onClick={addUser} className="mt-2 bg-black text-white px-4 py-1 rounded">Add</button>
            </div>

            <div className="p-4 border rounded shadow overflow-x-auto">
              <h2 className="font-bold mb-2">Registered Users</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Name</th>
                    <th className="border px-2 py-1">Email</th>
                    <th className="border px-2 py-1">Card ID</th>
                    <th className="border px-2 py-1">Included Hours</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      {editingUser?.id === user.id ? (
                        <>
                          <td className="border px-2 py-1">
                            <input value={editingUser.name} onChange={e=>setEditingUser({...editingUser,name:e.target.value})} className="border px-2 py-1 w-full"/>
                          </td>
                          <td className="border px-2 py-1">
                            <input value={editingUser.email} onChange={e=>setEditingUser({...editingUser,email:e.target.value})} className="border px-2 py-1 w-full"/>
                          </td>
                          <td className="border px-2 py-1">
                            <input value={editingUser.card_id} onChange={e=>setEditingUser({...editingUser,card_id:e.target.value})} className="border px-2 py-1 w-full"/>
                          </td>
                          <td className="border px-2 py-1">
                            <input type="number" value={editingUser.included_hours} onChange={e=>setEditingUser({...editingUser,included_hours:e.target.value})} className="border px-2 py-1 w-full"/>
                          </td>
                          <td className="border px-2 py-1 flex gap-2">
                            <button onClick={updateUser} className="px-2 py-1 bg-green-600 text-white rounded">💾 Save</button>
                            <button onClick={()=>setEditingUser(null)} className="px-2 py-1 bg-gray-500 text-white rounded">✖</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="border px-2 py-1">{user.name}</td>
                          <td className="border px-2 py-1">{user.email}</td>
                          <td className="border px-2 py-1">{user.card_id}</td>
                          <td className="border px-2 py-1">{user.included_hours}</td>
                          <td className="border px-2 py-1 flex gap-2">
                            <button onClick={()=>setEditingUser(user)} className="px-2 py-1 bg-blue-600 text-white rounded">✏️</button>
                            <button onClick={()=>deleteUser(user.id)} className="px-2 py-1 bg-red-600 text-white rounded">🗑️</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {users.length===0 && <tr><td colSpan={5} className="text-center py-2 text-secondary">No users registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab==='history' && (
          <div className="space-y-6">

            {/* User Filter */}
            <div className="p-4 border rounded shadow">
              <label className="font-semibold mb-1 block">Filter by User</label>
              <select multiple value={historyUserFilter} onChange={e=>{
                const selected = Array.from(e.target.selectedOptions, o=>o.value);
                if (selected.includes('all')) setHistoryUserFilter(['all']);
                else setHistoryUserFilter(selected.length?selected:['all']);
              }} className="border px-2 py-1 rounded w-full">
                <option value="all">All Users</option>
                {users.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <p className="text-xs text-secondary mt-1">Hold Ctrl/Cmd to select multiple users</p>
            </div>

            {/* Check-in/out History Table */}
            <div className="p-4 border rounded shadow overflow-x-auto">
              <h2 className="font-bold mb-2">Check-in/out History</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['user_name','check_in','check_out','duration'].map(field => (
                      <th key={field} className="border px-2 py-1 cursor-pointer"
                        onClick={()=> {
                          if(historySortField===field) setHistorySortAsc(!historySortAsc);
                          else { setHistorySortField(field); setHistorySortAsc(true); }
                        }}
                      >
                        {field.replace('_',' ').toUpperCase()} {historySortField===field?(historySortAsc?'▲':'▼'):""}
                      </th>
                    ))}
                    <th className="border px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCheckIns.slice().reverse().map(c=>(
                    <tr key={c.id}>
                      <td className="border px-2 py-1">{c.user_name}</td>
                      <td className="border px-2 py-1">{new Date(c.check_in).toLocaleString()}</td>
                      <td className="border px-2 py-1">{c.check_out?new Date(c.check_out).toLocaleString():'✅ In'}</td>
                      <td className="border px-2 py-1">{c.duration||'-'}</td>
                      <td className="border px-2 py-1">
                        <button onClick={() => deleteCheckIn(c.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">🗑️ Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Daily Active Users Table */}
            <div className="p-4 border rounded shadow overflow-x-auto">
              <h2 className="font-bold mb-2">Daily Active Users</h2>
              <div className="flex gap-2 mb-2">
                <button className={`px-2 py-1 border rounded ${activeRange==='7'?'bg-black text-white':''}`} onClick={()=>setActiveRange('7')}>Last 7 Days</button>
                <button className={`px-2 py-1 border rounded ${activeRange==='prev_month'?'bg-black text-white':''}`} onClick={()=>setActiveRange('prev_month')}>Previous Month</button>
                <button className={`px-2 py-1 border rounded ${activeRange==='month_to_date'?'bg-black text-white':''}`} onClick={()=>setActiveRange('month_to_date')}>This Month-to-Date</button>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 cursor-pointer">Date</th>
                    <th className="border px-2 py-1 cursor-pointer">Active Users</th>
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
        )}

        {/* SIMULATOR */}
        {activeTab==='simulator' && (
          <div className="p-4 border rounded shadow">
            <h2 className="font-bold mb-2">NFC Simulator</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {users.map(u=>(<button key={u.id} onClick={()=>handleCheckIn(u.card_id)}
                className="p-2 border rounded hover:bg-secondary transition-colors">
                  <p>{u.name}</p>
                  <p className="text-xs">Card: {u.card_id}</p>
                </button>))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<CoworkingApp />);