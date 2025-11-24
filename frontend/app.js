// Import React hooks and ReactDOM root creator
const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

// Base URL for API calls, taken from index.html if set, else current origin
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  // ---------- STATE VARIABLES ----------
  const [users, setUsers] = useState([]); // List of registered users
  const [checkIns, setCheckIns] = useState([]); // List of check-in/out records
  const [activeTab, setActiveTab] = useState('dashboard'); // Currently active tab
  const [editingUser, setEditingUser] = useState(null); // User being edited
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '', included_hours: 0 }); // Form state for new user
  const [loading, setLoading] = useState(true); // Loading state for initial data fetch
  const [error, setError] = useState(null); // Error state if data fetch fails
  const [now, setNow] = useState(new Date()); // Current time for live timer

  // Chart & filter state
  const [dailyActiveData, setDailyActiveData] = useState([]); // Daily active users chart data
  const [activeRange, setActiveRange] = useState('30'); // Default date range for chart (30 days)
  const [historyUserFilter, setHistoryUserFilter] = useState(['all']); // Filter for history table
  const [historySortField, setHistorySortField] = useState('check_in'); // Sort field for history
  const [historySortAsc, setHistorySortAsc] = useState(false); // Sort order

  // ---------- EFFECTS ----------
  useEffect(() => {
    // Load initial data and refresh every 10 seconds
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Regenerate chart data whenever checkIns or activeRange changes
    generateDailyActiveUsersChart();
  }, [checkIns, activeRange]);

  useEffect(() => {
    // Update `now` every second to refresh timers
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------- DATA FETCHING ----------
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

  // ---------- HANDLERS ----------
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

  // ---------- DATA COMPUTATION ----------
  const getCurrentlyCheckedIn = () => checkIns.filter(c => !c.check_out);

  const getElapsedTime = (checkInTime) => {
    const diff = now - new Date(checkInTime);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
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
    } else if (activeRange === 'month_to_date') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else start = new Date(now.getTime() - 29*24*60*60*1000);
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

  // ---------- CONDITIONAL RENDERING ----------
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

  // ---------- MAIN RENDER ----------
  return (
    <div className="min-h-screen font-quattrocento text-black bg-white">
      <div className="container mx-auto p-6">
        {/* HEADER */}
        <header className="mb-6 flex items-center gap-4">
          <img src="rami_logo_new.avif" alt="Rami Ceramics Logo" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-3xl font-bold mb-1">Rami Ceramics Coworking</h1>
            <p className="text-secondary">Check-in/out Management</p>
          </div>
        </header>

        {/* TAB NAVIGATION */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {['dashboard','users','history','simulator'].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className={`px-4 py-2 rounded ${activeTab===tab?'bg-black text-white':'bg-white text-black hover:text-secondary hover:border-secondary border border-black'}`}>
              {tab.charAt(0).toUpperCase()+tab.slice(1)}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">

          {/* ---------- DASHBOARD TAB ---------- */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Currently Checked-in Users</h2>
              <table className="w-full border border-black mb-6">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-4 py-2">User</th>
                    <th className="border px-4 py-2">Check-in Time</th>
                    <th className="border px-4 py-2">Elapsed Time</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentlyCheckedIn().map(session => (
                    <tr key={session.id}>
                      <td className="border px-4 py-2">{session.user_name}</td>
                      <td className="border px-4 py-2">{new Date(session.check_in).toLocaleString()}</td>
                      <td className="border px-4 py-2">{getElapsedTime(session.check_in)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- USERS TAB ---------- */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Users Management</h2>

              {/* New User Form */}
              <div className="mb-4">
                <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name:e.target.value})} className="border p-2 mr-2"/>
                <input type="text" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} className="border p-2 mr-2"/>
                <input type="text" placeholder="Card ID" value={newUser.cardId} onChange={e => setNewUser({...newUser, cardId:e.target.value})} className="border p-2 mr-2"/>
                <input type="number" placeholder="Included Hours" value={newUser.included_hours} onChange={e => setNewUser({...newUser, included_hours:e.target.value})} className="border p-2 mr-2"/>
                <button onClick={addUser} className="bg-black text-white px-4 py-2 rounded">Add User</button>
              </div>

              {/* Users Table */}
              <table className="w-full border border-black">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-4 py-2">Name</th>
                    <th className="border px-4 py-2">Email</th>
                    <th className="border px-4 py-2">Card ID</th>
                    <th className="border px-4 py-2">Included Hours</th>
                    <th className="border px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="border px-4 py-2">{editingUser?.id===user.id?<input value={editingUser.name} onChange={e=>setEditingUser({...editingUser,name:e.target.value})} className="border p-1"/>:user.name}</td>
                      <td className="border px-4 py-2">{editingUser?.id===user.id?<input value={editingUser.email} onChange={e=>setEditingUser({...editingUser,email:e.target.value})} className="border p-1"/>:user.email}</td>
                      <td className="border px-4 py-2">{editingUser?.id===user.id?<input value={editingUser.card_id} onChange={e=>setEditingUser({...editingUser,card_id:e.target.value})} className="border p-1"/>:user.card_id}</td>
                      <td className="border px-4 py-2">{editingUser?.id===user.id?<input type="number" value={editingUser.included_hours} onChange={e=>setEditingUser({...editingUser,included_hours:e.target.value})} className="border p-1"/>:user.included_hours}</td>
                      <td className="border px-4 py-2">
                        {editingUser?.id===user.id ? (
                          <>
                            <button onClick={updateUser} className="bg-green-500 text-white px-2 py-1 mr-1 rounded">Save</button>
                            <button onClick={()=>setEditingUser(null)} className="bg-gray-400 text-white px-2 py-1 rounded">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={()=>setEditingUser(user)} className="bg-blue-500 text-white px-2 py-1 mr-1 rounded">Edit</button>
                            <button onClick={()=>deleteUser(user.id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- HISTORY TAB ---------- */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Check-in History</h2>
              <table className="w-full border border-black">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-4 py-2 cursor-pointer" onClick={()=>{setHistorySortField('user_name'); setHistorySortAsc(!historySortAsc)}}>User</th>
                    <th className="border px-4 py-2 cursor-pointer" onClick={()=>{setHistorySortField('check_in'); setHistorySortAsc(!historySortAsc)}}>Check-in</th>
                    <th className="border px-4 py-2 cursor-pointer" onClick={()=>{setHistorySortField('check_out'); setHistorySortAsc(!historySortAsc)}}>Check-out</th>
                    <th className="border px-4 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCheckIns.map(session => (
                    <tr key={session.id}>
                      <td className="border px-4 py-2">{session.user_name}</td>
                      <td className="border px-4 py-2">{new Date(session.check_in).toLocaleString()}</td>
                      <td className="border px-4 py-2">{session.check_out? new Date(session.check_out).toLocaleString(): '-'}</td>
                      <td className="border px-4 py-2">{session.duration || (session.check_out? getElapsedTime(session.check_in): getElapsedTime(session.check_in))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- SIMULATOR TAB ---------- */}
          {activeTab === 'simulator' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Simulator</h2>
              <p className="mb-2">Simulate check-in/out by selecting a user:</p>
              {users.map(user => (
                <div key={user.id} className="mb-2 flex items-center gap-2">
                  <span>{user.name}</span>
                  <button onClick={()=>handleCheckIn(user.card_id)} className="bg-black text-white px-3 py-1 rounded">Check-in/out</button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------- RENDER ROOT ----------
