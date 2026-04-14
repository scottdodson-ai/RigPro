const fs = require('fs');

let svr = fs.readFileSync('server.js', 'utf8');

// The failed query uses:
//INSERT INTO users (first_name, last_name, username, email, cell_phone, password_hash, role)
//       VALUES ('Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', '$2b$10$zaHbtKqrtV/xRcUSz.HAQOZqb7lO0lcGoMVzHpcCCyeDfaZMXa7bu', 'admin')
//       ON DUPLICATE KEY UPDATE role = 'admin'

svr = svr.replace(
  "INSERT INTO users (first_name, last_name, username, email, cell_phone, password_hash, role)",
  "INSERT IGNORE INTO users (first_name, last_name, username, email, cell_phone, password_hash)"
);

svr = svr.replace(
  "VALUES ('Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', '$2b$10$zaHbtKqrtV/xRcUSz.HAQOZqb7lO0lcGoMVzHpcCCyeDfaZMXa7bu', 'admin')",
  "VALUES ('Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', '$2b$10$zaHbtKqrtV/xRcUSz.HAQOZqb7lO0lcGoMVzHpcCCyeDfaZMXa7bu')"
);

svr = svr.replace(
  "ON DUPLICATE KEY UPDATE role = 'admin'",
  ""
);

// After db.query() that runs the above insert, let's explicitly inject the role mapping into user_roles
// The original code was likely:
// await db.query(`INSERT INTO users ... ON DUPLICATE KEY UPDATE role = 'admin'`);

svr = svr.replace(
  "await db.query(`INSERT IGNORE INTO users (first_name, last_name, username, email, cell_phone, password_hash)\n       VALUES ('Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', '$2b$10$zaHbtKqrtV/xRcUSz.HAQOZqb7lO0lcGoMVzHpcCCyeDfaZMXa7bu')\n       `);",
  "const [r] = await db.query(`INSERT IGNORE INTO users (first_name, last_name, username, email, cell_phone, password_hash) VALUES ('Scott', 'Admin', 'scott', 'scott@shoemakerrigging.com', '', '$2b$10$zaHbtKqrtV/xRcUSz.HAQOZqb7lO0lcGoMVzHpcCCyeDfaZMXa7bu')`); await db.query(`INSERT IGNORE INTO user_roles (user_id, role_id) SELECT id, (SELECT id FROM role WHERE name = 'admin' LIMIT 1) FROM users WHERE username = 'scott'`);"
);

// If there's another place throwing standard user role errors during boot:
// check for checkAdminTasks etc if they create tasks matching a role string

fs.writeFileSync('server.js', svr);
console.log('Fixed initAdmin');
