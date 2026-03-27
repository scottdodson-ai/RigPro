import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/sql', limit: '50mb' }));

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
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, email: user.email } });
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
    const [contacts] = await db.query('SELECT * FROM customer_contacts');
    const [quotes] = await db.query('SELECT *, quote_number as qn, customer_name as client, is_locked as locked FROM quotes');
    const [rfqs] = await db.query('SELECT *, rfq_number as rn FROM rfqs');

    // Map customers array back to the object structure expected by App.jsx
    const custData = {};
    customers.forEach(c => {
      custData[c.name] = {
        ...c,
        billingAddr: c.billing_address,
        paymentTerms: c.payment_terms,
        accountNum: c.account_num,
        contacts: contacts.filter(con => con.customer_id === c.id).map(con => ({
          ...con,
          primary: !!con.is_primary
        }))
      };
    });

    res.json({
      labor,
      equipment,
      customers: custData,
      quotes,
      rfqs
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

app.get('/api/admin/tables/:table', authenticateToken, authenticateAdmin, async (req, res) => {
  const table = req.params.table;
  // Simple check to prevent basic SQL injection on table name
  if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Invalid table name' });

  try {
    const [rows] = await db.query(`SELECT * FROM ${table} LIMIT 500`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

// GET ALL USERS (Admin Only)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, email, role, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// CREATE USER (Admin Only)
app.post('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role || 'user']
    );
    res.json({ id: result.insertId, username, email, role: role || 'user' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE USER (Admin Only)
app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET RAW TABLE DATA (Admin Only) - For the Data Browser
app.get('/api/admin/tables/:table', authenticateToken, authenticateAdmin, async (req, res) => {
  const allowedTables = ['users', 'quotes', 'rfqs', 'customers', 'customer_contacts', 'base_labor', 'equipment'];
  const table = req.params.table;

  if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid or restricted table access' });

  try {
    const [rows] = await db.query(`SELECT * FROM ${table} LIMIT 100`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

// BULK INITIALIZATION (Admin Only) - Seeds DB from frontend data
app.post('/api/admin/init', authenticateToken, authenticateAdmin, async (req, res) => {
  const { quotes, rfqs, customers } = req.body;
  
  if (!quotes || !rfqs || !customers) return res.status(400).json({ error: 'Missing data for initialization' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Clear existing data to avoid conflicts during one-time init
    await connection.query('DELETE FROM quotes');
    await connection.query('DELETE FROM rfqs');
    // Note: customers might have related contacts, careful with deletion
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DELETE FROM customers');
    await connection.query('DELETE FROM customer_contacts');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Insert Customers
    for (const name in customers) {
      const c = customers[name];
      const [result] = await connection.query(
        'INSERT INTO customers (name, notes, billing_address, website, industry, payment_terms, account_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, c.notes, c.billingAddr, c.website, c.industry, c.paymentTerms, c.accountNum]
      );
      const customerId = result.insertId;
      
      if (c.contacts) {
        for (const contact of c.contacts) {
          await connection.query(
            'INSERT INTO customer_contacts (customer_id, name, title, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
            [customerId, contact.name, contact.title, contact.email, contact.phone, contact.primary]
          );
        }
      }
    }

    // 2. Insert Quotes
    for (const q of quotes) {
      await connection.query(
        'INSERT INTO quotes (quote_number, customer_name, job_site, description, date, status, quote_type, labor, equip, hauling, travel, materials, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [q.qn, q.client, q.jobSite, q.desc, q.date, q.status, q.qtype, q.labor||0, q.equip||0, q.hauling||0, q.travel||0, q.mats||0, q.total||0, q.markup||0, q.salesAssoc, q.jobNum, q.startDate || null, q.compDate || null, q.locked]
      );
    }

    // 3. Insert RFQs
    for (const r of rfqs) {
      await connection.query(
        'INSERT INTO rfqs (rfq_number, company, requester, email, phone, job_site, description, notes, date, status, sales_assoc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.rn, r.company, r.requester, r.email, r.phone, r.jobSite, r.desc, r.notes, r.date, r.status, r.salesAssoc]
      );
    }

    await connection.commit();
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database' });
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

  const dumpCommand = `mysqldump -h ${host} -u ${user} ${database}`;
  const backupEnv = { ...process.env, MYSQL_PWD: password };
  const backupPath = path.join(BACKUPS_DIR, filename);

  const child = exec(`${dumpCommand} > ${backupPath}`, { env: backupEnv });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[BACKUP] mysqldump exited with code ${code}`);
      if (!res.headersSent) res.status(500).json({ error: 'Backup process failed' });
    } else {
      console.log(`[BACKUP] Backup saved to disk: ${filename}`);
      
      // ROTATION: Keep latest 3 only
      try {
        const files = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.endsWith('.sql'))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 3) {
          files.slice(3).forEach(f => {
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

// RESTORE DATABASE (Admin Only) - Takes a .sql file as raw text
app.post('/api/admin/restore', authenticateToken, authenticateAdmin, async (req, res) => {
  const sql = req.body;
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'No SQL content provided' });

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'password123';
  const database = process.env.DB_NAME || 'rigpro';

  console.log('[RESTORE] Starting database restoration...');
  
  const restoreCommand = `mysql -h ${host} -u ${user} ${database}`;
  const restoreEnv = { ...process.env, MYSQL_PWD: password };

  const child = exec(restoreCommand, { env: restoreEnv });

  child.stdin.write(sql);
  child.stdin.end();

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[RESTORE] mysql exited with code ${code}`);
      if (!res.headersSent) res.status(500).json({ error: 'Database restoration failed' });
    } else {
      console.log(`[RESTORE] Restoration completed successfully.`);
      res.json({ message: 'Database restored successfully' });
    }
  });

  child.on('error', (err) => {
    console.error('[RESTORE] Failed to start mysql:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal restoration error' });
  });
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
  try {
    const [result] = await db.query('INSERT INTO admin_tasks (text, subnotes) VALUES (?, ?)', [text, JSON.stringify(subnotes || [])]);
    res.json({ id: result.insertId, text, done: false, subnotes: subnotes || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
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
