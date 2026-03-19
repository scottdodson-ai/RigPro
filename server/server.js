import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_rigpro';

// Create a database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'rigpro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// LOGIN ENDPOINT
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// GET BASE DATA (Protected)
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const [labor] = await db.query('SELECT * FROM base_labor');
    const [equipment] = await db.query('SELECT * FROM equipment');
    const [customers] = await db.query('SELECT * FROM customers');
    const [quotes] = await db.query('SELECT * FROM quotes');

    res.json({
      labor,
      equipment,
      customers,
      quotes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// USER MANAGEMENT ENDPOINTS (Admin Only)
const authenticateAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

app.get('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, role, created_at FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { role } = req.body;
  try {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role required' });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, password_hash, role]);
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/api/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

const PORT = process.env.PORT || 3001;

// Ensure admin account exists and has known password (dev/seed behavior).
const initAdmin = async () => {
  try {
    const hash = await bcrypt.hash('pass', 10);
    await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES (?, ?, 'admin')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
      ['scott', hash]
    );
    console.log('Admin account (scott) ensured.');
  } catch (error) {
    console.error('Failed to initialize admin account', error);
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initAdmin();
});
