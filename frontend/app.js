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
        <h1 className="text-4xl font-bold text-indigo-900 mb-2">🏢 Coworking Studio</h1>
        <p className="text-indigo-600">Check-in/out Management System</p>
      </header>

      <div className="flex gap-4 mb-6 flex-wrap">
        {['dashboard','users','history','simulator'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg font-medium ${activeTab===tab ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Currently In" value={getCurrentlyCheckedIn().length} icon="👥" />
            <Card title="Today's Check-ins" value={getTodayCheckIns().length} icon="📈" />
            <Card title="Total Users" value={users.length} icon="👤" />
          </div>
          <CurrentCheckIns sessions={getCurrentlyCheckedIn()} />
        </div>
      )}

      {activeTab === 'users' && <UsersTab users={users} newUser={newUser} setNewUser={setNewUser} editingUser={editingUser} setEditingUser={setEditingUser} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} getUserStats={getUserStats} />}

      {activeTab === 'history' && <HistoryTab checkIns={checkIns} />}

      {activeTab === 'simulator' && <SimulatorTab users={users} checkIns={checkIns} handleCheckIn={handleCheckIn} />}
    </div>
  );
}

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

/* UsersTab, HistoryTab, SimulatorTab components can be implemented in the same style */

ReactDOM.createRoot(document.getElementById('root')).render(<CoworkingApp />);
