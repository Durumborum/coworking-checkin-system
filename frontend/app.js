const { useState, useEffect } = React;

// Base URL for API requests
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  function loadData() {
    Promise.all([
      fetch(`${API_BASE_URL}/api/users`).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/checkins`).then(res => res.json())
    ])
    .then(([usersData, checkInsData]) => {
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setError(null);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error loading data:', err);
      setError(err.message);
      setLoading(false);
    });
  }

  // Render loading
  if (loading) {
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' },
      React.createElement('p', null, 'Loading...')
    );
  }

  // Render error
  if (error) {
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' },
      React.createElement('p', null, 'Error: ' + error)
    );
  }

  // Dashboard: simple version without JSX
  return React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-4' }, 'Coworking Check-in System'),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('strong', null, 'Users loaded: '), users.length
    ),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('strong', null, 'Check-ins loaded: '), checkIns.length
    ),

    // Simple check-in list
    React.createElement('div', { className: 'mt-6' },
      React.createElement('h2', { className: 'text-xl font-semibold mb-2' }, 'Recent Check-ins'),
      checkIns.slice(0, 5).map(c =>
        React.createElement('div', { key: c.id, className: 'mb-1' },
          c.user_name + ' - ' + c.check_in + (c.check_out ? ' -> ' + c.check_out : ' (active)')
        )
      )
    )
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(CoworkingApp));
