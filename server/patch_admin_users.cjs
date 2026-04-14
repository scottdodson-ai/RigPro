const fs = require('fs');

let svr = fs.readFileSync('server.js', 'utf8');

svr = svr.replace(
  "INSERT INTO users (first_name, last_name, username, email, cell_phone, avatar, password_hash, role, user_number) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM role WHERE name = ? LIMIT 1), ?)",
  "INSERT INTO users (first_name, last_name, username, email, cell_phone, avatar, password_hash, user_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
svr = svr.replace(
  "const values = [first_name, last_name, username, email, cell_phone, avatar, passwordHash, role, nextUserNumber];",
  `const values = [first_name, last_name, username, email, cell_phone, avatar, passwordHash, nextUserNumber];
   const r_roles = req.body.roles || [];`
);
svr = svr.replace(
  "await db.query('UPDATE users SET is_disabled = 1 WHERE id = ?', [result.insertId]);",
  `await db.query('UPDATE users SET is_disabled = 1 WHERE id = ?', [result.insertId]);
      if (r_roles.length > 0) {
        for (const r of r_roles) {
          await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM role WHERE name = ?', [result.insertId, r]);
        }
      }`
);

// We need to also patch PUT routes
svr = svr.replace(
  "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, role = (SELECT id FROM role WHERE name = ? LIMIT 1), is_disabled = ? WHERE id = ?",
  "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, is_disabled = ? WHERE id = ?"
);
svr = svr.replace(
  "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, role = (SELECT id FROM role WHERE name = ? LIMIT 1), is_disabled = ? WHERE id = ?",
  "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, is_disabled = ? WHERE id = ?"
);
svr = svr.replace(
  "const finalValues = [first_name, last_name, username, email, cell_phone, avatar];",
  "const finalValues = [first_name, last_name, username, email, cell_phone, avatar]; const r_roles = req.body.roles || [];"
);
svr = svr.replace(
  "if (passwordHash) {",
  `await db.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
      if (r_roles.length > 0) {
        for (const r of r_roles) {
          await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM role WHERE name = ?', [userId, r]);
        }
      }
      if (passwordHash) {`
);

fs.writeFileSync('server.js', svr);
console.log('Fixed Server');
