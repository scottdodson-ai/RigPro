const fs = require('fs');

let svr = fs.readFileSync('server.js', 'utf8');

svr = svr.replace(
  `const { first_name, last_name, username, email, cell_phone, avatar, password, role, is_disabled } = req.body;`,
  `const { first_name, last_name, username, email, cell_phone, avatar, password, roles, is_disabled } = req.body;`
);

const oldSql = `    if (password) {
      // Update with new password
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, passwordHash, role, nextDisabled, userId]
      );
    } else {
      // Update without changing password
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, role, nextDisabled, userId]
      );
    }
    const [updatedUserRows] = await db.query('SELECT user_number FROM users WHERE id = ? LIMIT 1', [userId]);
    res.json({ id: Number(userId), first_name: first_name || '', last_name: last_name || '', username: normalizedUsername, email: email || '', cell_phone: cell_phone || '', avatar: avatar || null, role, is_disabled: nextDisabled === 1, user_number: updatedUserRows[0]?.user_number || null });`;

const newSql = `    if (password) {
      // Update with new password
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, password_hash = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, passwordHash, nextDisabled, userId]
      );
    } else {
      // Update without changing password
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, cell_phone = ?, avatar = ?, is_disabled = ? WHERE id = ?',
        [first_name || '', last_name || '', normalizedUsername, email || '', cell_phone || '', avatar || null, nextDisabled, userId]
      );
    }

    if (roles && Array.isArray(roles)) {
      await db.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
      if (roles.length > 0) {
        for (const r of roles) {
          await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM role WHERE name = ? LIMIT 1', [userId, r]);
        }
      }
    }

    const [updated] = await db.query(\`
      SELECT 
        u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, u.is_disabled, u.avatar, u.user_number, u.created_at,
        (SELECT JSON_ARRAYAGG(r.name) FROM user_roles ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = u.id) AS roles
      FROM users u WHERE u.id = ?
    \`, [userId]);
    
    if (updated[0]) {
      updated[0].roles = typeof updated[0].roles === 'string' ? JSON.parse(updated[0].roles || '[]') : (updated[0].roles || []);
      updated[0].role = updated[0].roles[0] || null;
      updated[0].is_disabled = Number(updated[0].is_disabled) === 1;
    }
    
    res.json(updated[0]);`;

if (svr.includes("cell_phone || '', avatar || null, passwordHash, role, nextDisabled, userId]")) {
  svr = svr.replace(oldSql, newSql);
} else {
  console.log("Old sql not found");
}

fs.writeFileSync('server.js', svr);
console.log('Fixed PUT users script replacement');
