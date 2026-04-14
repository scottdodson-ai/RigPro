const fs = require('fs');

// Patch server.js
let svr = fs.readFileSync('server.js', 'utf8');

// Replace authenticateAdmin
svr = svr.replace(/req\.user\.role !== 'admin' && String\(req\.user\.role\) !== '1'/g, "!(req.user.roles || []).includes('admin') && !(req.user.roles || []).includes('1')");
svr = svr.replace(/req\.user\.role !== 'admin'/g, "!(req.user.roles || []).includes('admin')");

// Replace req.user.role matches
svr = svr.replace(/req\.user\.role === 'admin'/g, "(req.user.roles || []).includes('admin')");
svr = svr.replace(/req\.user\.role === 'estimator'/g, "(req.user.roles || []).includes('estimator')");
svr = svr.replace(/req\.user\.role === 'manager'/g, "(req.user.roles || []).includes('manager')");

// In login: replace single role join with JSON array
svr = svr.replace(
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.password_hash, u.user_number FROM users u LEFT JOIN role r ON u.role = r.id WHERE u.username = ?`",
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, (SELECT JSON_ARRAYAGG(r.name) FROM user_roles ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = u.id) AS roles, u.is_disabled, u.avatar, u.password_hash, u.user_number FROM users u WHERE u.username = ?`"
);

// Map rows in login
svr = svr.replace("role: user.role,", "roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || []),");
svr = svr.replace("role: user.role }", "roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || []) }");

// In /api/me
svr = svr.replace(
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar FROM users u LEFT JOIN role r ON u.role = r.id WHERE u.id = ? LIMIT 1`",
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, (SELECT JSON_ARRAYAGG(r.name) FROM user_roles ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = u.id) AS roles, u.is_disabled, u.avatar FROM users u WHERE u.id = ? LIMIT 1`"
);
svr = svr.replace(/role: row.role/g, "roles: typeof row.roles === 'string' ? JSON.parse(row.roles) : (row.roles || [])");

// Generic table fix for 'users'
svr = svr.replace(
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, r.name AS role, u.is_disabled, u.avatar, u.password_hash, u.user_number, u.created_at, u.reset_token, u.reset_token_expires FROM users u LEFT JOIN role r ON u.role = r.id ORDER BY u.id ASC`",
  "`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.cell_phone, (SELECT JSON_ARRAYAGG(r.name) FROM user_roles ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = u.id) AS roles, u.is_disabled, u.avatar, u.password_hash, u.user_number, u.created_at, u.reset_token, u.reset_token_expires FROM users u ORDER BY u.id ASC`"
);

// We should also patch App.jsx to handle multiple roles.
let app = fs.readFileSync('../src/App.jsx', 'utf8');

app = app.replace(/role === 'admin'/g, "(roles || []).includes('admin')");
app = app.replace(/role === "admin"/g, "(roles || []).includes('admin')");

app = app.replace(/profileUser\?\.role === 'admin'/g, "(profileUser?.roles || []).includes('admin')");
app = app.replace(/profileUser\?\.role === "admin"/g, "(profileUser?.roles || []).includes('admin')");

app = app.replace(/profileUser \u&\u& profileUser\.role === "estimator"/g, "profileUser && (profileUser.roles || []).includes('estimator')");
app = app.replace(/u\.role === "estimator"/g, "(u.roles || []).includes('estimator')");

// Fix dropdown in App.jsx
app = app.replace(
  /<select style={{ \.\.\.sel, width:"100%" }} value=\{newUser\.role\} onChange=\{e=>setNewUser\(p=>\(\{\.\.\.p,role:e\.target\.value\}\)\)\}>\n\s*<option value="estimator">Estimator<\/option>\n\s*<option value="manager">Manager<\/option>\n\s*<option value="admin">Administrator<\/option>\n\s*<\/select>/g,
  `<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
    {['estimator', 'manager', 'admin', 'quote_reviewer', 'office'].map(r => (
      <label key={r} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" checked={(newUser.roles || []).includes(r)} onChange={e => {
          const next = e.target.checked ? [...(newUser.roles||[]), r] : (newUser.roles||[]).filter(x=>x!==r);
          setNewUser(p => ({...p, roles: next}));
        }} />
        {r}
      </label>
    ))}
  </div>`
);

fs.writeFileSync('server.js', svr);
fs.writeFileSync('../src/App.jsx', app);

console.log('Refactored');
