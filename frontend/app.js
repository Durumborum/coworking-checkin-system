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

      if (!usersRes.ok || !checkInsRes.ok) throw new Error('API request failed');

      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(usersData);
      setCheckIns(checkInsData);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error(err);
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
      if (res.ok) {
        alert(result.message);
        loadData();
      } else alert(result.error || 'Error processing check-in');
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.cardId) return alert('Name and Card ID required');

    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUser.name, email: newUser.email, card_id: newUser.cardId })
      });
      if (res.ok) {
        setNewUser({ name: '', email: '', cardId: '' });
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

  const getCurrentlyCheckedIn = () => checkIns.filter(c => !c.check_out);
  const getTodayCheckIns = () => {
    const today = new Date().toDateString();
    return checkIns.filter(c => new Date(c.check_in).toDateString() === today);
  };
  const getUserStats = (userId) => {
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out);
    const totalMinutes = userCheckIns.reduce((acc, c) => acc + (new Date(c.check_out) - new Date(c.check_in)) / 60000, 0);
    return { totalVisits: userCheckIns.length, totalHours: Math.floor(totalMinutes / 60), averageHours: userCheckIns.length ? Math.floor(totalMinutes / 60 / userCheckIns.length) : 0 };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-indigo-600">Loading...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-2">⚠️ Error</h2>
        <p className="mb-4">{error}</p>
        <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg" onClick={() => { setError(null); setLoading(true); loadData(); }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <header className="mb-8">
        <img 
          src="rami_logo_new.avif" 
          alt="Coworking Studio Logo" 
          className="h-12 w-12 object-contain"
        />
        <div>
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">Rami Ceramics - Coworking Studio</h1>
          <p className="text-indigo-600">Check-in/out Management System</p>
        </div>
      </header>

      <div className="flex gap-4 mb-6 flex-wrap">
        {['dashboard','users','history','simulator'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg font-medium ${activeTab===tab ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardTab users={users} checkIns={checkIns} getCurrentlyCheckedIn={getCurrentlyCheckedIn} getTodayCheckIns={getTodayCheckIns} />}
      {activeTab === 'users' && <UsersTab users={users} newUser={newUser} setNewUser={setNewUser} editingUser={editingUser} setEditingUser={setEditingUser} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} getUserStats={getUserStats} />}
      {activeTab === 'history' && <HistoryTab checkIns={checkIns} />}
      {activeTab === 'simulator' && <SimulatorTab users={users} checkIns={checkIns} handleCheckIn={handleCheckIn} />}
    </div>
  );
}

/* ----- DashboardTab ----- */
const DashboardTab = ({ users, checkIns, getCurrentlyCheckedIn, getTodayCheckIns }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card title="Currently In" value={getCurrentlyCheckedIn().length} icon="👥" />
      <Card title="Today's Check-ins" value={getTodayCheckIns().length} icon="📈" />
      <Card title="Total Users" value={users.length} icon="👤" />
    </div>
    <CurrentCheckIns sessions={getCurrentlyCheckedIn()} />
  </div>
);

/* ----- UsersTab ----- */
const UsersTab = ({ users, newUser, setNewUser, editingUser, setEditingUser, addUser, updateUser, deleteUser, getUserStats }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">➕ Add New User</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        <input type="text" placeholder="NFC Card ID" value={newUser.cardId} onChange={e => setNewUser({ ...newUser, cardId: e.target.value })} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        <button onClick={addUser} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add User</button>
      </div>
    </div>

    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Registered Users</h2>
      <div className="space-y-3">
        {users.map(user => (
          <UserRow key={user.id} user={user} editingUser={editingUser} setEditingUser={setEditingUser} updateUser={updateUser} deleteUser={deleteUser} getUserStats={getUserStats} />
        ))}
        {users.length === 0 && <p className="text-gray-500 text-center py-4">No users registered yet. Add your first user above!</p>}
      </div>
    </div>
  </div>
);

/* ----- HistoryTab ----- */
const HistoryTab = ({ checkIns }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg">
    <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Check-in/out History</h2>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-gray-600 font-semibold">User</th>
            <th className="text-left py-3 px-4 text-gray-600 font-semibold">Check In</th>
            <th className="text-left py-3 px-4 text-gray-600 font-semibold">Check Out</th>
            <th className="text-left py-3 px-4 text-gray-600 font-semibold">Duration</th>
          </tr>
        </thead>
        <tbody>
          {checkIns.slice().reverse().map(session => (
            <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">{session.user_name}</td>
              <td className="py-3 px-4">{new Date(session.check_in).toLocaleString()}</td>
              <td className="py-3 px-4">{session.check_out ? new Date(session.check_out).toLocaleString() : <span className="text-green-600 font-semibold">Currently In ✅</span>}</td>
              <td className="py-3 px-4">{session.duration || '-'}</td>
            </tr>
          ))}
          {checkIns.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-gray-500">No check-in history yet</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ----- SimulatorTab ----- */
const SimulatorTab = ({ users, checkIns, handleCheckIn }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg">
    <h2 className="text-xl font-bold text-gray-800 mb-4">🎮 NFC Card Simulator</h2>
    <p className="text-gray-600 mb-6">Simulate NFC card taps for testing</p>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map(user => (
        <button key={user.id} onClick={() => handleCheckIn(user.card_id)} className="p-6 border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 text-left">
          <p className="font-semibold text-gray-800">👤 {user.name}</p>
          <p className="text-sm text-gray-600 mt-1">Card: {user.card_id}</p>
          <p className="text-xs text-indigo-600 mt-2">
            {checkIns.find(c => c.user_id === user.id && !c.check_out) ? '✅ Currently checked in' : '⭕ Not checked in'}
          </p>
        </button>
      ))}
      {users.length === 0 && <p className="text-gray-500 col-span-3 text-center py-4">Add users first to simulate check-ins</p>}
    </div>
  </div>
);

/* ----- Components ----- */
const Card = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg flex items-center justify-between">
    <div>
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-3xl font-bold text-indigo-600">{value}</p>
    </div>
    <div className="text-4xl">{icon}</div>
  </div>
);

const CurrentCheckIns = ({ sessions }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg">
    <h2 className="text-xl font-bold text-gray-800 mb-4">⏰ Currently Checked In</h2>
    {sessions.length === 0 ? <p className="text-gray-500">No one is currently checked in</p> :
      <div className="space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-800">{s.user_name}</p>
              <p className="text-sm text-gray-600">Checked in at {new Date(s.check_in).toLocaleTimeString()}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    }
  </div>
);

const UserRow = ({ user, editingUser, setEditingUser, updateUser, deleteUser, getUserStats }) => {
  const stats = getUserStats(user.id);
  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
      {editingUser?.id === user.id ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="px-3 py-2 border rounded-lg"/>
          <input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="px-3 py-2 border rounded-lg"/>
          <input type="text" value={editingUser.card_id} onChange={e => setEditingUser({ ...editingUser, card_id: e.target.value })} className="px-3 py-2 border rounded-lg"/>
          <div className="flex gap-2">
            <button onClick={updateUser} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">💾 Save</button>
            <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">✖</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">Card ID: {user.card_id}</p>
            <p className="text-xs text-indigo-600 mt-1">{stats.totalVisits} visits • {stats.totalHours}h total</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingUser(user)} className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
            <button onClick={() => deleteUser(user.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<CoworkingApp />);
