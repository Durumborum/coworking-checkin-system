const { useState, useEffect } = React;

const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '' });
  const [simCardId, setSimCardId] = useState('');

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

  function addUser() {
    if (!newUser.name || !newUser.cardId) {
      alert('Name and Card ID required');
      return;
    }

    fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUser.name,
        email: newUser.email,
        card_id: newUser.cardId
      })
    })
    .then(res => res.json())
    .then(res => {
      if (res.error) alert(res.error);
      else {
        setNewUser({ name: '', email: '', cardId: '' });
        loadData();
      }
    });
  }

  function updateUser() {
    if (!editingUser) return;
    fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingUser.name,
        email: editingUser.email,
        card_id: editingUser.card_id
      })
    })
    .then(res => res.json())
    .then(() => {
      setEditingUser(null);
      loadData();
    });
  }

  function deleteUser(id) {
    if (!confirm('Are you sure?')) return;
    fetch(`${API_BASE_URL}/api/users/${id}`, { method: 'DELETE' })
      .then(() => loadData());
  }

  function handleCheckIn(cardId) {
    fetch(`${API_BASE_URL}/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cardId })
    })
    .then(res => res.json())
    .then(res => {
      alert(res.message || res.error);
      loadData();
    });
  }

  if (loading) return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' }, 'Loading...');
  if (error) return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' }, 'Error: ' + error);

  // Tabs
  const tabs = ['dashboard', 'users', 'history', 'simulator'];

  function renderTabContent() {
    switch(activeTab) {
      case 'dashboard':
        const activeCheckIns = checkIns.filter(c => !c.check_out).length;
        return React.createElement('div', null,
          React.createElement('h2', { className: 'text-xl font-bold mb-2' }, 'Dashboard'),
          React.createElement('p', null, 'Total users: ' + users.length),
          React.createElement('p', null, 'Currently checked in: ' + activeCheckIns)
        );

      case 'users':
        return React.createElement('div', null,
          React.createElement('h2', { className: 'text-xl font-bold mb-2' }, 'Users'),
          React.createElement('div', { className: 'mb-2' },
            React.createElement('input', {
              placeholder: 'Name',
              value: newUser.name,
              onChange: e => setNewUser(Object.assign({}, newUser, { name: e.target.value })),
              className: 'border p-1 mr-1'
            }),
            React.createElement('input', {
              placeholder: 'Email',
              value: newUser.email,
              onChange: e => setNewUser(Object.assign({}, newUser, { email: e.target.value })),
              className: 'border p-1 mr-1'
            }),
            React.createElement('input', {
              placeholder: 'Card ID',
              value: newUser.cardId,
              onChange: e => setNewUser(Object.assign({}, newUser, { cardId: e.target.value })),
              className: 'border p-1 mr-1'
            }),
            React.createElement('button', { onClick: addUser, className: 'bg-blue-500 text-white px-2 py-1' }, 'Add User')
          ),
          React.createElement('div', null,
            users.map(u => React.createElement('div', { key: u.id, className: 'mb-1 flex items-center' },
              editingUser && editingUser.id === u.id ? React.createElement('span', null,
                React.createElement('input', {
                  value: editingUser.name,
                  onChange: e => setEditingUser(Object.assign({}, editingUser, { name: e.target.value })),
                  className: 'border p-1 mr-1'
                }),
                React.createElement('input', {
                  value: editingUser.email,
                  onChange: e => setEditingUser(Object.assign({}, editingUser, { email: e.target.value })),
                  className: 'border p-1 mr-1'
                }),
                React.createElement('input', {
                  value: editingUser.card_id,
                  onChange: e => setEditingUser(Object.assign({}, editingUser, { card_id: e.target.value })),
                  className: 'border p-1 mr-1'
                }),
                React.createElement('button', { onClick: updateUser, className: 'bg-green-500 text-white px-2 py-1 mr-1' }, 'Save'),
                React.createElement('button', { onClick: () => setEditingUser(null), className: 'bg-gray-500 text-white px-2 py-1' }, 'Cancel')
              ) : React.createElement('span', null,
                u.name + ' (' + u.card_id + ') ',
                React.createElement('button', { onClick: () => setEditingUser(u), className: 'bg-yellow-500 text-white px-2 py-1 mr-1' }, 'Edit'),
                React.createElement('button', { onClick: () => deleteUser(u.id), className: 'bg-red-500 text-white px-2 py-1' }, 'Delete')
              )
            ))
          )
        );

      case 'history':
        return React.createElement('div', null,
          React.createElement('h2', { className: 'text-xl font-bold mb-2' }, 'Recent Check-ins'),
          checkIns.slice(0, 10).map(c =>
            React.createElement('div', { key: c.id, className: 'mb-1' },
              c.user_name + ' - ' + c.check_in + (c.check_out ? ' -> ' + c.check_out : ' (active)')
            )
          )
        );

      case 'simulator':
        return React.createElement('div', null,
          React.createElement('h2', { className: 'text-xl font-bold mb-2' }, 'Simulator'),
          React.createElement('input', {
            placeholder: 'Card ID',
            value: simCardId,
            onChange: e => setSimCardId(e.target.value),
            className: 'border p-1 mr-1'
          }),
          React.createElement('button', { onClick: () => handleCheckIn(simCardId), className: 'bg-blue-500 text-white px-2 py-1' }, 'Check-in/Check-out')
        );

      default:
        return React.createElement('div', null, 'Unknown tab');
    }
  }

  return React.createElement('div', { className: 'p-4' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-4' }, 'Coworking Check-in System'),

    // Tabs
    React.createElement('div', { className: 'flex mb-4' },
      tabs.map(tab =>
        React.createElement('button', {
          key: tab,
          onClick: () => setActiveTab(tab),
          className: 'mr-2 px-3 py-1 border rounded ' + (activeTab === tab ? 'bg-blue-500 text-white' : '')
        }, tab.charAt(0).toUpperCase() + tab.slice(1))
      )
    ),

    // Tab content
    renderTabContent()
  );
}

// Mount app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(CoworkingApp));
