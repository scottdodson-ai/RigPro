const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const regex = /app\.put\('\/api\/admin\/users\/:id', authenticateToken, authenticateAdmin, async \(req, res\) => \{[\s\S]*?\}\);/g;

const newStr = `app.put('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
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
    
    res.json(updated[0]);
  } catch (error) {
    console.error('[API] PUT /api/admin/users/:id error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});`;

s = s.replace(regex, newStr);
fs.writeFileSync('server.js', s);
console.log("Successfully replaced via regex!");
