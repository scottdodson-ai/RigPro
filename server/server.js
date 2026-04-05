import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, 'backups');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOADS_DIR });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/sql', limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_rigpro';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text:latest';

const SEARCH_COLLECTIONS = ['quotes', 'rigpro_tables'];

const getQueryEmbedding = async (text) => {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('Embedding response did not include a valid vector');
  }

  return data.embedding;
};

const qdrantSearch = async (collection, vector, limit) => {
  const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
      with_vector: false
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Qdrant search failed for ${collection} (${response.status}): ${body}`);
  }

  const data = await response.json();
  return Array.isArray(data.result) ? data.result : [];
};

// Create a database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'rigpro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

const USERNAME_REGEX = /^[a-z]{1,16}$/;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function isValidUsername(username) {
  return USERNAME_REGEX.test(normalizeUsername(username));
}

async function ensureUserProfileColumns() {
  const columnsToAdd = [
    { name: 'first_name',  def: 'VARCHAR(100)' },
    { name: 'last_name',   def: 'VARCHAR(100)' },
    { name: 'cell_phone',  def: 'VARCHAR(50)' },
    { name: 'is_disabled', def: 'TINYINT(1) NOT NULL DEFAULT 0' },
    { name: 'avatar',      def: 'LONGTEXT' },
  ];
  for (const { name, def } of columnsToAdd) {
    const [rows] = await db.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [name]
    );
    if (rows.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
    }
  }
}

async function ensureAuthAuditTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_auth_audit (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      username VARCHAR(50),
      event_type VARCHAR(20) NOT NULL,
      ip_address VARCHAR(64),
      user_agent VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_event_type (event_type),
      INDEX idx_created_at (created_at)
    )
  `);
}

async function recordAuthEvent({ userId, username, eventType, ipAddress, userAgent }) {
  await ensureAuthAuditTable();
  await db.query(
    'INSERT INTO user_auth_audit (user_id, username, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [userId || null, username || null, eventType, ipAddress || null, (userAgent || '').slice(0, 255)]
  );
}

// LOGIN ENDPOINT
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query('SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar, password_hash FROM users WHERE username = ?', [normalizedUsername]);
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });
    if (Number(user.is_disabled) === 1) return res.status(403).json({ error: 'Account is disabled. Contact an administrator.' });

    await recordAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: 'login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: {
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username,
      role: user.role,
      email: user.email || '',
      cell_phone: user.cell_phone || '',
      avatar: user.avatar || null,
      is_disabled: Number(user.is_disabled) === 1
    } });
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

    db.query('SELECT id, role, is_disabled FROM users WHERE id = ? LIMIT 1', [user.userId])
      .then(([rows]) => {
        if (!rows.length) return res.status(401).json({ error: 'User not found' });
        if (Number(rows[0].is_disabled) === 1) return res.status(403).json({ error: 'Account is disabled' });

        req.user = { ...user, role: rows[0].role };
        next();
      })
      .catch(() => res.status(500).json({ error: 'Authentication check failed' }));
  });
};

// GET BASE DATA (Protected)
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    await ensureUserProfileColumns();
    const safeQuery = async (sql, fallback = []) => {
      try {
        const [rows] = await db.query(sql);
        return rows;
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return fallback;
        }
        throw err;
      }
    };

    const labor = await safeQuery('SELECT * FROM base_labor');
    const equipment = await safeQuery('SELECT * FROM equipment');
    const customers = await safeQuery('SELECT * FROM customers');
    const contacts = await safeQuery('SELECT * FROM customer_contacts');
    // Load quotes from the working table first, then optionally append master_jobs history.
    const quotesRows = await safeQuery(`SELECT id,
                quote_number as qn,
                customer_name as client,
                job_site as jobSite,
                description as jobDesc,
                date,
                status,
                quote_type as qtype,
                labor,
                equip,
                hauling,
                travel,
                materials as mats,
                total,
                markup,
                sales_assoc as salesAssoc,
                job_num,
                start_date as startDate,
                comp_date as compDate,
                is_locked as locked,
                notes,
                quote_data
           FROM quotes`);

    const mappedQuotes = quotesRows.map((row) => {
      let json = {};
      if (row.quote_data) {
        try { json = JSON.parse(row.quote_data); } catch { json = {}; }
      }
      const jobNum = row.job_num || json.job_num || json.jobNum || '';
      return {
        ...json,
        ...row,
        qn: row.qn || json.qn || '',
        client: row.client || json.client || '',
        jobSite: row.jobSite || json.jobSite || '',
        desc: row.jobDesc || row.desc || json.desc || '',
        qtype: row.qtype || json.qtype || 'Contract',
        salesAssoc: row.salesAssoc || json.salesAssoc || '',
        job_num: jobNum,
        jobNum,
        startDate: row.startDate || json.startDate || '',
        compDate: row.compDate || json.compDate || '',
        locked: Boolean(row.locked ?? json.locked),
      };
    });

    let jobs = mappedQuotes;
    const [masterJobsExists] = await db.query("SHOW TABLES LIKE 'master_jobs'");
    if (masterJobsExists.length) {
      const masterRows = await safeQuery('SELECT *, customer_name as client, job_number as job_num, total_billings as total FROM master_jobs');
      const existingKeys = new Set(mappedQuotes.map(q => q.qn || `quote:${q.id}`));
      const mappedMaster = masterRows.map((row) => {
        const qn = row.quote_number || row.qn || '';
        const jobNum = row.job_num || row.job_number || '';
        return {
          ...row,
          qn,
          job_num: jobNum,
          jobNum,
          jobSite: row.job_site || row.jobSite || '',
          desc: row.description || row.desc || '',
          qtype: row.quote_type || row.qtype || 'Contract',
          salesAssoc: row.sales_assoc || row.salesAssoc || '',
          locked: Boolean(row.is_locked ?? row.locked),
        };
      });
      jobs = [
        ...mappedQuotes,
        ...mappedMaster.filter(m => !existingKeys.has(m.qn || `master:${m.id}`)),
      ];
    }
    const rfqs = await safeQuery('SELECT *, rfq_number as rn FROM rfqs');
    const users = await safeQuery('SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, created_at FROM users');
    const estimators = await safeQuery('SELECT * FROM estimators');

    // Map customers array back to the object structure expected by App.jsx
    const custData = {};
    customers.forEach(c => {
      custData[c.name] = {
        ...c,
        customer_num: c.customer_num,
        billingAddr: c.billing_address || c.address || "",
        billing_address: c.billing_address || "",
        paymentTerms: c.payment_terms || "",
        accountNum: c.account_num || "",
        locations: c.billing_address ? [{ id: 'hq', name: 'HQ / Billing', address: c.billing_address, notes: 'Imported address' }] : [],
        contacts: contacts.filter(con => con.customer_id === c.id).map(con => ({
          ...con,
          mobile: con.mobile || "",
          primary: !!con.is_primary
        }))
      };
    });

    res.json({
      labor,
      equipment,
      customers: custData,
      jobs,
      rfqs,
      users,
      estimators
    });
  } catch (error) {
    console.error('[API] /api/data error:', error);
    // If the tables don't exist yet (e.g. after a failed restore wipe), return empty data
    // so the frontend can automatically trigger the DB re-initialization routine.
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ labor: [], equipment: [], customers: {}, jobs: [], rfqs: [], users: [], estimators: [] });
    }
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

// CURRENT USER PROFILE
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/me', authenticateToken, async (req, res) => {
  const { email, cell_phone, avatar, password, role } = req.body || {};
  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query('SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar FROM users WHERE id = ? LIMIT 1', [req.user.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const existing = rows[0];
    const nextAvatar = typeof avatar !== 'undefined' ? avatar : existing.avatar;
    const nextRole = req.user.role === 'admin' && role ? role : existing.role;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET email = ?, cell_phone = ?, avatar = ?, role = ?, password_hash = ? WHERE id = ?',
        [email ?? existing.email, cell_phone ?? existing.cell_phone, nextAvatar, nextRole, passwordHash, req.user.userId]
      );
    } else {
      await db.query(
        'UPDATE users SET email = ?, cell_phone = ?, avatar = ?, role = ? WHERE id = ?',
        [email ?? existing.email, cell_phone ?? existing.cell_phone, nextAvatar, nextRole, req.user.userId]
      );
    }

    const [updatedRows] = await db.query(
      'SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    res.json(updatedRows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT username FROM users WHERE id = ? LIMIT 1', [req.user.userId]);
    const username = rows[0]?.username || req.user.username || null;
    await recordAuthEvent({
      userId: req.user.userId,
      username,
      eventType: 'logout',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record logout event' });
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
  if (Number(req.params.id) === Number(req.user.userId)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DATABASE BROWSER ENDPOINTS (Admin Only)
app.get('/api/admin/tables', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log('[API] SHOW TABLES result:', rows);
    const tables = rows.map(r => Object.values(r)[0]);
    res.json(tables);
  } catch (error) {
    console.error('[API] SHOW TABLES error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});



// GET ALL USERS (Admin Only)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await ensureUserProfileColumns();
    const [users] = await db.query('SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// CREATE USER (Admin Only)
app.post('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const { first_name, last_name, username, email, cell_phone, password, role, is_disabled } = req.body;
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!isValidUsername(normalizedUsername)) {
    return res.status(400).json({ error: 'Username must be lowercase letters only, one word, max 16 characters, and no numbers.' });
  }
  
  try {
    await ensureUserProfileColumns();
    const passwordHash = await bcrypt.hash(password, 10);
     const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, username, email, cell_phone, avatar, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, passwordHash, role || 'user']
    );
    if (is_disabled) {
      await db.query('UPDATE users SET is_disabled = 1 WHERE id = ?', [result.insertId]);
    }
    res.json({ id: result.insertId, first_name: first_name || '', last_name: last_name || '', username: normalizedUsername, email: email || '', cell_phone: cell_phone || '', avatar: avatar || null, role: role || 'user', is_disabled: !!is_disabled });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE USER (Admin Only)
app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  if (Number(req.params.id) === Number(req.user.userId)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// UPDATE USER (Admin Only)
app.put('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { first_name, last_name, username, email, cell_phone, password, role, is_disabled } = req.body;
  const userId = req.params.id;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) return res.status(400).json({ error: 'Username is required' });
  if (!isValidUsername(normalizedUsername)) {
    return res.status(400).json({ error: 'Username must be lowercase letters only, one word, max 16 characters, and no numbers.' });
  }

  try {
    await ensureUserProfileColumns();
    const [targetRows] = await db.query('SELECT id, is_disabled FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!targetRows.length) return res.status(404).json({ error: 'User not found' });
    if (Number(userId) === Number(req.user.userId) && typeof is_disabled !== 'undefined' && Number(is_disabled) === 1) {
      return res.status(400).json({ error: 'You cannot disable your own account.' });
    }

    const nextDisabled = typeof is_disabled === 'undefined' ? Number(targetRows[0].is_disabled) : (Number(is_disabled) === 1 ? 1 : 0);

    if (password) {
      // Update with new password
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, role = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, passwordHash, role, nextDisabled, userId]
      );
    } else {
      // Update without changing password
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, role = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, role, nextDisabled, userId]
      );
    }
    res.json({ id: Number(userId), first_name: first_name || '', last_name: last_name || '', username: normalizedUsername, email: email || '', cell_phone: cell_phone || '', avatar: avatar || null, role, is_disabled: nextDisabled === 1 });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.patch('/api/admin/users/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const isDisabled = Number(req.body?.is_disabled) === 1;

  if (userId === Number(req.user.userId) && isDisabled) {
    return res.status(400).json({ error: 'You cannot disable your own account.' });
  }

  try {
    await ensureUserProfileColumns();
    const [result] = await db.query('UPDATE users SET is_disabled = ? WHERE id = ?', [isDisabled ? 1 : 0, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ id: userId, is_disabled: isDisabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account status' });
  }
});

// GET RAW TABLE DATA (Admin Only) - For the Data Browser
app.get('/api/admin/tables/:table', authenticateToken, authenticateAdmin, async (req, res) => {
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'rfqs', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators'];
  const table = req.params.table;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });

  try {
    const [idColumn] = await db.query(`SHOW COLUMNS FROM ${table} LIKE 'id'`);
    const query = idColumn.length
      ? `SELECT * FROM ${table} ORDER BY id DESC LIMIT 100`
      : `SELECT * FROM ${table} LIMIT 100`;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

// UPDATE RECORD IN TABLE (Admin Only)
app.put('/api/admin/tables/:table/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'rfqs', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators'];
  const table = req.params.table;
  const id = req.params.id;
  const data = req.body;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });

  try {
    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    if (keys.length === 0) return res.json({ message: 'No change needed' });

    const values = keys.map(k => (typeof data[k] === 'object' && data[k] !== null) ? JSON.stringify(data[k]) : data[k]);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');

    const [result] = await db.query(`UPDATE \`${table}\` SET ${setClause} WHERE id = ?`, [...values, id]);
    res.json({ success: true });
  } catch (error) {
    console.error(`[API] Table update error (${table}):`, error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
});

// VECTOR DB / AI MODEL STATUS (Admin Only)
app.get('/api/admin/vector-db', authenticateToken, authenticateAdmin, async (req, res) => {
  const AI_HOST = process.env.AI_HOST || 'http://ai:8080';

  const safeFetch = async (url) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

  const [health, props, slots] = await Promise.all([
    safeFetch(`${AI_HOST}/health`),
    safeFetch(`${AI_HOST}/props`),
    safeFetch(`${AI_HOST}/slots`),
  ]);

  // Count indexed records from MySQL as proxy for "embedded" docs
  let indexedCounts = {};
  try {
    const tables = ['customers', 'quotes', 'rfqs', 'equipment'];
    for (const t of tables) {
      try {
        const [[row]] = await db.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
        indexedCounts[t] = row.cnt;
      } catch { indexedCounts[t] = 0; }
    }
  } catch {}

  res.json({
    status: health ? (health.status || 'ok') : 'offline',
    modelLoaded: health ? health.status === 'ok' : false,
    health,
    props,
    slots: Array.isArray(slots) ? slots : [],
    indexedCounts,
    aiHost: AI_HOST,
    timestamp: new Date().toISOString(),
  });
});

// BULK INITIALIZATION (Admin Only) - Seeds DB from frontend data
app.post('/api/admin/init', authenticateToken, authenticateAdmin, async (req, res) => {
  const { quotes, rfqs, customers } = req.body;
  
  if (!quotes || !rfqs || !customers) return res.status(400).json({ error: 'Missing data for initialization' });

  const connection = await db.getConnection();
  try {
    // 0. Auto-recover tables if they are missing
    try {
      const initSqlPath = path.join(__dirname, '..', 'db', 'init.sql');
      if (fs.existsSync(initSqlPath)) {
        const schema = fs.readFileSync(initSqlPath, 'utf8');
        await connection.query(schema);
        console.log('[INIT] Database schema synchronized');
      }
    } catch (schemaErr) {
      console.warn('[INIT] Could not execute schema init.sql:', schemaErr.message);
    }

    await connection.beginTransaction();

    // Clear existing data to avoid conflicts during one-time init
    // Ignore errors if table doesn't exist yet (just in case schema was incomplete)
    const clearTable = async (table) => { try { await connection.query(`DELETE FROM ${table}`); } catch(e){} };
    await clearTable('quotes');
    await clearTable('rfqs');
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await clearTable('customers');
    await clearTable('customer_contacts');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Helper to prevent mysql2 undefined/empty string strict mode errors
    const passStr = (val) => (val === undefined || val === '') ? null : val;
    const passNum = (val) => (!val || isNaN(val)) ? 0 : Number(val);
    const passDate = (val) => (!val || val === '') ? null : val;

    // 1. Insert Customers
    for (const name in customers) {
      const c = customers[name];
      const [result] = await connection.query(
        'INSERT INTO customers (name, notes, billing_address, website, industry, payment_terms, account_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, passStr(c.notes), passStr(c.billingAddr), passStr(c.website), passStr(c.industry), passStr(c.paymentTerms), passStr(c.accountNum)]
      );
      const customerId = result.insertId;
      
      if (c.contacts) {
        for (const contact of c.contacts) {
          await connection.query(
            'INSERT INTO customer_contacts (customer_id, name, title, email, mobile, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [customerId, passStr(contact.name), passStr(contact.title), passStr(contact.email), passStr(contact.mobile), passStr(contact.phone), contact.primary ? 1 : 0]
          );
        }
      }
    }

    // 2. Insert Quotes
    for (const q of quotes) {
      await connection.query(
        'INSERT INTO quotes (quote_number, customer_name, job_site, description, date, status, quote_type, labor, equip, hauling, travel, materials, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [passStr(q.qn), passStr(q.client), passStr(q.jobSite), passStr(q.desc), passDate(q.date), passStr(q.status), passStr(q.qtype), passNum(q.labor), passNum(q.equip), passNum(q.hauling), passNum(q.travel), passNum(q.mats), passNum(q.total), passNum(q.markup), passStr(q.salesAssoc), passStr(q.jobNum), passDate(q.startDate), passDate(q.compDate), q.locked ? 1 : 0]
      );
    }

    // 3. Insert RFQs
    for (const r of rfqs) {
      await connection.query(
        'INSERT INTO rfqs (rfq_number, company, requester, email, phone, job_site, description, notes, date, status, sales_assoc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [passStr(r.rn), passStr(r.company), passStr(r.requester), passStr(r.email), passStr(r.phone), passStr(r.jobSite), passStr(r.desc), passStr(r.notes), passDate(r.date), passStr(r.status), passStr(r.salesAssoc)]
      );
    }

    await connection.commit();
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database', details: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/admin/backup', authenticateToken, authenticateAdmin, (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `rigpro_backup_${timestamp}.sql`;
  
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'password123';
  const database = process.env.DB_NAME || 'rigpro';

  console.log(`[BACKUP] Starting backup: ${filename}`);

  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const dumpCommand = `mariadb-dump --skip-ssl -h ${host} -u ${user} ${database}`;
  const backupEnv = { ...process.env, MYSQL_PWD: password };
  const backupPath = path.join(BACKUPS_DIR, filename);

  const child = exec(`${dumpCommand} > "${backupPath}"`, { env: backupEnv });

  child.stderr.on('data', (data) => {
    console.error(`[BACKUP] mysqldump stderr: ${data}`);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[BACKUP] mysqldump exited with code ${code}`);
      if (!res.headersSent) res.status(500).json({ error: 'Backup process failed' });
    } else {
      console.log(`[BACKUP] Backup saved to disk: ${filename}`);
      
      // ROTATION: Keep latest 5 only
      try {
        const files = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.endsWith('.sql'))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 5) {
          files.slice(5).forEach(f => {
            fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
            console.log(`[BACKUP] Rotated (deleted) old backup: ${f.name}`);
          });
        }

        // Stream the file back to the client
        res.download(backupPath, filename, (err) => {
          if (err) console.error('[BACKUP] Error sending file to client:', err);
        });
      } catch (rotationErr) {
        console.error('[BACKUP] Rotation error:', rotationErr);
        if (!res.headersSent) res.status(500).json({ error: 'Backup rotation failed' });
      }
    }
  });

  child.on('error', (err) => {
    console.error('[BACKUP] Failed to start mysqldump:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal backup error' });
  });
});

// LIST LOCAL BACKUPS
app.get('/api/admin/backups/list', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(files);
  } catch (error) {
    console.error("[LIST BACKUPS] Error:", error);
    res.status(500).json({ error: 'Failed to list backups', details: error.message });
  }
});

// EXPORT EXCEL
app.get('/api/admin/export-excel', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [tablesResult] = await db.query('SHOW TABLES');
    const tables = tablesResult.map(r => Object.values(r)[0]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RigPro DB Exporter';

    for (const table of tables) {
      const [rows] = await db.query(`SELECT * FROM ${table}`);
      const worksheet = workbook.addWorksheet(table.substring(0, 31));
      
      if (rows.length === 0) {
        worksheet.addRow(['No data']);
      } else {
        const headers = Object.keys(rows[0]);
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        
        for (const row of rows) {
          worksheet.addRow(Object.values(row));
        }
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rigpro_export_${new Date().toISOString().slice(0,10)}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[EXPORT EXCEL] Error:", error);
    res.status(500).json({ error: 'Failed to export Excel spreadsheet' });
  }
});

// IMPORT EXCEL
app.post('/api/admin/import-excel', authenticateToken, authenticateAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

  let connection;
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Get all valid tables to prevent SQL injection
    const [tablesResult] = await connection.query('SHOW TABLES');
    const validTables = tablesResult.map(r => Object.values(r)[0]);

    for (const worksheet of workbook.worksheets) {
      const tableName = worksheet.name;
      if (!validTables.includes(tableName)) {
        console.warn(`[IMPORT EXCEL] Skipping unknown sheet: ${tableName}`);
        continue;
      }
      
      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers
        rows.push(row.values.slice(1));
      });

      if (rows.length > 0) {
        await connection.query(`DELETE FROM \`${tableName}\``);
        const headers = worksheet.getRow(1).values.slice(1);
        const placeholders = headers.map(() => '?').join(', ');
        
        for (const rowData of rows) {
          const paddedData = headers.map((_, i) => {
            const val = rowData[i];
            if (val && typeof val === 'object' && val.richText) {
               // Handle rich text
               return val.richText.map(t => t.text).join('');
            }
            if (val && typeof val === 'object' && val instanceof Date) {
               return val.toISOString().slice(0, 19).replace('T', ' ');
            }
            return val === undefined ? null : val;
          });
          await connection.query(`INSERT INTO \`${tableName}\` (${headers.map(h => `\`${h}\``).join(', ')}) VALUES (${placeholders})`, paddedData);
        }
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    res.json({ message: 'Excel import successful' });
  } catch (error) {
    if (connection) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1'); // Reset
      await connection.rollback();
    }
    console.error("[IMPORT EXCEL] Error:", error);
    res.status(500).json({ error: 'Failed to import Excel data: ' + error.message });
  } finally {
    if (connection) connection.release();
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// DELETE BACKUPS
app.post('/api/admin/backups/delete', authenticateToken, authenticateAdmin, (req, res) => {
  const { filenames } = req.body;
  if (!filenames || !Array.isArray(filenames)) return res.status(400).json({ error: 'Must provide array of filenames' });

  try {
    filenames.forEach(f => {
      const safePath = path.join(BACKUPS_DIR, path.basename(f));
      if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
    });
    res.json({ message: 'Backups deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete some backups' });
  }
});

// RESTORE DATABASE (Admin Only) - Takes a .sql file as raw text
app.post('/api/admin/restore', authenticateToken, authenticateAdmin, (req, res) => {
  const sql = req.body;
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'No SQL content provided' });

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'password123';
  const database = process.env.DB_NAME || 'rigpro';

  const tempPath = path.join(BACKUPS_DIR, `temp_restore_${Date.now()}.sql`);
  
  try {
    fs.writeFileSync(tempPath, sql);
    console.log('[RESTORE] Using mariadb CLI for restoration...');

    const restoreCmd = `mariadb --skip-ssl -h ${host} -u ${user} ${database} < "${tempPath}"`;
    const envWithPass = { ...process.env, MYSQL_PWD: password };

    exec(restoreCmd, { env: envWithPass }, (error, stdout, stderr) => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      if (error) {
        console.error('[RESTORE] CLI Error:', error, stderr);
        return res.status(500).json({ error: 'Restoration failed', details: stderr || error.message });
      }
      
      console.log('[RESTORE] Native restoration completed successfully');
      res.json({ message: 'Database restored successfully' });
    });
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error('[RESTORE] Post Error:', err);
    res.status(500).json({ error: 'Failed to initiate restoration', details: err.message });
  }
});


// ADMIN TASKS & TODOS
app.get('/api/admin/tasks', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT * FROM admin_tasks ORDER BY created_at DESC');
    res.json(tasks.map(t => ({ ...t, subnotes: typeof t.subnotes === 'string' ? JSON.parse(t.subnotes) : (t.subnotes || []) })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/admin/tasks', authenticateToken, authenticateAdmin, async (req, res) => {
  const { text, subnotes } = req.body;
  if (!text) return res.status(400).json({ error: 'Task text is required' });

  try {
    const [result] = await db.query('INSERT INTO admin_tasks (text, subnotes) VALUES (?, ?)', [text, JSON.stringify(subnotes || [])]);
    res.json({ id: result.insertId, text, done: false, subnotes: subnotes || [] });
  } catch (error) {
    console.error('[TASKS] Create error:', error);
    res.status(500).json({ error: 'Failed to create task: ' + error.message });
  }
});

app.patch('/api/admin/tasks/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { done, subnotes, text } = req.body;
  try {
    const fields = [];
    const values = [];
    if (done !== undefined) { fields.push('done = ?'); values.push(done); }
    if (subnotes !== undefined) { fields.push('subnotes = ?'); values.push(JSON.stringify(subnotes)); }
    if (text !== undefined) { fields.push('text = ?'); values.push(text); }
    values.push(req.params.id);

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    await db.query(`UPDATE admin_tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/admin/tasks/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM admin_tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// CUSTOMER MANAGEMENT ENDPOINTS
// Get all customers
app.get('/api/admin/customers', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [customers] = await db.query('SELECT * FROM customers');
    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Add a new customer
app.post('/api/admin/customers', authenticateToken, authenticateAdmin, async (req, res) => {
  const { name, notes, billing_address, website, industry, payment_terms, account_num } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO customers (name, notes, billing_address, website, industry, payment_terms, account_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), notes || '', billing_address || '', website || '', industry || '', payment_terms || '', account_num || '']
    );
    
    const [newCustomer] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json(newCustomer[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Customer name already exists' });
    }
    console.error('Failed to create customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Edit existing customer
app.put('/api/admin/customers/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { name, notes, billing_address, website, industry, payment_terms, account_num } = req.body;
  const customerId = req.params.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  try {
    // Check if new name is already taken by another customer
    const [existing] = await db.query(
      'SELECT id FROM customers WHERE name = ? AND id != ?',
      [name.trim(), customerId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Customer name already exists' });
    }

    await db.query(
      'UPDATE customers SET name = ?, notes = ?, billing_address = ?, website = ?, industry = ?, payment_terms = ?, account_num = ? WHERE id = ?',
      [name.trim(), notes || '', billing_address || '', website || '', industry || '', payment_terms || '', account_num || '', customerId]
    );
    
    const [updated] = await db.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Failed to update customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete a customer
app.delete('/api/admin/customers/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const customerId = req.params.id;

  try {
    // Check if customer has related contacts or jobs
    const [contacts] = await db.query(
      'SELECT COUNT(*) as count FROM customer_contacts WHERE customer_id = ?',
      [customerId]
    );
    
    if (contacts[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with associated contacts. Please remove contacts first.' });
    }

    const [result] = await db.query('DELETE FROM customers WHERE id = ?', [customerId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

async function ensureCompanyInfoTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      address TEXT,
      services TEXT,
      logo_src LONGTEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

  // GET COMPANY INFO
  app.get('/api/admin/company-info', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
      await ensureCompanyInfoTable();
      const [rows] = await db.query('SELECT * FROM company_info ORDER BY id DESC LIMIT 1');
      if (rows.length === 0) {
        return res.json({ id: null, name: '', address: '', services: '', logo_src: null });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('Failed to fetch company info:', error);
      res.status(500).json({ error: 'Failed to fetch company info' });
    }
  });

  // UPDATE COMPANY INFO
  app.put('/api/admin/company-info', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, address, services, logo_src } = req.body;

    try {
      await ensureCompanyInfoTable();
      const [existing] = await db.query('SELECT id FROM company_info LIMIT 1');
    
      if (existing.length > 0) {
        // Update existing record
        await db.query(
          'UPDATE company_info SET name = ?, address = ?, services = ?, logo_src = ? WHERE id = ?',
          [name, address, services, logo_src, existing[0].id]
        );
        res.json({ id: existing[0].id, name, address, services, logo_src });
      } else {
        // Create new record
        const [result] = await db.query(
          'INSERT INTO company_info (name, address, services, logo_src) VALUES (?, ?, ?, ?)',
          [name, address, services, logo_src]
        );
        res.json({ id: result.insertId, name, address, services, logo_src });
      }
    } catch (error) {
      console.error('Failed to update company info:', error);
      res.status(500).json({ error: 'Failed to update company info' });
    }
  });

// VECTOR SEARCH (Protected)
app.post('/api/search/vector', authenticateToken, async (req, res) => {
  const { query, collection = 'all', limit = 8 } = req.body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const trimmedQuery = query.trim();
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 8, 25));

  let collections;
  if (collection === 'all') {
    collections = SEARCH_COLLECTIONS;
  } else if (SEARCH_COLLECTIONS.includes(collection)) {
    collections = [collection];
  } else {
    return res.status(400).json({ error: `Invalid collection. Allowed: all, ${SEARCH_COLLECTIONS.join(', ')}` });
  }

  try {
    const vector = await getQueryEmbedding(trimmedQuery);

    const allResults = [];
    for (const col of collections) {
      try {
        const results = await qdrantSearch(col, vector, normalizedLimit);
        results.forEach((r) => {
          allResults.push({
            collection: col,
            score: r.score,
            id: r.id,
            payload: r.payload || {}
          });
        });
      } catch (err) {
        // Collection might not exist yet; skip that collection but keep others.
        console.warn(`[VECTOR SEARCH] Skipping collection ${col}:`, err.message);
      }
    }

    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = allResults.slice(0, normalizedLimit);

    res.json({
      query: trimmedQuery,
      limit: normalizedLimit,
      searchedCollections: collections,
      count: top.length,
      results: top
    });
  } catch (error) {
    console.error('[VECTOR SEARCH] Error:', error.message);
    res.status(500).json({ error: 'Vector search failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;

// Ensure admin account exists and has known password (dev/seed behavior).
const initAdmin = async () => {
  try {
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD || 'password123';
    
    // Explicitly update current user to legacy auth plugin so mariadb CLI can connect
    try {
      await db.query(`ALTER USER CURRENT_USER() IDENTIFIED WITH mysql_native_password BY ?`, [dbPass]);
    } catch (authErr) {
      // Might fail on some managed DBs or older versions; log and continue
      console.warn('[INIT] Could not set legacy auth plugin, CLI restore might fail:', authErr.message);
    }

    await ensureUserProfileColumns();
    await ensureCompanyInfoTable();
    const hash = await bcrypt.hash('pass', 10);
    await db.query(
      `INSERT INTO users (first_name, last_name, username, email, cell_phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
      ['Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', hash]
    );
    console.log('Admin account (scott) ensured.');
  } catch (error) {
    console.error('Failed to initialize admin account', error);
  }
};

// RESTORE FROM LOCAL BACKUP
app.post('/api/admin/restore-local', authenticateToken, authenticateAdmin, async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const safePath = path.join(BACKUPS_DIR, path.basename(filename));
  if (!fs.existsSync(safePath)) return res.status(404).json({ error: 'Backup file not found' });

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'password123';
  const database = process.env.DB_NAME || 'rigpro';

  console.log(`[RESTORE] CLI local restore: ${filename}`);

  const restoreCmd = `mariadb --skip-ssl -h ${host} -u ${user} ${database} < "${safePath}"`;
  const envWithPass = { ...process.env, MYSQL_PWD: password };

  exec(restoreCmd, { env: envWithPass }, (err, stdout, stderr) => {
    if (err) {
      console.error('[RESTORE-LOCAL] CLI Error:', err, stderr);
      return res.status(500).json({ error: 'Restoration failed', details: stderr || err.message });
    }
    console.log('[RESTORE-LOCAL] Native CLI restore completed successfully');
    res.json({ message: 'Database restored successfully' });
  });
});

// SAVE QUOTE ENDPOINT
app.post('/api/quotes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const quote = req.body;

  if (!quote || !quote.qn) {
    return res.status(400).json({ error: 'Invalid quote data' });
  }

  const connection = await db.getConnection();
  try {
    const safeId = Number(id);
    let targetId = null;

    // Only trust route id if it fits INT range used by quotes.id
    if (Number.isInteger(safeId) && safeId > 0 && safeId <= 2147483647) {
      const [existingById] = await connection.query('SELECT id FROM quotes WHERE id = ?', [safeId]);
      if (existingById.length > 0) targetId = existingById[0].id;
    }

    // Fallback: resolve by quote number so client-side timestamp ids can still update correctly
    if (!targetId && quote.qn) {
      const [existingByQn] = await connection.query(
        'SELECT id FROM quotes WHERE quote_number = ? ORDER BY id DESC LIMIT 1',
        [quote.qn]
      );
      if (existingByQn.length > 0) targetId = existingByQn[0].id;
    }

    let resolvedJobNum = (quote.jobNum || quote.job_num || '').trim();
    if (!resolvedJobNum && !['Dead', 'Lost'].includes(quote.status || '')) {
      const year = String(new Date(quote.date || Date.now()).getFullYear());
      const [seqRows] = await connection.query(
        `SELECT MAX(CAST(SUBSTRING_INDEX(job_num, '-', -1) AS UNSIGNED)) AS max_seq
           FROM quotes
          WHERE job_num REGEXP ?`,
        [`^J-${year}-[0-9]{3,}$`]
      );
      const nextSeq = Number(seqRows?.[0]?.max_seq || 0) + 1;
      resolvedJobNum = `J-${year}-${String(nextSeq).padStart(3, '0')}`;
      quote.job_num = resolvedJobNum;
      quote.jobNum = resolvedJobNum;
    }

    // Ensure new estimate customers are represented in customers table.
    const customerName = String(quote.client || '').trim();
    if (customerName) {
      const [existingCustomer] = await connection.query('SELECT id FROM customers WHERE name = ? LIMIT 1', [customerName]);
      if (existingCustomer.length === 0) {
        await connection.query(
          'INSERT INTO customers (name, billing_address, notes) VALUES (?, ?, ?)',
          [customerName, String(quote.jobSite || '').trim(), 'Auto-created from quote save']
        );
      }
    }

    const rowValues = [
      quote.qn || '',
      quote.client || '',
      quote.jobSite || '',
      quote.desc || '',
      quote.date || null,
      quote.status || 'Draft',
      quote.qtype || '',
      quote.labor || 0,
      quote.equip || 0,
      quote.hauling || 0,
      quote.travel || 0,
      quote.mats || 0,
      quote.total || 0,
      quote.markup || 0,
      quote.salesAssoc || '',
      resolvedJobNum,
      quote.startDate || null,
      quote.compDate || null,
      quote.locked ? 1 : 0,
      quote.notes || '',
      JSON.stringify(quote)
    ];

    let savedId = targetId;
    if (targetId) {
      await connection.query(
        'UPDATE quotes SET quote_number=?, customer_name=?, job_site=?, description=?, date=?, status=?, quote_type=?, labor=?, equip=?, hauling=?, travel=?, materials=?, total=?, markup=?, sales_assoc=?, job_num=?, start_date=?, comp_date=?, is_locked=?, notes=?, quote_data=? WHERE id=?',
        [...rowValues, targetId]
      );
    } else {
      const [insertResult] = await connection.query(
        'INSERT INTO quotes (quote_number, customer_name, job_site, description, date, status, quote_type, labor, equip, hauling, travel, materials, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked, notes, quote_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        rowValues
      );
      savedId = insertResult.insertId;
    }

    connection.release();
    res.json({ success: true, id: savedId });
  } catch (error) {
    connection.release();
    console.error('Error saving quote:', error);
    res.status(500).json({ error: 'Failed to save quote', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initAdmin();
});
