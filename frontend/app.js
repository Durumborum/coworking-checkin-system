const { useState, useEffect } = React;
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '', included_hours: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      if (!usersRes.ok || !checkInsRes.ok) throw new Error('API request failed');

      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

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
    if (!newUser.name || !newUser.cardId) {
      alert('Name and Card ID are required');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          card_id: newUser.cardId,
          included_hours: newUser.included_hours
        })
      });
      if (res.ok) {
        setNewUser({ name: '', email: '', cardId: '', included_hours: 0 });
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error adding user');
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
          card_id: editingUser.card_id,
          included_hours: editingUser.included_hours
        })
      });
      if (res.ok) {
        setEditingUser(null);
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error updating user');
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

  const getCurrentlyCheckedIn = () => checkIns.filter(c => !c.check_out);
  const getTodayCheckIns = () => {
    const today = new Date().toDateString();
    return checkIns.filter(c => new Date(c.check_in).toDateString() === today);
  };
  const getUserStats = (userId) => {
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out);
    const totalMinutes = userCheckIns.reduce((acc, c) => acc + (new Date(c.check_out) - new Date(c.check_in)) / 60000, 0);
    return {
      totalVisits: userCheckIns.length,
      totalHours: Math.floor(totalMinutes / 60),
      averageHours: userCheckIns.length ? Math.floor(totalMinutes / 60 / userCheckIns.length) : 0
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center font-quattrocento">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto"></div>
        <p className="mt-4 text-secondary">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-quattrocento">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center gap-4">
          <img src="rami_logo_new.avif" alt="Logo" className="h-12 w-12"/>
          <div>
            <h1 className="text-3xl font-bold">Rami Ceramics Studio</h1>
            <p className="text-secondary">Check-in/out Management System</p>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {['dashboard','users','history','simulator'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab ? 'bg-black text-white' : 'bg-white text-black border border-secondary hover:bg-secondary hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
              <p className="text-secondary text-sm">Currently In</p>
              <p className="text-3xl font-bold">{getCurrentlyCheckedIn().length}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
              <p className="text-secondary text-sm">Today's Check-ins</p>
              <p className="text-3xl font-bold">{getTodayCheckIns().length}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
              <p className="text-secondary text-sm">Total Users</p>
              <p className="text-3xl font-bold">{users.length}</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Add User */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
              <h2 className="text-xl font-bold mb-4">➕ Add New User</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="px-3 py-2 border rounded"/>
                <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="px-3 py-2 border rounded"/>
                <input type="text" placeholder="Card ID" value={newUser.cardId} onChange={e => setNewUser({...newUser, cardId: e.target.value})} className="px-3 py-2 border rounded"/>
                <input type="number" placeholder="Included Hours" value={newUser.included_hours} onChange={e => setNewUser({...newUser, included_hours: parseInt(e.target.value)||0})} className="px-3 py-2 border rounded"/>
                <button onClick={addUser} className="px-4 py-2 bg-black text-white rounded hover:bg-secondary">Add</button>
              </div>
            </div>

            {/* List Users */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
              <h2 className="text-xl font-bold mb-4">📋 Registered Users</h2>
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="p-4 border border-secondary rounded hover:bg-secondary hover:text-white transition-colors">
                    {editingUser?.id === user.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser,name:e.target.value})} className="px-3 py-2 border rounded"/>
                        <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser,email:e.target.value})} className="px-3 py-2 border rounded"/>
                        <input type="text" value={editingUser.card_id} onChange={e => setEditingUser({...editingUser,card_id:e.target.value})} className="px-3 py-2 border rounded"/>
                        <input type="number" value={editingUser.included_hours} onChange={e => setEditingUser({...editingUser,included_hours:parseInt(e.target.value)||0})} className="px-3 py-2 border rounded"/>
                        <div className="flex gap-2">
                          <button onClick={updateUser} className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">💾 Save</button>
                          <button onClick={()=>setEditingUser(null)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">✖</button>
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
                          <button onClick={()=>setEditingUser(user)} className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                          <button onClick={()=>deleteUser(user.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {users.length===0 && <p className="text-center text-secondary py-4">No users registered yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
            <h2 className="text-xl font-bold mb-4">📊 Check-in/out History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-secondary">
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Check In</th>
                    <th className="py-2 px-3">Check Out</th>
                    <th className="py-2 px-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {checkIns.slice().reverse().map(c=>(
                    <tr key={c.id} className="border-b border-secondary hover:bg-secondary hover:text-white">
                      <td className="py-2 px-3">{c.user_name}</td>
                      <td className="py-2 px-3">{new Date(c.check_in).toLocaleString()}</td>
                      <td className="py-2 px-3">{c.check_out? new Date(c.check_out).toLocaleString() : 'Currently In ✅'}</td>
                      <td className="py-2 px-3">{c.duration||'-'}</td>
                    </tr>
                  ))}
                  {checkIns.length===0 && <tr><td colSpan="4" className="text-center py-4 text-secondary">No history yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Simulator Tab */}
        {activeTab==='simulator' && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-secondary">
            <h2 className="text-xl font-bold mb-4">🎮 NFC Card Simulator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(u=>(
                <button key={u.id} onClick={()=>handleCheckIn(u.card_id)} className="p-4 border border-secondary rounded hover:bg-secondary hover:text-white text-left">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-secondary">Card: {u.card_id}</p>
                  <p className="text-xs text-secondary">
                    {checkIns.find(c=>c.user_id===u.id && !c.check_out)? '✅ Checked in':'⭕ Not in'}
                  </p>
                </button>
              ))}
              {users.length===0 && <p className="col-span-3 text-center py-4 text-secondary">Add users to simulate check-ins</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// React 18 createRoot
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CoworkingApp />);
