const { useState, useEffect } = React;

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

      if (!usersRes.ok || !checkInsRes.ok) {
        throw new Error('API request failed');
      }

      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
      setUsers([]);
      setCheckIns([]);
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
    } catch (error) {
      alert('Network error: ' + error.message);
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
        const error = await response.json();
        alert(error.error || 'Error adding user');
      }
    } catch (error) {
      alert('Network error: ' + error.message);
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
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  };

  const getCurrentlyCheckedIn = () => {
    return checkIns.filter(c => !c.check_out);
  };

  const getTodayCheckIns = () => {
    const today = new Date().toDateString();
    return checkIns.filter(c => new Date(c.check_in).toDateString() === today);
  };

  const getUserStats = (userId) => {
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out);
    const totalMinutes = userCheckIns.reduce((acc, c) => {
      const diff = new Date(c.check_out) - new Date(c.check_in);
      return acc + diff / 60000;
    }, 0);

    return {
      totalVisits: userCheckIns.length,
      totalHours: Math.floor(totalMinutes / 60),
      averageHours: userCheckIns.length ? Math.floor(totalMinutes / 60 / userCheckIns.length) : 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-indigo-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); loadData(); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Rest of your JSX unchanged */}
      {/* ... dashboard, users, history, simulator tabs ... */}
    </div>
  );
}

ReactDOM.render(<CoworkingApp />, document.getElementById('root'));
