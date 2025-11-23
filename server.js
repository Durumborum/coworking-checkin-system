cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new Database('coworking.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    card_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT,
    duration TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('✓ Database initialized');

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check-in/out endpoint (for Raspberry Pi)
app.post('/api/checkin', (req, res) => {
  const { card_id, timestamp } = req.body;

  if (!card_id) {
    return res.status(400).json({ error: 'Card ID required' });
  }

  // Find user by card ID
  const user = db.prepare('SELECT * FROM users WHERE card_id = ?').get(card_id);

  if (!user) {
    return res.status(404).json({ error: 'Card not registered' });
  }

  // Check if user has an active session
  const activeSession = db.prepare(
    'SELECT * FROM checkins WHERE user_id = ? AND check_out IS NULL'
  ).get(user.id);

  if (activeSession) {
    // Check out
    const checkOutTime = timestamp || new Date().toISOString();
    const checkInTime = new Date(activeSession.check_in);
    const checkOutDate = new Date(checkOutTime);
    const diff = checkOutDate - checkInTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const duration = `${hours}h ${minutes}m`;

    db.prepare('UPDATE checkins SET check_out = ?, duration = ? WHERE id = ?')
      .run(checkOutTime, duration, activeSession.id);

    console.log(`✓ ${user.name} checked out (${duration})`);

    res.json({
      message: `${user.name} checked out`,
      action: 'checkout',
      user: user.name,
      duration
    });
  } else {
    // Check in
    const checkInId = Date.now().toString();
    const checkInTime = timestamp || new Date().toISOString();

    db.prepare('INSERT INTO checkins (id, user_id, user_name, check_in) VALUES (?, ?, ?, ?)')
      .run(checkInId, user.id, user.name, checkInTime);

    console.log(`✓ ${user.name} checked in`);

    res.json({
      message: `${user.name} checked in`,
      action: 'checkin',
      user: user.name
    });
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Create user
app.post('/api/users', (req, res) => {
  const { name, email, card_id } = req.body;

  if (!name || !card_id) {
    return res.status(400).json({ error: 'Name and card_id required' });
  }

  const id = Date.now().toString();
  const created_at = new Date().toISOString();

  try {
    db.prepare('INSERT INTO users (id, name, email, card_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, email || '', card_id, created_at);

    console.log(`✓ New user created: ${name}`);

    res.json({ id, name, email, card_id, created_at });
  } catch (error) {
    res.status(400).json({ error: 'Card ID already exists' });
  }
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const { name, email, card_id } = req.body;

  try {
    db.prepare('UPDATE users SET name = ?, email = ?, card_id = ? WHERE id = ?')
      .run(name, email || '', card_id, req.params.id);

    console.log(`✓ User updated: ${name}`);

    res.json({ id: req.params.id, name, email, card_id });
  } catch (error) {
    res.status(400).json({ error: 'Card ID already exists or user not found' });
  }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  console.log(`✓ User deleted: ${req.params.id}`);
  res.json({ success: true });
});

// Get all check-ins
app.get('/api/checkins', (req, res) => {
  const checkins = db.prepare('SELECT * FROM checkins ORDER BY check_in DESC').all();
  res.json(checkins);
});

// Get currently checked in users
app.get('/api/checkins/active', (req, res) => {
  const active = db.prepare('SELECT * FROM checkins WHERE check_out IS NULL').all();
  res.json(active);
});

// Get user statistics
app.get('/api/users/:id/stats', (req, res) => {
  const sessions = db.prepare(
    'SELECT * FROM checkins WHERE user_id = ? AND check_out IS NOT NULL'
  ).all(req.params.id);

  const totalMinutes = sessions.reduce((acc, session) => {
    const diff = new Date(session.check_out) - new Date(session.check_in);
    return acc + diff / 60000;
  }, 0);

  res.json({
    total_visits: sessions.length,
    total_hours: Math.floor(totalMinutes / 60),
    average_hours: sessions.length ? Math.floor(totalMinutes / 60 / sessions.length) : 0
  });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   Coworking Check-in System                    ║
║   Server running on port ${PORT}                   ║
║                                                ║
║   Frontend: http://localhost:${PORT}              ║
║   API: http://localhost:${PORT}/api               ║
╚════════════════════════════════════════════════╝
  `);
});
EOF