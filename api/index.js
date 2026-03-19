// ---------------- IMPORTS ----------------
const express = require('express'); // Express framework for building API
const cors = require('cors'); // Enable Cross-Origin Resource Sharing
const { Pool } = require('pg'); // PostgreSQL client
const path = require('path'); // Node.js path utilities

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- MIDDLEWARE ----------------
app.use(cors()); // Allow requests from any origin
app.use(express.json()); // Parse incoming JSON requests

// ---------------- SECURITY ----------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const authMiddleware = (req, res, next) => {
  // Publicly accessible paths (Health check and Pi check-ins)
  // Note: In production, you might want to secure /api/checkin with an API Key
  const publicPaths = ['/api/health', '/api/checkin'];
  if (publicPaths.includes(req.path)) return next();

  // If no password is set in env, allow access (for initial setup)
  if (!ADMIN_PASSWORD) return next();

  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_PASSWORD}`) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
};
app.use(authMiddleware);

// ---------------- DATABASE CONNECTION ----------------
const pool = new Pool({
  connectionString: process.env.RAMI_POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL, 
  ssl: (process.env.RAMI_POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL)?.includes('localhost') 
    ? false 
    : {
        rejectUnauthorized: false
      }
});

// ---------------- INITIALIZE DATABASE TABLES ----------------
// Idempotent table creation
const initDatabase = async () => {
  try {
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
    console.log('✓ Database tables verified');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};
// On Vercel, we call this but don't block. 
// For better performance, consider running this as a separate migration script.
initDatabase();

// ---------------- API ROUTES ----------------

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbConfigured = !!(process.env.RAMI_POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL);
  
  let dbStatus = 'Not Configured';
  if (dbConfigured) {
    try {
      const result = await pool.query('SELECT NOW()');
      dbStatus = 'Connected';
    } catch (err) {
      dbStatus = `Error: ${err.message}`;
    }
  }

  res.json({ 
    status: 'ok', 
    database: 'supabase', 
    database_status: dbStatus,
    timestamp: new Date().toISOString() 
  });
});

// Check card status endpoint
app.post('/api/check-card', async (req, res) => {
  const { card_id } = req.body;
  if (!card_id) return res.status(400).json({ error: 'Card ID required' });
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE card_id = $1', [card_id]);
    const user = result.rows[0];
    res.json({ card_id, user: user || null });
  } catch (error) {
    console.error('Check card error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- CHECK-IN / CHECK-OUT ----------------
app.post('/api/checkin', async (req, res) => {
  const { card_id, timestamp } = req.body;
  if (!card_id) return res.status(400).json({ error: 'Card ID required' });

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE card_id = $1', [card_id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'Card not registered' });

    const sessionResult = await pool.query(
      'SELECT * FROM checkins WHERE user_id = $1 AND check_out IS NULL',
      [user.id]
    );
    const activeSession = sessionResult.rows[0];

    if (activeSession) {
      const checkOutTime = timestamp || new Date().toISOString();
      const checkInTime = new Date(activeSession.check_in);
      const diff = new Date(checkOutTime) - checkInTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const duration = `${hours}h ${minutes}m`;

      await pool.query(
        'UPDATE checkins SET check_out = $1, duration = $2 WHERE id = $3',
        [checkOutTime, duration, activeSession.id]
      );

      return res.json({ message: `${user.name} checked out`, action: 'checkout', user: user.name, duration });
    } else {
      const checkInId = Date.now().toString();
      const checkInTime = timestamp || new Date().toISOString();
      
      await pool.query(
        'INSERT INTO checkins (id, user_id, user_name, check_in) VALUES ($1, $2, $3, $4)',
        [checkInId, user.id, user.name, checkInTime]
      );

      if (user.user_type === 'credit') {
        const newCredits = Math.max(user.credits - 1, 0);
        await pool.query('UPDATE users SET credits = $1 WHERE id = $2', [newCredits, user.id]);
        return res.json({ message: `${user.name} checked in`, action: 'checkin', user: user.name, credits_remaining: newCredits });
      }

      return res.json({ message: `${user.name} checked in`, action: 'checkin', user: user.name });
    }
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- USERS CRUD ----------------

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, card_id, included_hours, user_type, credits } = req.body;
  if (!name || !card_id) return res.status(400).json({ error: 'Name and card_id required' });

  const id = Date.now().toString();
  const created_at = new Date().toISOString();

  try {
    await pool.query(
      'INSERT INTO users (id, name, email, card_id, included_hours, user_type, credits, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, name, email || '', card_id, included_hours || 0, user_type || 'abo', credits || 0, created_at]
    );
    res.json({ id, name, email, card_id, included_hours, user_type, credits, created_at });
  } catch (error) {
    if (error.code === '23505') res.status(400).json({ error: 'Card ID already exists' });
    else res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { name, email, card_id, included_hours, user_type, credits } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=$1, email=$2, card_id=$3, included_hours=$4, user_type=$5, credits=$6 WHERE id=$7',
      [name, email || '', card_id, included_hours || 0, user_type || 'abo', credits || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- CHECKINS ----------------

app.get('/api/checkins', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checkins ORDER BY check_in DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/checkins/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM checkins WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- VERCEL EXPORTS ----------------

// Only listen to port if not running as a serverless function
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;