const { useState, useEffect } = React;

const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '' });
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

      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
      setLoading(false);
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
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out);
    const totalMinutes = userCheckIns.reduce((acc, c) => acc + (new Date(c.check_out) - new Date(c.check_in)) / 60000, 0);
    return {
      totalVisits: userCheckIns.length,
      totalHours: Math.floor(totalMinutes / 60),
      averageHours: userCheckIns.length ? Math.floor(totalMinutes / 60 / userCheckIns.length) : 0
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-primary text-secondary flex items-center justify-center font-quattrocento">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto"></div>
        <p className="mt-4">Loading...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-primary text-secondary flex items-center justify-center font-quattrocento">
      <div className="text-center bg-black p-8 rounded-xl border border-secondary">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="mb-4">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); loadData(); }}
          className="px-6 py-2 border border-secondary rounded-lg hover:bg-secondary hover:text-primary transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-primary text-secondary font-quattrocento">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <img src="rami_logo_new.avif" alt="Rami Ceramics Logo" className="h-12 mb-2"/>
          <h1 className="text-4xl font-bold mb-2">Coworking Studio</h1>
          <p>Check-in/out Management System</p>
        </header>

        <div className="flex gap-4 mb-6 flex-wrap">
          {['dashboard', 'users', 'history', 'simulator'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-secondary text-primary'
                  : 'bg-black border border-secondary text-secondary hover:bg-secondary hover:text-primary'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tabs content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
                <p className="text-sm">Currently In</p>
                <p className="text-3xl font-bold">{getCurrentlyCheckedIn().length}</p>
              </div>
              <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
                <p className="text-sm">Today's Check-ins</p>
                <p className="text-3xl font-bold">{getTodayCheckIns().length}</p>
              </div>
              <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
                <p className="text-sm">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
            </div>
            <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
              <h2 className="text-xl font-bold mb-4">Currently Checked In</h2>
              {getCurrentlyCheckedIn().length === 0 ? (
                <p>No one is currently checked in</p>
              ) : (
                <div className="space-y-3">
                  {getCurrentlyCheckedIn().map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-secondary bg-opacity-10 rounded-lg">
                      <div>
                        <p className="font-semibold">{session.user_name}</p>
                        <p className="text-sm">Checked in at {new Date(session.check_in).toLocaleTimeString()}</p>
                      </div>
                      <div className="w-3 h-3 bg-secondary rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Add new user */}
            <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add New User</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="px-4 py-2 border border-secondary rounded-lg bg-black text-secondary focus:outline-none focus:ring-2 focus:ring-secondary"/>
                <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="px-4 py-2 border border-secondary rounded-lg bg-black text-secondary focus:outline-none focus:ring-2 focus:ring-secondary"/>
                <input type="text" placeholder="Card ID" value={newUser.cardId} onChange={e => setNewUser({...newUser, cardId: e.target.value})}
                  className="px-4 py-2 border border-secondary rounded-lg bg-black text-secondary focus:outline-none focus:ring-2 focus:ring-secondary"/>
                <button onClick={addUser} className="px-6 py-2 bg-secondary text-primary rounded-lg hover:bg-secondary/80 transition-colors">Add</button>
              </div>
            </div>

            {/* List users */}
            <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
              <h2 className="text-xl font-bold mb-4">Registered Users</h2>
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="p-4 border border-secondary rounded-lg flex justify-between items-center hover:bg-secondary/10 transition-colors">
                    {editingUser?.id === user.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                        <input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                          className="px-3 py-2 border border-secondary rounded-lg bg-black text-secondary"/>
                        <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                          className="px-3 py-2 border border-secondary rounded-lg bg-black text-secondary"/>
                        <input type="text" value={editingUser.card_id} onChange={e => setEditingUser({...editingUser, card_id: e.target.value})}
                          className="px-3 py-2 border border-secondary rounded-lg bg-black text-secondary"/>
                        <div className="flex gap-2">
                          <button onClick={updateUser} className="flex-1 px-4 py-2 bg-secondary text-primary rounded-lg hover:bg-secondary/80">Save</button>
                          <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-secondary/50 text-primary rounded-lg hover:bg-secondary/70">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between w-full">
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-sm">{user.email}</p>
                          <p className="text-xs mt-1">Card: {user.card_id}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingUser(user)} className="px-4 py-2 text-secondary/80 hover:bg-secondary/20 rounded-lg">✏️</button>
                          <button onClick={() => deleteUser(user.id)} className="px-4 py-2 text-red-600 hover:bg-red-700 rounded-lg">🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {users.length === 0 && <p className="text-secondary text-center py-4">No users yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Check-in/out History</h2>
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-secondary">
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Check In</th>
                  <th className="text-left py-3 px-4">Check Out</th>
                  <th className="text-left py-3 px-4">Duration</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.slice().reverse().map(session => (
                  <tr key={session.id} className="border-b border-secondary hover:bg-secondary/10">
                    <td className="py-3 px-4">{session.user_name}</td>
                    <td className="py-3 px-4">{new Date(session.check_in).toLocaleString()}</td>
                    <td className="py-3 px-4">{session.check_out ? new Date(session.check_out).toLocaleString() : <span className="text-green-500 font-semibold">Currently In</span>}</td>
                    <td className="py-3 px-4">{session.duration || '-'}</td>
                  </tr>
                ))}
                {checkIns.length === 0 && <tr><td colSpan="4" className="text-center py-4">No history</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Simulator Tab */}
        {activeTab === 'simulator' && (
          <div className="bg-black rounded-xl p-6 border border-secondary shadow-lg">
            <h2 className="text-xl font-bold mb-4">NFC Card Simulator</h2>
            <p className="text-secondary mb-6">Simulate card taps for testing</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(user => (
                <button key={user.id} onClick={() => handleCheckIn(user.card_id)}
                  className="p-6 border-2 border-secondary rounded-lg hover:bg-secondary/10 text-left">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm mt-1">Card: {user.card_id}</p>
                  <p className="text-xs mt-2">
                    {checkIns.find(c => c.user_id === user.id && !c.check_out) ? '✅ Checked in' : '⭕ Not checked in'}
                  </p>
                </button>
              ))}
              {users.length === 0 && <p className="col-span-3 text-center py-4">Add users first</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM.render(<CoworkingApp />, document.getElementById('root'));
