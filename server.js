// ---------------- IMPORTS ----------------
const express = require('express'); // Express framework for building API
const cors = require('cors'); // Enable Cross-Origin Resource Sharing
const { Pool } = require('pg'); // PostgreSQL client
const path = require('path'); // Node.js path utilities

const app = express();
const PORT = process.env.PORT || 3000; // Default port 3000 if not set in env

// ---------------- MIDDLEWARE ----------------
app.use(cors()); // Allow requests from any origin
app.use(express.json()); // Parse incoming JSON requests

// ---------------- DATABASE CONNECTION ----------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL, // DB connection string
  ssl: {
    rejectUnauthorized: false // Allow self-signed certs (for cloud DBs like Heroku)
  }
});

// ---------------- INITIALIZE DATABASE TABLES ----------------
const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        card_id TEXT UNIQUE NOT NULL,
        included_hours INT4 DEFAULT 0,
        user_type TEXT DEFAULT 'abo',
        credits INT4 DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);

    // Checkins table
    await pool.query(`
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
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};
initDatabase(); // Run immediately

// ---------------- API ROUTES ----------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------- CHECK-IN / CHECK-OUT ----------------
app.post('/api/checkin', async (req, res) => {
  const { card_id, timestamp } = req.body;

  // Validate input
  if (!card_id) return res.status(400).json({ error: 'Card ID required' });

  try {
    // Find user by card_id
    const userResult = await pool.query('SELECT * FROM users WHERE card_id = $1', [card_id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'Card not registered' });

    // Check if user already has an active session (no check_out)
    const sessionResult = await pool.query(
      'SELECT * FROM checkins WHERE user_id = $1 AND check_out IS NULL',
      [user.id]
    );
    const activeSession = sessionResult.rows[0];

    if (activeSession) {
      // User is checking out
      const checkOutTime = timestamp || new Date().toISOString();
      const checkInTime = new Date(activeSession.check_in);
      const diff = new Date(checkOutTime) - checkInTime; // difference in ms
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const duration = `${hours}h ${minutes}m`;

      // Update session with check_out time and duration
      await pool.query(
        'UPDATE checkins SET check_out = $1, duration = $2 WHERE id = $3',
        [checkOutTime, duration, activeSession.id]
      );

      console.log(`✓ ${user.name} checked out (${duration})`);
      return res.json({ message: `${user.name} checked out`, action: 'checkout', user: user.name, duration });
    } else {
      // User is checking in
      const checkInId = Date.now().toString(); // Unique ID
      const checkInTime = timestamp || new Date().toISOString();
      await pool.query(
        'INSERT INTO checkins (id, user_id, user_name, check_in) VALUES ($1, $2, $3, $4)',
        [checkInId, user.id, user.name, checkInTime]
      );

      console.log(`✓ ${user.name} checked in`);
      return res.json({ message: `${user.name} checked in`, action: 'checkin', user: user.name });
    }
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- USERS CRUD ----------------

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new user
app.post('/api/users', async (req, res) => {
  const { name, email, card_id, included_hours, user_type, credits } = req.body;
  if (!name || !card_id) return res.status(400).json({ error: 'Name and card_id required' });

  const id = Date.now().toString(); // Generate simple unique ID
  const created_at = new Date().toISOString();

  try {
    await pool.query(
      'INSERT INTO users (id, name, email, card_id, included_hours, user_type, credits, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, name, email || '', card_id, included_hours || 0, user_type || 'abo', credits || 0, created_at]
    );
    console.log(`✓ New user created: ${name}`);
    res.json({ id, name, email, card_id, included_hours: included_hours || 0, user_type: user_type || 'abo', credits: credits || 0, created_at });
  } catch (error) {
    // Handle duplicate card_id error
    if (error.code === '23505') res.status(400).json({ error: 'Card ID already exists' });
    else {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  const { name, email, card_id, included_hours, user_type, credits } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=$1, email=$2, card_id=$3, included_hours=$4, user_type=$5, credits=$6 WHERE id=$7',
      [name, email || '', card_id, included_hours || 0, user_type || 'abo', credits || 0, req.params.id]
    );
    console.log(`✓ User updated: ${name}`);
    res.json({ id: req.params.id, name, email, card_id, included_hours: included_hours || 0, user_type: user_type || 'abo', credits: credits || 0 });
  } catch (error) {
    if (error.code === '23505') res.status(400).json({ error: 'Card ID already exists' });
    else {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    console.log(`✓ User deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- CHECKINS ----------------

// Get all check-ins
app.get('/api/checkins', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checkins ORDER BY check_in DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a check-in record
app.delete('/api/checkins/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM checkins WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Check-in record not found' });
    }
    console.log(`✓ Check-in deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete check-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- STATIC FRONTEND ----------------

// Serve React frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// SPA catch-all route for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});