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
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import https from 'https';

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
app.use(express.json({ limit: '10mb' }));
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
  port: process.env.DB_PORT || 3306,
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
    { name: 'user_number', def: 'INT UNIQUE' },
    { name: 'reset_token', def: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'reset_token_expires', def: 'DATETIME DEFAULT NULL' },
  ];
  for (const { name, def } of columnsToAdd) {
    const [rows] = await db.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [name]
    );
    if (rows.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
      if (name === 'user_number') {
        const [existingUsers] = await db.query('SELECT id FROM users ORDER BY created_at ASC');
        let nextUserNumber = 100000;
        for (const u of existingUsers) {
          let valid = false;
          while (!valid) {
            const [exist] = await db.query('SELECT id FROM users WHERE user_number = ?', [nextUserNumber]);
            if (exist.length === 0) valid = true;
            else nextUserNumber++;
          }
          await db.query('UPDATE users SET user_number = ? WHERE id = ?', [nextUserNumber, u.id]);
          nextUserNumber++;
        }
      }
    }
  }

  try {
    const [qRows] = await db.query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'quote_data'`);
    if (qRows.length === 0) {
      await db.query(`ALTER TABLE quotes ADD COLUMN quote_data LONGTEXT`);
    }
  } catch (e) {
    console.warn('[Schema] Ignoring quote_data column check:', e.message);
  }

  // Ensure leads schema is up to date
  await ensureLeadsTable();
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
    const [rows] = await db.query(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, COALESCE(u.roles, JSON_ARRAY()) AS roles, u.is_disabled, u.avatar, u.password_hash, u.user_number FROM users u WHERE u.username = ?`, [normalizedUsername]);
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

    const token = jwt.sign({ userId: user.id, username: user.username, roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || []) }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: {
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username,
      roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || []),
      email: user.email || '',
      cell_phone: user.cell_phone || '',
      avatar: user.avatar || null,
      user_number: user.user_number || null,
      is_disabled: Number(user.is_disabled) === 1
    } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FORGOT PASSWORD ENDPOINT
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query('SELECT id, email, first_name FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await db.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, resetTokenExpires, user.id]);

    const resetUrl = `${req.headers.origin || 'http://localhost:5173'}/?resetToken=${resetToken}`;

    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined
      });

      const mailOptions = {
        from: '"RigPro" <noreply@rigpro.com>',
        to: user.email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link to reset your password: ${resetUrl}\nIf you did not request this, please ignore this email.`
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${user.email}`);
      } catch (mailErr) {
        console.error('Failed to send email via SMTP:', mailErr.message);
        console.log(`Reset URL (Fallback): ${resetUrl}`);
      }
    } else {
      // In dev mode without an SMTP provider, auto-generate a test account
      try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        const mailOptions = {
          from: '"RigPro" <noreply@rigpro.com>',
          to: user.email,
          subject: 'Password Reset Request',
          text: `You requested a password reset. Click the link to reset your password: ${resetUrl}\nIf you did not request this, please ignore this email.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`\n=========================================`);
        console.log(`[DEV MODE] Virtual Email Dispatched to: ${user.email}`);
        console.log(`View the actual email here: ${nodemailer.getTestMessageUrl(info)}`);
        console.log(`=========================================\n`);
      } catch (err) {
        console.error('Ethereal generation failed:', err.message);
        console.log(`\n=========================================\n[DEV MODE] Password Reset Requested for ${user.email}\nReset URL: ${resetUrl}\n=========================================\n`);
      }
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RESET PASSWORD ENDPOINT
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1', [token]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired token' });

    const user = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [passwordHash, user.id]);

    res.json({ message: 'Password has been reset successfully. You can now login.' });
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

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });

      db.query('SELECT id, roles, is_disabled FROM users WHERE id = ? LIMIT 1', [decoded.userId])
        .then(([rows]) => {
          if (!rows.length || rows[0].is_disabled) return res.status(403).json({ error: 'User is disabled or not found' });
          let roles = rows[0].roles;
          if (typeof roles === 'string') {
            try { roles = JSON.parse(roles); } catch(e) { roles = []; }
          }
          req.user = { ...decoded, roles: Array.isArray(roles) ? roles : [] };
          next();
        })
        .catch((err) => {
          console.error('[AUTH] authenticateToken error:', err);
          res.status(500).json({ error: 'Authentication check failed' });
        });
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
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
          return fallback;
        }
        throw err;
      }
    };

    const labor = await safeQuery('SELECT * FROM base_labor');
    const equipment = await safeQuery('SELECT * FROM equipment');
    const customers = await safeQuery('SELECT * FROM customers');
    const sites = await safeQuery('SELECT * FROM sites');
    const contacts = await safeQuery('SELECT * FROM customer_contacts');
    // Load quotes from the working table first, then optionally append master_jobs history.
    const quotesRows = await safeQuery(`SELECT q.id,
                q.quote_number as qn,
                q.customer_name as client,
                q.job_site as jobSite,
                q.description as jobDesc,
                q.date,
                s.name as status,
                q.status as status_id,
                q.quote_type as qtype,
                q.labor,
                q.equip,
                q.hauling,
                q.travel,
                q.materials as mats,
                q.total,
                q.markup,
                q.sales_assoc as salesAssoc,
                q.job_num,
                q.start_date as startDate,
                q.comp_date as compDate,
                q.is_locked as locked,
                q.notes,
                q.quote_data
           FROM quotes q
           LEFT JOIN status s ON q.status = s.id`);

    const mappedQuotes = quotesRows.map((row) => {
      let json = {};
      if (row.quote_data) {
        try { json = JSON.parse(row.quote_data); } catch { json = {}; }
      }
      const jobNum = row.job_num || json.job_num || json.jobNum || '';
      return {
        ...json,
        ...row,
        status: row.status || json.status || 'Draft',
        qn: row.qn || json.qn || '',
        quote_number: row.qn || json.qn || '',
        client: row.client || row.customer_name || json.client || '',
        jobSite: row.jobSite || row.job_site || json.jobSite || '',
        street: row.street || json.street || json.jobSiteAddress1 || '',
        city: row.city || json.city || json.jobSiteCity || '',
        state: row.state || json.state || json.jobSiteState || '',
        zipcode: row.zipcode || json.zipcode || json.jobSiteZip || '',
        desc: row.jobDesc || row.desc || json.desc || '',
        qtype: row.qtype || json.qtype || 'Contract',
        salesAssoc: row.salesAssoc || json.salesAssoc || '',
        job_num: jobNum,
        jobNum,
        startDate: row.startDate || json.startDate || '',
        compDate: row.compDate || json.compDate || '',
        locked: Boolean(row.locked ?? json.locked),
        total: parseFloat(row.total || json.total) || 0,
        labor: parseFloat(row.labor || json.labor) || 0,
        mats: parseFloat(row.materials || json.mats) || 0,
        equip: parseFloat(row.equip || json.equip) || 0,
        hauling: parseFloat(row.hauling || json.hauling) || 0,
        travel: parseFloat(row.travel || json.travel) || 0,
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
        const fmtDate = (d) => {
          if (!d) return '';
          if (d instanceof Date) return d.toISOString().split('T')[0];
          return String(d).split('T')[0];
        };
        return {
          ...row,
          id: row.id + 1000000,
          qn,
          job_num: jobNum,
          jobNum,
          jobSite: row.job_site || row.jobSite || '',
          desc: row.description || row.desc || '',
          qtype: row.quote_type || row.qtype || 'Contract',
          salesAssoc: row.sales_assoc || row.salesAssoc || '',
          locked: Boolean(row.is_locked ?? row.locked),
          status: 'Won',
          date: fmtDate(row.month_closed) || fmtDate(row.start_date) || '',
          startDate: fmtDate(row.start_date) || '',
          compDate: fmtDate(row.end_date) || fmtDate(row.month_closed) || '',
          total: parseFloat(row.total) || 0,
          labor: row.total_expense ? (parseFloat(row.total_expense) / 0.6) : 0, // Faked to make gross margin math work
          mats: 0,
          equip: 0,
          hauling: 0,
          travel: 0,
          is_master_job: true
        };
      });
      jobs = [
        ...mappedQuotes,
        ...mappedMaster.filter(m => !existingKeys.has(m.qn || `master:${m.id}`)),
      ];
    }

    const rawUsers = await safeQuery('SELECT id, first_name, last_name, username, email, cell_phone, roles, is_disabled, user_number, created_at FROM users');
    const users = rawUsers.map(u => {
      let r = u.roles;
      if (typeof r === 'string') { try { r = JSON.parse(r); } catch(e) { r = []; } }
      const rolesArray = Array.isArray(r) ? r : [];
      return { ...u, roles: rolesArray, role: rolesArray[0] || 'user' };
    });
    const estimators = await safeQuery('SELECT * FROM estimators');
    const status = await safeQuery('SELECT * FROM status ORDER BY sort_order ASC');
    const leadsRaw = await safeQuery('SELECT q.*, c.name AS c_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.status = 1 ORDER BY q.id DESC');
    const leads = leadsRaw.map(l => ({ 
      ...l, 
      customer_name: l.c_name || l.customer_name || l.client,
      status_number: Number(l.status) || 1,
      estimator_id: l.sales_assoc,
      description: l.description || l.desc || ''
    }));

    // Map customers array back to the object structure expected by App.jsx
    const custData = {};
    customers.forEach(c => {
      custData[c.name] = {
        ...c,
        customer_num: c.customer_num,
        company_summary: c.company_summary || "",
        address1: c.street || "",
        street: c.street || "",
        city: c.city || "",
        state: c.state || "",
        zip: c.zip || "",
        billing_street: c.billing_street || c.street || "",
        billing_city: c.billing_city || c.city || "",
        billing_state: c.billing_state || c.state || "",
        billing_zip: c.billing_zip || c.zip || "",
        paymentTerms: c.payment_terms || "",
        accountNum: c.account_num || "",
        locations: sites.filter(s => s.customer_id === c.id).map(s => ({
          id: s.id,
          name: s.site_type === 'master_billing' ? 'HQ / Billing' : s.site_type,
          address: s.address1,
          city: s.city,
          state: s.state,
          zip: s.zip,
          notes: s.notes || ''
        })),
        contacts: contacts.filter(con => String(con.customer_id) === String(c.id) || String(con.customer_id) === String(c.customer_num)).map(con => ({
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

      leads,
      users,
      estimators,
      status
    });
  } catch (error) {
    console.error('[API] /api/data error:', error);
    // If the tables don't exist yet (e.g. after a failed restore wipe), return empty data
    // so the frontend can automatically trigger the DB re-initialization routine.
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ labor: [], equipment: [], customers: {}, jobs: [], leads: [], users: [], estimators: [], status: [] });
    }
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

// CURRENT USER PROFILE
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query(
      'SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, u.roles, u.is_disabled, u.avatar, u.user_number FROM users u WHERE u.id = ? LIMIT 1',
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    if (typeof user.roles === 'string') {
      try { user.roles = JSON.parse(user.roles); } catch(e) { user.roles = []; }
    }
    res.json(user);
  } catch (error) {
    console.error('[API] GET /api/me error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/me', authenticateToken, async (req, res) => {
  const { email, cell_phone, avatar, password, role } = req.body || {};
  try {
    await ensureUserProfileColumns();
    const [rows] = await db.query(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, COALESCE(u.roles, JSON_ARRAY()) AS roles, u.is_disabled, u.avatar FROM users u WHERE u.id = ? LIMIT 1`, [req.user.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const existing = rows[0];
    const nextAvatar = typeof avatar !== 'undefined' ? avatar : existing.avatar;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET email = ?, cell_phone = ?, avatar = ?, password_hash = ? WHERE id = ?',
        [email ?? existing.email, cell_phone ?? existing.cell_phone, nextAvatar, passwordHash, req.user.userId]
      );
    } else {
      await db.query(
        'UPDATE users SET email = ?, cell_phone = ?, avatar = ? WHERE id = ?',
        [email ?? existing.email, cell_phone ?? existing.cell_phone, nextAvatar, req.user.userId]
      );
    }

    const [updatedRows] = await db.query(
      'SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, COALESCE(u.roles, JSON_ARRAY()) AS roles, u.is_disabled, u.avatar, u.user_number FROM users u WHERE u.id = ? LIMIT 1',
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
  const r = req.user.roles || [];
  if (!r.includes('admin') && !r.includes('1')) {
    console.log('[AUTH] Denying admin access. Roles:', r, 'User:', req.user.username);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.get('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, roles, created_at FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { role, roles } = req.body;
  try {
    await db.query('UPDATE users SET roles = ? WHERE id = ?', [JSON.stringify(roles || [role]), req.params.id]);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const { username, password, role, roles } = req.body;
  if (!username || !password || (!role && !roles)) return res.status(400).json({ error: 'Username, password, and role required' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, password_hash, roles) VALUES (?, ?, ?)', [username, password_hash, JSON.stringify(roles || [role])]);
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
    const tableNames = rows.map(r => Object.values(r)[0]);
    
    // Get counts for each table
    const tableData = await Promise.all(tableNames.map(async (name) => {
      try {
        const [rows] = await db.query(`SELECT COUNT(*) as table_count FROM \`${name}\``);
        return { name, count: rows[0].table_count };
      } catch (err) {
        return { name, count: 0 };
      }
    }));
    res.json(tableData);
  } catch (error) {
    console.error('[API] SHOW TABLES error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});



// GET ALL USERS (Admin Only)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await ensureUserProfileColumns();
    const [users] = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, u.is_disabled, u.avatar, u.user_number, u.created_at,
        COALESCE(u.roles, JSON_ARRAY()) AS roles
      FROM users u
    `);
    
    const parsedUsers = users.map(user => {
      let r = user.roles;
      if (typeof r === 'string') { try { r = JSON.parse(r); } catch(e) { r = []; } }
      const rolesArray = Array.isArray(r) ? r : [];
      return { ...user, roles: rolesArray, role: rolesArray[0] || 'user' };
    });
    
    res.json(parsedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// CREATE USER (Admin Only)
app.post('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const { first_name, last_name, username, email, cell_phone, avatar, password, roles, role, is_disabled } = req.body;
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!isValidUsername(normalizedUsername)) {
    return res.status(400).json({ error: 'Username must be lowercase letters only, one word, max 16 characters, and no numbers.' });
  }
  
  try {
    await ensureUserProfileColumns();
    const [maxRes] = await db.query('SELECT MAX(CAST(user_number AS UNSIGNED)) AS max_num FROM users');
    let user_number = maxRes[0].max_num ? parseInt(maxRes[0].max_num, 10) + 1 : 100000;
    if (user_number < 100000) user_number = 100000;

    const passwordHash = await bcrypt.hash(password, 10);
     const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, username, email, cell_phone, avatar, password_hash, roles, user_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, passwordHash, JSON.stringify(roles && roles.length > 0 ? roles : (role ? [role] : ['user'])), String(user_number)]
    );
    if (is_disabled) {
      await db.query('UPDATE users SET is_disabled = 1 WHERE id = ?', [result.insertId]);
    }
    res.json({ id: result.insertId, first_name: first_name || '', last_name: last_name || '', username: normalizedUsername, email: email || '', cell_phone: cell_phone || '', avatar: avatar || null, roles: (roles && roles.length > 0 ? roles : (role ? [role] : ['user'])), is_disabled: !!is_disabled, user_number });
  } catch (error) {
    console.error('[API] POST /api/admin/users error:', error);
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
  const { first_name, last_name, username, email, cell_phone, avatar, password, roles, is_disabled } = req.body;
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
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, passwordHash, nextDisabled, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, nextDisabled, userId]
      );
    }

    if (roles && Array.isArray(roles)) {
      await db.query('UPDATE users SET roles = ? WHERE id = ?', [JSON.stringify(roles), userId]);
    }

    const [updated] = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, u.is_disabled, u.avatar, u.user_number, u.created_at,
        COALESCE(u.roles, JSON_ARRAY()) AS roles
      FROM users u WHERE u.id = ?
    `, [userId]);
    
    if (updated[0]) {
      updated[0].roles = typeof updated[0].roles === 'string' ? JSON.parse(updated[0].roles || '[]') : (updated[0].roles || []);
      updated[0].is_disabled = Number(updated[0].is_disabled) === 1;
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('[API] PUT /api/admin/users/:id error:', error);
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
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators', 'master_jobs', 'status', 'Quote_Status_History',  'in_review', 'role', 'sites', 'phi_config', 'company_info', 'user_auth_audit'];
  let table = req.params.table;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });

  try {
    const [cols] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
    let columnNames = cols.map(c => c.Field);

    // Custom reordering for specific tables
    if (table === 'status' && columnNames.includes('type') && columnNames.includes('name')) {
      const typeIdx = columnNames.indexOf('type');
      columnNames.splice(typeIdx, 1); // remove type from current position
      const nameIdx = columnNames.indexOf('name');
      columnNames.splice(nameIdx, 0, 'type'); // insert before name
    }

    const [idColumn] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'id'`);
    let query;
    if (table === 'sites') {
      query = `SELECT s.*, c.name AS customer_name FROM sites s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.id ASC`;
      if (!columnNames.includes('customer_name')) columnNames.push('customer_name');
    } else if (table === 'customers') {
      query = `SELECT * FROM customers ORDER BY id ASC`;
      if (columnNames.includes('customer_num')) {
        const idx = columnNames.indexOf('customer_num');
        columnNames.splice(idx, 1);
        columnNames.unshift('customer_num');
      }
    } else {
      query = idColumn.length
        ? `SELECT * FROM \`${table}\` ORDER BY id ASC` 
        : `SELECT * FROM \`${table}\``;
    }
    const [rows] = await db.query(query);
    res.json({ data: rows, columns: columnNames });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});
const triggerGeocodeUpdate = (siteId, address1, city, state, zip) => {
  const addrStr = `${address1 || ''}, ${city || ''}, ${state || ''} ${zip || ''}`.trim().replace(/, ,/g, ',').replace(/, $/g, '');
  if (!addrStr || addrStr.length < 5) return;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addrStr)}`;
  https.get(url, { headers: { 'User-Agent': 'RigPro-Geocoding-Hook/1.0' } }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.length > 0) {
          const geo = `${parsed[0].lat},${parsed[0].lon}`;
          db.query('UPDATE sites SET geocode = ? WHERE id = ?', [geo, siteId]).catch(()=>{});
        }
      } catch(e) {}
    });
  }).on('error', () => {});
};

// CREATE RECORD IN TABLE (Admin Only)
app.post('/api/admin/tables/:table', authenticateToken, authenticateAdmin, async (req, res) => {
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators', 'master_jobs', 'status', 'Quote_Status_History',  'in_review', 'role', 'sites', 'phi_config', 'company_info', 'user_auth_audit'];
  const table = req.params.table;
  const data = req.body;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });


  try {
    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    if (keys.length === 0) return res.status(400).json({ error: 'No data provided' });

    const values = keys.map(k => {
      let val = data[k];
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(val)) {
        val = new Date(val).toISOString().slice(0, 19).replace('T', ' ');
      }
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      if (val === '' && (k.includes('date') || k.includes('expires') || k.includes('time') || k === 'create' || k === 'update')) {
        return null;
      }
      return val;
    });

    const columns = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');

    const [result] = await db.query(`INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`, values);
    
    // Fetch the newly created row to return it
    const [newRow] = await db.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [result.insertId]);

    if (table === 'sites') {
       triggerGeocodeUpdate(result.insertId, data.address1, data.city, data.state, data.zip);
    }


    res.json(newRow[0]);
  } catch (error) {
    console.error(`[API] Table insert error (${table}):`, error);
    res.status(500).json({ error: 'Insert failed', details: error.message });
  }
});

// UPDATE RECORD IN TABLE (Admin or Estimator for leads)
app.put('/api/admin/tables/:table/:id', authenticateToken, (req, res, next) => { 
  const table = req.params.table;
  const roles = req.user.roles || [];

  authenticateAdmin(req, res, next);
}, async (req, res) => {
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators', 'master_jobs', 'status', 'Quote_Status_History',  'in_review', 'role', 'sites', 'phi_config', 'company_info', 'user_auth_audit'];
  const table = req.params.table;
  const id = req.params.id;
  const data = req.body;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });

  try {

    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    if (keys.length === 0) return res.json({ message: 'No change needed' });

    const values = keys.map(k => {
      let val = data[k];
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(val)) {
        val = new Date(val).toISOString().slice(0, 19).replace('T', ' ');
      }
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      if (val === '' && (k.includes('date') || k.includes('expires') || k.includes('time') || k === 'create' || k === 'update')) {
        return null;
      }
      if (table === 'admin_tasks' && k === 'subnotes' && val === '') {
        return '[]';
      }
      return val;
    });
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');

    const [result] = await db.query(`UPDATE \`${table}\` SET ${setClause} WHERE id = ?`, [...values, id]);

    if (table === 'sites') {
      db.query('SELECT address1, city, state, zip FROM sites WHERE id = ?', [id]).then(([r])=> {
        if (r.length > 0) triggerGeocodeUpdate(id, r[0].address1, r[0].city, r[0].state, r[0].zip);
      }).catch(()=>{});
    }

    if (interceptLeadAsQuote && leadRow) {
       let customerName = '';
       if (leadRow.customer_number) {
         const [custName] = await db.query('SELECT name FROM customers WHERE id = ?', [leadRow.customer_number]);
         if (custName.length > 0) customerName = custName[0].name;
       } else if (leadRow.first_name || leadRow.last_name) {
         customerName = `${leadRow.first_name || ''} ${leadRow.last_name || ''}`.trim();
       }

       const year = String(new Date().getFullYear());
       const [seqRows] = await db.query(
         `SELECT MAX(CAST(SUBSTRING_INDEX(job_num, '-', -1) AS UNSIGNED)) AS max_seq FROM quotes WHERE job_num REGEXP ?`,
         [`^J-${year}-[0-9]{3,}$`]
       );
       const nextSeq = Number(seqRows?.[0]?.max_seq || 0) + 1;
       const resolvedJobNum = `J-${year}-${String(nextSeq).padStart(3, '0')}`;

       const quoteDataStr = JSON.stringify({ 
           targetId: null, qn: '', client: customerName, 
           street: leadRow.street1 || '', city: leadRow.city || '', 
           state: leadRow.state || '', zipcode: leadRow.zip || '', 
           desc: leadRow.description || '', date: new Date().toISOString().split('T')[0], 
           status: 'Draft', qtype: '', salesAssoc: data.estimator_id 
       });

       const rowValues = [
         '', // quote_number
         leadRow.customer_number || null,
         customerName,
         leadRow.street1 || '', // job_site
         leadRow.street1 || '',
         leadRow.city || '',
         leadRow.state || '',
         leadRow.zip || '',
         leadRow.description || '',
         new Date().toISOString().split('T')[0],
         0, // status id
         '', // quote_type
         0, 0, 0, 0, 0, 0, 0,
         data.estimator_id,
         resolvedJobNum,
         null, null,
         0,
         'Auto-created from lead',
         quoteDataStr
       ];

       const [insertRes] = await db.query(
         'INSERT INTO quotes (quote_number, customer_id, customer_name, job_site, street, city, state, zipcode, description, date, status, quote_type, labor, equip, hauling, travel, materials, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked, notes, quote_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
         rowValues
       );

       await db.query('INSERT INTO Quote_Status_History (quote_id, status_name, changed_by, notes) VALUES (?, ?, ?, ?)', 
         [insertRes.insertId, 'Draft', req.user ? req.user.userId : null, 'Created from lead assignment']
       );
    }

    res.json({ success: true });
  } catch (error) {
    console.error(`[API] Table update error (${table}):`, error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
});

// BATCH DELETE RECORDS IN TABLE (Admin Only)
app.delete('/api/admin/tables/:table/batch', authenticateToken, authenticateAdmin, async (req, res) => {
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators', 'master_jobs', 'status', 'Quote_Status_History',  'in_review', 'role', 'sites', 'phi_config', 'company_info', 'user_auth_audit'];
  const table = req.params.table;
  const { ids } = req.body;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided for deletion' });

  try {
    const placeholders = ids.map(() => '?').join(',');
    await db.query(`DELETE FROM \`${table}\` WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error(`[API] Table batch delete error (${table}):`, error);
    res.status(500).json({ error: 'Batch delete failed', details: error.message });
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
  const { quotes, customers } = req.body;
  
  if (!quotes || !customers) return res.status(400).json({ error: 'Missing data for initialization' });

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
        'INSERT INTO customers (name, notes, address1, city, state, zip, website, industry, payment_terms, account_num, customer_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, passStr(c.notes), passStr(c.address1), passStr(c.city), passStr(c.state), passStr(c.zip), passStr(c.website), passStr(c.industry), passStr(c.paymentTerms), passStr(c.accountNum), passStr(c.accountNum)]
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
  // No longer setting headers for download since we only want to save to the server

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

        // Do not stream the file back to the client, just return success
        res.json({ success: true, message: 'Backup saved to server', filename });
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

// DOWNLOAD LOCAL BACKUP
app.get('/api/admin/backups/download/:filename', authenticateToken, authenticateAdmin, (req, res) => {
  const filename = req.params.filename;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const safePath = path.join(BACKUPS_DIR, path.basename(filename));
  if (!fs.existsSync(safePath)) return res.status(404).json({ error: 'Backup file not found' });

  res.download(safePath, filename, (err) => {
    if (err) console.error('[BACKUP DOWNLOAD] Error sending file to client:', err);
  });
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

// ADMIN TASKS & TODOS
app.get('/api/admin/tasks', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT a.*, u.first_name as creator_first_name, u.username as creator_username FROM admin_tasks a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC');
    res.json(tasks.map(t => {
      let subnotes = [];
      if (typeof t.subnotes === 'string' && t.subnotes.trim() !== '') {
        try { subnotes = JSON.parse(t.subnotes); } catch(e) { subnotes = []; }
      } else {
        subnotes = t.subnotes || [];
      }
      return { ...t, subnotes };
    }));
  } catch (error) {
    console.error('[API GET /api/admin/tasks error]', error);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

app.post('/api/admin/tasks', authenticateToken, authenticateAdmin, async (req, res) => {
  const { text, subnotes, assigned_to } = req.body;
  if (!text) return res.status(400).json({ error: 'Task text is required' });

  try {
    // Default to the logged-in user if assigned_to is omitted
    const assignee = assigned_to || req.user.userId;
    const [result] = await db.query('INSERT INTO admin_tasks (text, subnotes, assigned_to, created_by) VALUES (?, ?, ?, ?)', [text, JSON.stringify(subnotes || []), assignee, req.user.userId]);
    res.json({ id: result.insertId, text, done: false, subnotes: subnotes || [], assigned_to: assignee, created_by: req.user.userId });
  } catch (error) {
    console.error('[TASKS] Create error:', error);
    res.status(500).json({ error: 'Failed to create task: ' + error.message });
  }
});

app.patch('/api/admin/tasks/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { done, subnotes, text, assigned_to } = req.body;
  try {
    const fields = [];
    const values = [];
    if (done !== undefined) { fields.push('done = ?'); values.push(done); }
    if (subnotes !== undefined) { fields.push('subnotes = ?'); values.push(JSON.stringify(subnotes)); }
    if (text !== undefined) { fields.push('text = ?'); values.push(text); }
    if (assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(assigned_to); }
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

// ANY USER POST TASK
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { text, subnotes, assigned_to } = req.body;
  if (!text) return res.status(400).json({ error: 'Task text is required' });

  try {
    let assignee = req.user.userId;
    
    if (assigned_to && assigned_to !== req.user.userId) {
      if (((req.user.roles || []).includes('admin') || String(req.user.roles || '').includes('1'))) {
         assignee = assigned_to;
      } else {
         const [target] = await db.query('SELECT roles FROM users WHERE id = ?', [assigned_to]);
         if (target.length > 0 && typeof target[0].roles !== 'undefined') {
            const tr = typeof target[0].roles === 'string' ? JSON.parse(target[0].roles) : (target[0].roles || []);
            const ur = req.user.roles || [];
            if (tr.some(r => ur.includes(r))) {
              // Same role
            } else {
               return res.status(403).json({ error: 'You can only assign tasks to users with the same role.' });
            }
         }
      }
    }

    const [result] = await db.query('INSERT INTO admin_tasks (text, subnotes, assigned_to, created_by) VALUES (?, ?, ?, ?)', [text, JSON.stringify(subnotes || []), assignee, req.user.userId]);
    res.json({ id: result.insertId, text, done: false, subnotes: subnotes || [], assigned_to: assignee, created_by: req.user.userId });
  } catch (error) {
    console.error('[TASKS] Create error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.get('/api/tasks/my', authenticateToken, async (req, res) => {
  try {
    let queryArgs = [req.user.userId];
    let queryStr = 'SELECT a.*, u.first_name as creator_first_name, u.username as creator_username FROM admin_tasks a LEFT JOIN users u ON a.created_by = u.id WHERE a.assigned_to = ? ORDER BY a.created_at DESC';
    if ((req.user.roles || []).includes('admin')) {
      queryStr = 'SELECT a.*, u.first_name as creator_first_name, u.username as creator_username FROM admin_tasks a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC';
      queryArgs = [];
    }
    const [tasks] = await db.query(queryStr, queryArgs);
    res.json(tasks.map(t => {
      let subnotes = [];
      if (typeof t.subnotes === 'string' && t.subnotes.trim() !== '') {
        try { subnotes = JSON.parse(t.subnotes); } catch(e) { subnotes = []; }
      } else {
        subnotes = t.subnotes || [];
      }
      return { ...t, subnotes };
    }));
  } catch (error) {
    console.error('[API GET /api/tasks/my error]', error);
    res.status(500).json({ error: 'Failed to fetch my tasks', details: error.message });
  }
});

app.patch('/api/tasks/my/:id', authenticateToken, async (req, res) => {
  const { done, text, subnotes } = req.body;
  try {
    const fields = [];
    const values = [];
    if (done !== undefined) { fields.push('done = ?'); values.push(done); }
    if (text !== undefined) { fields.push('text = ?'); values.push(text); }
    if (subnotes !== undefined) { fields.push('subnotes = ?'); values.push(JSON.stringify(subnotes)); }
    
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    values.push(req.params.id);
    if ((req.user.roles || []).includes('admin')) {
      await db.query(`UPDATE admin_tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    } else {
      values.push(req.user.userId);
      await db.query(`UPDATE admin_tasks SET ${fields.join(', ')} WHERE id = ? AND assigned_to = ?`, values);
    }
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// CUSTOMER MANAGEMENT ENDPOINTS
// Get all customers
app.post('/api/customers/quick', authenticateToken, async (req, res) => {
  const { name, contact_name, contact_phone, contact_email } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Customer name is required' });

  const connection = await db.getConnection();
  try {
    const [existing] = await connection.query('SELECT id FROM customers WHERE name = ?', [name.trim()]);
    let custId = existing.length > 0 ? existing[0].id : null;

    if (!custId) {
      const [insRes] = await connection.query(
        'INSERT INTO customers (name, notes) VALUES (?, ?)',
        [name.trim(), 'Added via RFQ Modal']
      );
      custId = insRes.insertId;
    }

    if (contact_name) {
      await connection.query(
        'INSERT INTO customer_contacts (customer_id, name, title, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
        [custId, contact_name, '', contact_email || '', contact_phone || '', existing.length === 0]
      );
    }

    res.json({ success: true, customer_id: custId });
  } catch (error) {
    console.error('[API] /api/customers/quick error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

app.get('/api/admin/customers', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT c.*, 
             s.address1 as street, s.city, s.state, s.zip, s.address1 as address1
      FROM customers c
      LEFT JOIN sites s ON c.primary_site_id = s.id
    `);
    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Add a new customer
app.post('/api/admin/customers', authenticateToken, authenticateAdmin, async (req, res) => {
  const { name, notes, address1, street, city, state, zip, website, industry, payment_terms, account_num } = req.body;
  const streetVal = street || address1 || '';
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO customers (name, notes, billing_street, billing_city, billing_state, billing_zip, website, industry, payment_terms, account_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), notes || '', streetVal, city || '', state || '', zip || '', website || '', industry || '', payment_terms || '', account_num || '']
    );
    const custId = result.insertId;

    // Create primary site
    const [siteResult] = await db.query(
      'INSERT INTO sites (customer_id, site_type, address1, city, state, zip, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [custId, 'PrimaryHQ', streetVal, city || '', state || '', zip || '', 'Automatically created during customer registration']
    );
    triggerGeocodeUpdate(siteResult.insertId, streetVal, city, state, zip);
    
    // Link to customer
    await db.query('UPDATE customers SET primary_site_id = ? WHERE id = ?', [siteResult.insertId, custId]);

    const [newCustomer] = await db.query(`
      SELECT c.*, s.address1 as street, s.city, s.state, s.zip
      FROM customers c
      LEFT JOIN sites s ON c.primary_site_id = s.id
      WHERE c.id = ?
    `, [custId]);
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
  const { name, notes, address1, street, city, state, zip, website, industry, payment_terms, account_num } = req.body;
  const streetVal = street || address1 || '';
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
      'UPDATE customers SET name = ?, notes = ?, billing_street = ?, billing_city = ?, billing_state = ?, billing_zip = ?, website = ?, industry = ?, payment_terms = ?, account_num = ? WHERE id = ?',
      [name.trim(), notes || '', streetVal, city || '', state || '', zip || '', website || '', industry || '', payment_terms || '', account_num || '', customerId]
    );

    // Sync with sites table
    const [custRows] = await db.query('SELECT primary_site_id FROM customers WHERE id = ?', [customerId]);
    let primarySiteId = custRows[0]?.primary_site_id;

    if (!primarySiteId) {
      const [siteRes] = await db.query(
        'INSERT INTO sites (customer_id, site_type, address1, city, state, zip) VALUES (?, ?, ?, ?, ?, ?)',
        [customerId, 'PrimaryHQ', streetVal, city || '', state || '', zip || '']
      );
      primarySiteId = siteRes.insertId;
      await db.query('UPDATE customers SET primary_site_id = ? WHERE id = ?', [primarySiteId, customerId]);
      triggerGeocodeUpdate(primarySiteId, streetVal, city, state, zip);
    } else {
      await db.query(
        'UPDATE sites SET address1 = ?, city = ?, state = ?, zip = ? WHERE id = ?',
        [streetVal, city || '', state || '', zip || '', primarySiteId]
      );
      triggerGeocodeUpdate(primarySiteId, streetVal, city, state, zip);
    }
    
    const [updated] = await db.query(`
      SELECT c.*, s.address1 as street, s.city, s.state, s.zip
      FROM customers c
      LEFT JOIN sites s ON c.primary_site_id = s.id
      WHERE c.id = ?
    `, [customerId]);
    
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

  async function ensurePhiConfigTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS phi_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT DEFAULT 1,
        win_base DECIMAL(5,2) DEFAULT 30,
        vol_base INT DEFAULT 10,
        margin_base DECIMAL(5,2) DEFAULT 28,
        stale_pct_base DECIMAL(5,2) DEFAULT 15,
        response_days_base INT DEFAULT 4,
        win_ind DECIMAL(5,2) DEFAULT 30,
        vol_ind INT DEFAULT 30,
        margin_ind DECIMAL(5,2) DEFAULT 28,
        stale_pct_ind DECIMAL(5,2) DEFAULT 20,
        response_days_ind INT DEFAULT 5,
        blend_company INT DEFAULT 70,
        blend_industry INT DEFAULT 30,
        w_aging INT DEFAULT 30,
        w_winrate INT DEFAULT 25,
        w_volume INT DEFAULT 20,
        w_margin INT DEFAULT 15,
        w_speed INT DEFAULT 10,
        band_atrisk INT DEFAULT 40,
        band_fair INT DEFAULT 60,
        band_good INT DEFAULT 75,
        band_excellent INT DEFAULT 90,
        stale_days INT DEFAULT 14,
        response_flag_hrs INT DEFAULT 48,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT
      )
    `);
    await db.query('INSERT IGNORE INTO phi_config (id, company_id) VALUES (1, 1)');
  }

  // GET PHI CONFIG
  app.get('/api/admin/phi-config', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
      await ensurePhiConfigTable();
      const [rows] = await db.query('SELECT * FROM phi_config LIMIT 1');
      res.json(rows[0] || {});
    } catch (error) {
      console.error('Failed to fetch phi config:', error);
      res.status(500).json({ error: 'Failed to fetch phi config' });
    }
  });

  // UPDATE PHI CONFIG
  app.put('/api/admin/phi-config', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
      await ensurePhiConfigTable();
      const data = req.body;
      
      // Validation rules according to Section 8.2
      if (data.blend_company + data.blend_industry !== 100) {
        return res.status(400).json({ error: 'blend_company + blend_industry must equal 100' });
      }
      if (data.w_aging + data.w_winrate + data.w_volume + data.w_margin + data.w_speed !== 100) {
        return res.status(400).json({ error: 'Component weights must sum to 100' });
      }
      if (!(data.band_atrisk < data.band_fair && data.band_fair < data.band_good && data.band_good < data.band_excellent)) {
        return res.status(400).json({ error: 'Score bands must be ascending: At Risk < Fair < Good < Excellent' });
      }

      const keys = Object.keys(data).filter(k => !['id', 'company_id', 'updated_at', 'updated_by'].includes(k));
      if (keys.length === 0) return res.json({ message: 'No changes provided' });

      keys.push('updated_by');
      const values = keys.filter(k => k !== 'updated_by').map(k => data[k]);
      values.push(req.user.userId);

      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
      await db.query(`UPDATE phi_config SET ${setClause} WHERE id = 1`, values);

      const [updated] = await db.query('SELECT * FROM phi_config LIMIT 1');
      res.json(updated[0]);
    } catch (error) {
      console.error('Failed to update phi config:', error);
      res.status(500).json({ error: 'Failed to update phi config' });
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

async function ensureLeadsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description TEXT,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      customer_id INT,
      customer_name VARCHAR(255) DEFAULT '',
      status_number INT DEFAULT 1,
      first_name VARCHAR(100) DEFAULT '',
      last_name VARCHAR(100) DEFAULT '',
      contact_phone VARCHAR(50) DEFAULT '',
      contact_email VARCHAR(100) DEFAULT '',
      street VARCHAR(255) DEFAULT '',
      city VARCHAR(100) DEFAULT '',
      state VARCHAR(50) DEFAULT '',
      zipcode VARCHAR(20) DEFAULT '',
      site_type VARCHAR(50) DEFAULT 'master_billing',
      estimator_id VARCHAR(100) DEFAULT '',
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  // Migration for existing tables
  try {
    const [leadsCols] = await db.query('SHOW COLUMNS FROM leads');
    const leadsColNames = leadsCols.map(c => c.Field);

    const checkAndAdd = async (colName, definition, after) => {
      if (!leadsColNames.includes(colName)) {
        await db.query(`ALTER TABLE leads ADD COLUMN ${colName} ${definition} ${after ? `AFTER ${after}` : ''}`);
        console.log(`[Schema] Added ${colName} column to leads`);
        return true;
      }
      return false;
    };

    if (leadsColNames.includes('company_name') && !leadsColNames.includes('customer_name')) {
      await db.query('ALTER TABLE leads CHANGE COLUMN company_name customer_name VARCHAR(255) DEFAULT ""');
      console.log('[Schema] Renamed leads.company_name to customer_name');
    }
    if (leadsColNames.includes('customer_number') && !leadsColNames.includes('customer_id')) {
      await db.query('ALTER TABLE leads CHANGE COLUMN customer_number customer_id INT');
      console.log('[Schema] Renamed leads.customer_number to customer_id');
    }

    await checkAndAdd('customer_name', 'VARCHAR(255) DEFAULT ""', 'customer_id');
    await checkAndAdd('status_number', 'INT DEFAULT 1', 'customer_name');
    await checkAndAdd('first_name', 'VARCHAR(100) DEFAULT ""', 'status_number');
    await checkAndAdd('last_name', 'VARCHAR(100) DEFAULT ""', 'first_name');
    await checkAndAdd('contact_phone', 'VARCHAR(50) DEFAULT ""', 'last_name');
    await checkAndAdd('contact_email', 'VARCHAR(100) DEFAULT ""', 'contact_phone');
    await checkAndAdd('street', 'VARCHAR(255) DEFAULT ""', 'contact_email');
    await checkAndAdd('city', 'VARCHAR(100) DEFAULT ""', 'street');
    await checkAndAdd('state', 'VARCHAR(50) DEFAULT ""', 'city');
    await checkAndAdd('zipcode', 'VARCHAR(20) DEFAULT ""', 'state');
    await checkAndAdd('site_type', 'VARCHAR(50) DEFAULT "master_billing"', 'zipcode');
    await checkAndAdd('estimator_id', 'VARCHAR(100) DEFAULT ""', 'site_type');

    if (leadsColNames.includes('street1') && !leadsColNames.includes('street')) {
      await db.query('ALTER TABLE leads CHANGE COLUMN street1 street VARCHAR(255) DEFAULT ""');
      console.log('[Schema] Renamed leads.street1 to street');
    }
    if (leadsColNames.includes('zip') && !leadsColNames.includes('zipcode')) {
      await db.query('ALTER TABLE leads CHANGE COLUMN zip zipcode VARCHAR(20) DEFAULT ""');
      console.log('[Schema] Renamed leads.zip to zipcode');
    }
  } catch (e) {
    console.warn('[Schema] leads column check:', e.message);
  }
};

// Ensure every managed table has a `description` column.
async function ensureDescriptionColumns() {
  const tables = [
    'users', 'admin_tasks', 'customers', 'customer_contacts', 'base_labor',
    'equipment', 'estimators', 'status', 'Quote_Status_History', 'sites',
    'company_info', 'user_auth_audit', 'phi_config', 'in_review', 'master_jobs'
  ];
  for (const table of tables) {
    try {
      const [cols] = await db.query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'description'`, [table]);
      if (cols.length === 0) {
        await db.query(`ALTER TABLE \`${table}\` ADD COLUMN description TEXT`);
        console.log(`[Schema] Added description column to ${table}`);
      }
    } catch (e) {
      // Table might not exist yet – skip silently
      if (e.code !== 'ER_NO_SUCH_TABLE') {
        console.warn(`[Schema] Could not add description to ${table}:`, e.message);
      }
    }
  }
};

async function ensureSitesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      site_type VARCHAR(50),
      address1 VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(20),
      geocode VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);
};

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
    await ensureSitesTable();
    await ensureLeadsTable();
    await ensureDescriptionColumns();
    const hash = await bcrypt.hash('pass', 10);
    await db.query(
      `INSERT INTO users (first_name, last_name, username, email, cell_phone, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE username = username`,
      ['Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', hash]
    );
    await db.query(`UPDATE users SET roles = JSON_ARRAY('admin') WHERE username = 'scott'`);
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

app.post('/api/quotes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const quote = req.body;

  if (!quote) {
    return res.status(400).json({ error: 'Invalid quote data' });
  }

  const connection = await db.getConnection();
  try {
    const safeId = Number(id);
    let targetId = null;
    let oldStatus = null;

    // Only trust route id if it fits INT range used by quotes.id
    if (Number.isInteger(safeId) && safeId > 0 && safeId <= 2147483647) {
      const [existingById] = await connection.query('SELECT id, status FROM quotes WHERE id = ?', [safeId]);
      if (existingById.length > 0) {
        targetId = existingById[0].id;
        oldStatus = existingById[0].status;
      }
    }

    // Fallback: resolve by quote number so client-side timestamp ids can still update correctly
    if (!targetId && quote.qn) {
      const [existingByQn] = await connection.query(
        'SELECT id, status FROM quotes WHERE quote_number = ? ORDER BY id DESC LIMIT 1',
        [quote.qn]
      );
      if (existingByQn.length > 0) {
        targetId = existingByQn[0].id;
        oldStatus = existingByQn[0].status;
      }
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
    let custId = null;
    if (customerName) {
      const [existingCustomer] = await connection.query('SELECT id FROM customers WHERE name = ? LIMIT 1', [customerName]);
      if (existingCustomer.length === 0) {
        // Customers table no longer holds address fields natively due to normalization
        const [insertedCust] = await connection.query(
          'INSERT INTO customers (name, notes) VALUES (?, ?)',
          [customerName, 'Auto-created from quote save']
        );
        custId = insertedCust.insertId;

        // Auto-create initial master site containing the address payload
        const [insertedSite] = await connection.query(
          'INSERT INTO sites (customer_id, site_type, address1, city, state, zip) VALUES (?, ?, ?, ?, ?, ?)',
          [custId, 'master_billing', String(quote.street || '').trim(), String(quote.city || '').trim(), String(quote.state || '').trim(), String(quote.zipcode || '').trim()]
        );
        
        // Link primary site
        await connection.query('UPDATE customers SET primary_site_id = ? WHERE id = ?', [insertedSite.insertId, custId]);
      } else {
        custId = existingCustomer[0].id;
      }
    }

    // Resolve status name to ID if needed
    let resolvedStatusId = quote.status;
    if (isNaN(resolvedStatusId)) {
      const [statusRow] = await connection.query('SELECT id FROM status WHERE name = ?', [quote.status]);
      if (statusRow.length > 0) {
        resolvedStatusId = statusRow[0].id;
      } else {
         // Default fallback or keep as is if it's already an ID
         resolvedStatusId = (quote.status === 'Draft' ? 0 : (quote.status_id || null));
      }
    }

    const formatDate = (val) => {
      if (!val) return null;
      if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
      return val;
    };

    const rowValues = [
      quote.qn || '',
      custId,
      customerName,
      quote.jobSite || '',
      quote.street || '',
      quote.city || '',
      quote.state || '',
      quote.zipcode || '',
      quote.desc || '',
      formatDate(quote.date),
      resolvedStatusId,
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
      formatDate(quote.startDate),
      formatDate(quote.compDate),
      quote.locked ? 1 : 0,
      quote.notes || '',
      JSON.stringify(quote)
    ];

    let savedId = targetId;
    if (targetId) {
      await connection.query(
        'UPDATE quotes SET quote_number=?, customer_id=?, customer_name=?, job_site=?, street=?, city=?, state=?, zipcode=?, description=?, date=?, status=?, quote_type=?, labor=?, equip=?, hauling=?, travel=?, materials=?, total=?, markup=?, sales_assoc=?, job_num=?, start_date=?, comp_date=?, is_locked=?, notes=?, quote_data=? WHERE id=?',
        [...rowValues, targetId]
      );
      if (oldStatus !== (quote.status || 'Draft')) {
        await connection.query(
          'INSERT INTO Quote_Status_History (quote_id, status_name, changed_by, notes) VALUES (?, ?, ?, ?)',
          [targetId, quote.status || 'Draft', req.user ? req.user.id || req.user.userId : null, 'Status updated via Quote form']
        );
      }
    } else {
      const [insertResult] = await connection.query(
        'INSERT INTO quotes (quote_number, customer_id, customer_name, job_site, street, city, state, zipcode, description, date, status, quote_type, labor, equip, hauling, travel, materials, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked, notes, quote_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        rowValues
      );
      savedId = insertResult.insertId;
      await connection.query(
        'INSERT INTO Quote_Status_History (quote_id, status_name, changed_by, notes) VALUES (?, ?, ?, ?)',
        [savedId, quote.status || 'Draft', req.user ? req.user.id || req.user.userId : null, 'Initial quote creation']
      );
    }

    connection.release();
    res.json({ success: true, id: savedId });
  } catch (error) {
    connection.release();
    console.error('Error saving quote:', error);
    res.status(500).json({ error: 'Failed to save quote', details: error.message });
  }
});

app.get('/api/quotes/:id/history', authenticateToken, async (req, res) => {
  try {
    const quoteId = Number(req.params.id);
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const [historyInfo] = await db.query(
      `SELECT h.id, h.status_name, h.changed_at, h.notes, u.first_name, u.last_name 
       FROM Quote_Status_History h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.quote_id = ?
       ORDER BY h.changed_at ASC`,
      [quoteId]
    );
    res.json(historyInfo);
  } catch (err) {
    console.error('Failed to fetch quote history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initAdmin();
});
