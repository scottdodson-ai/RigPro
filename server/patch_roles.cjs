const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Fix login
code = code.replace(
  "'SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar, password_hash, user_number FROM users WHERE username = ?'",
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.password_hash, u.user_number FROM users u LEFT JOIN role r ON u.role = r.id WHERE u.username = ?`"
);

// 2. Fix /api/me where role is loaded
code = code.replace(
  "'SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar FROM users WHERE id = ? LIMIT 1'",
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar FROM users u LEFT JOIN role r ON u.role = r.id WHERE u.id = ? LIMIT 1`"
);

// 3. Fix Generic Table Fetch logic for 'users'
code = code.replace(
  "query = `SELECT * FROM \\`${table}\\` ORDER BY id ASC`;",
  "query = table === 'users' ? `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.password_hash, u.user_number, u.created_at, u.reset_token, u.reset_token_expires FROM users u LEFT JOIN role r ON u.role = r.id ORDER BY u.id ASC` : `SELECT * FROM \\`${table}\\` ORDER BY id ASC`;"
);

// Generic table fetch logic for DESC scenario:
code = code.replace(
  "query = `SELECT * FROM \\`${table}\\` ORDER BY id DESC`;",
  "query = table === 'users' ? `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.password_hash, u.user_number, u.created_at, u.reset_token, u.reset_token_expires FROM users u LEFT JOIN role r ON u.role = r.id ORDER BY u.id DESC` : `SELECT * FROM \\`${table}\\` ORDER BY id DESC`;"
);

// 4. Update Admin Users Fetch (Line 686)
code = code.replace(
  "'SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar, user_number, created_at FROM users'",
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.user_number, u.created_at FROM users u LEFT JOIN role r ON u.role = r.id`"
);

// 5. Update /api/admin/users/:id Fetch (Line 547 & 582)
code = code.replace(
  /SELECT id, first_name, last_name, username, email, cell_phone, role, is_disabled, avatar, user_number FROM users WHERE id = \?/g,
  "SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.user_number FROM users u LEFT JOIN role r ON u.role = r.id WHERE u.id = ?"
);

// 6. Fix Update User (PUT /api/admin/users/:id) converting string role to ID via subquery
code = code.replace(
  /UPDATE users SET email = \?, cell_phone = \?, avatar = \?, role = \?, password_hash = \? WHERE id = \?/g,
  "UPDATE users SET email = ?, cell_phone = ?, avatar = ?, role = (SELECT id FROM role WHERE name = ? LIMIT 1), password_hash = ? WHERE id = ?"
);
code = code.replace(
  /UPDATE users SET email = \?, cell_phone = \?, avatar = \?, role = \? WHERE id = \?/g,
  "UPDATE users SET email = ?, cell_phone = ?, avatar = ?, role = (SELECT id FROM role WHERE name = ? LIMIT 1) WHERE id = ?"
);

// Fix other update with all fields (line 762)
code = code.replace(
  /UPDATE users SET first_name = \?, last_name = \?, username = \?, email = \?, cell_phone = \?, avatar = \?, password_hash = \?, role = \?, is_disabled = \? WHERE id = \?/g,
  "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, role = (SELECT id FROM role WHERE name = ? LIMIT 1), is_disabled = ? WHERE id = ?"
);
code = code.replace(
  /UPDATE users SET first_name = \?, last_name = \?, username = \?, email = \?, cell_phone = \?, avatar = \?, role = \?, is_disabled = \? WHERE id = \?/g,
  "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, role = (SELECT id FROM role WHERE name = ? LIMIT 1), is_disabled = ? WHERE id = ?"
);

// Generate new User (POST /api/admin/users)
code = code.replace(
  /INSERT INTO users \(first_name, last_name, username, email, cell_phone, avatar, password_hash, role, user_number\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?\)/g,
  "INSERT INTO users (first_name, last_name, username, email, cell_phone, avatar, password_hash, role, user_number) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM role WHERE name = ? LIMIT 1), ?)"
);

// Table Generic UPDATE endpoint wrapper logic override:
// Put /api/admin/tables/:table/:id receives `role` from generic UI data browser
const tablePutMatch = "const query = `UPDATE \\`${table}\\` SET ${fields.join(', ')} WHERE id = ?`;";
const tablePutReplace = `
    let query = \`UPDATE \\\`\${table}\\\` SET \${fields.join(', ')} WHERE id = ?\`;
    if (table === 'users') {
       const mappedFields = fields.map(f => f.startsWith('role =') ? 'role = (SELECT id FROM role WHERE name = ? LIMIT 1)' : f);
       query = \`UPDATE \\\`\${table}\\\` SET \${mappedFields.join(', ')} WHERE id = ?\`;
    }
`;
code = code.replace(tablePutMatch, tablePutReplace);

fs.writeFileSync(serverFile, code);
console.log('patched');
