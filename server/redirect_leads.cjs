
const fs = require('fs');
const path = 'server/server.js';
let content = fs.readFileSync(path, 'utf8');

// Helper to update table and leadsFilter variable
const tableRedirect = "let table = req.params.table; let leadsFilter = ''; if (table === 'leads') { table = 'quotes'; leadsFilter = ' WHERE status = 1'; }";

// 1. Update GET /api/data leadsRaw
const oldLeadsRaw = "const leadsRaw = await safeQuery('SELECT l.*, c.name AS c_name FROM leads l LEFT JOIN customers c ON l.customer_id = c.id WHERE l.status_number != 2 ORDER BY l.id DESC');";
const newLeadsRaw = "const leadsRaw = await safeQuery('SELECT q.*, c.name AS c_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.status = 1 ORDER BY q.id DESC');";
content = content.replace(oldLeadsRaw, newLeadsRaw);

// 2. Update GET Handler (Line 854)
content = content.replace("const table = req.params.table;", tableRedirect);
content = content.replace(/await db\.query\(`SHOW COLUMNS FROM \\`\$\{table\}\\`\(.*?\)`\)/g, "await db.query(`SHOW COLUMNS FROM \\`\${table}\\``)"); // Simplify for my match
content = content.replace("`SELECT * FROM \\`${table}\\` ORDER BY id ASC`", "`SELECT * FROM \\`${table}\\` \${leadsFilter} ORDER BY id ASC` ");
content = content.replace("`SELECT * FROM \\`${table}\\``", "`SELECT * FROM \\`${table}\\` \${leadsFilter}`");

// 3. Update POST Handler (Line 915)
// We need to inject the redirect AND set status=1 if it was a lead
const postRedirect = "let table = req.params.table; if (table === 'leads') { table = 'quotes'; data.status = 1; if(!data.quote_number) data.quote_number = ''; }";
content = content.replace("const table = req.params.table;", postRedirect);

// 4. Update PUT Handler (Find it by param pattern)
content = content.replace(
  "app.put('/api/admin/tables/:table/:id', authenticateToken, (req, res, next) => {",
  "app.put('/api/admin/tables/:table/:id', authenticateToken, (req, res, next) => { if (req.params.table === 'leads') req.params.table = 'quotes';"
);

// 5. Update DELETE Handlers
content = content.replace(
  "app.delete('/api/admin/tables/:table/:id', authenticateToken, (req, res, next) => {",
  "app.delete('/api/admin/tables/:table/:id', authenticateToken, (req, res, next) => { if (req.params.table === 'leads') req.params.table = 'quotes';"
);
content = content.replace(
  "app.delete('/api/admin/tables/:table/batch', authenticateToken, async (req, res) => {",
  "app.delete('/api/admin/tables/:table/batch', authenticateToken, async (req, res) => { if (req.params.table === 'leads') req.params.table = 'quotes';"
);

fs.writeFileSync(path, content);
console.log('Successfully redirected Leads table to Quotes table in server.js');
