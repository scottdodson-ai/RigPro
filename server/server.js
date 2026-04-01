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
    const [users] = await db.query('SELECT id, username, email, role, created_at FROM users');
    const [estimators] = await db.query('SELECT * FROM estimators');

    // Map customers array back to the object structure expected by App.jsx
    const custData = {};
    customers.forEach(c => {
      custData[c.name] = {
        ...c,
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

    if (Object.keys(custData).length > 0) {
      const sample = Object.values(custData)[0];
      console.log('[API/DATA] Raw row keys:', Object.keys(sample));
      console.log('[API/DATA] Sample customer mapping (with HQ location):', sample);
    }

    res.json({
      labor,
      equipment,
      customers: custData,
      quotes,
      rfqs,
      users,
      estimators
    });
  } catch (error) {
    console.error('[API/DATA] Error:', error);
    // If the tables don't exist yet (e.g. after a failed restore wipe), return empty data
    // so the frontend can automatically trigger the DB re-initialization routine.
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ labor: [], equipment: [], customers: {}, quotes: [], rfqs: [], users: [] });
    }
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
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
  const allowedTables = ['users', 'admin_tasks', 'quotes', 'rfqs', 'customers', 'customer_contacts', 'base_labor', 'equipment', 'estimators'];
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
    // 0. Auto-recover tables if they are missing
    try {
      const initSqlPath = path.join(__dirname, '..', 'db', 'init.sql');
      if (fs.existsSync(initSqlPath)) {
        const schema = fs.readFileSync(initSqlPath, 'utf8');
        // Simple heuristic to remove empty statements so we avoid "Query was empty" errors
        const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of statements) {
          try {
            await connection.query(stmt);
          } catch (stmtErr) {
            // Ignore errors like ER_DUP_ENTRY so remainder of DB structures still execute
          }
        }
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

  const dumpCommand = `mysqldump --skip-ssl -h ${host} -u ${user} ${database}`;
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
app.post('/api/admin/restore', authenticateToken, authenticateAdmin, async (req, res) => {
  const sql = req.body;
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'No SQL content provided' });

  console.log('[RESTORE] Starting native database restoration...');
  
  try {
    // Ensure the connection pool allows multiple statements if it doesn't already
    const restorePool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password123',
      database: process.env.DB_NAME || 'rigpro',
      multipleStatements: true
    });

    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await restorePool.query(stmt);
    }
    await restorePool.end();

    console.log(`[RESTORE] Native restoration completed successfully.`);
    res.json({ message: 'Database restored successfully' });
  } catch (err) {
    console.error('[RESTORE] Native mysql2 fail:', err);
    res.status(500).json({ error: 'Data restoration error: ' + err.message });
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

// RESTORE FROM LOCAL BACKUP
app.post('/api/admin/restore-local', authenticateToken, authenticateAdmin, async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const safePath = path.join(BACKUPS_DIR, path.basename(filename));
  if (!fs.existsSync(safePath)) return res.status(404).json({ error: 'Backup file not found' });

  console.log(`[RESTORE] Restoring native local file: ${filename}`);

  try {
    const restorePool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password123',
      database: process.env.DB_NAME || 'rigpro',
      multipleStatements: true
    });

    const script = fs.readFileSync(safePath, 'utf8');
    const statements = script.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await restorePool.query(stmt);
    }
    await restorePool.end();

    console.log('[RESTORE] Database native restore successfully');
    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('[RESTORE] Native Error:', error);
    res.status(500).json({ error: 'Data restoration error: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initAdmin();
});
