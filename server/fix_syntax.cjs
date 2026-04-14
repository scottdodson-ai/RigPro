const fs = require('fs');

let app = fs.readFileSync('../src/App.jsx', 'utf8');

app = app.replace(/profileUser\?\.\(role \|\| \[\]\)\.includes/g, "(profileUser?.roles || []).includes");
app = app.replace(/profileUser\.\(role \|\| \[\]\)\.includes/g, "(profileUser?.roles || []).includes");

// Line 9982: {(profileUser?.(role || []).includes('admin') ? appUsers : appUsers.filter(u => u.role === profileUser?.role)).filter(u => u.id !== profileUser?.id).map(u => <option key={u.id} value={u.id}>{u.first_name || u.username}</option>)}
// Replace `u.role === profileUser?.role` with `(u.roles || []).some(r => (profileUser?.roles || []).includes(r))`
app = app.replace(/u\.role === profileUser\?\.role/g, "(u.roles || []).some(r => (profileUser?.roles || []).includes(r))");

// Check for any other `u.(role || []).includes`
app = app.replace(/u\.\(role \|\| \[\]\)\.includes/g, "(u.roles || []).includes");

fs.writeFileSync('../src/App.jsx', app);
console.log('Fixed JS syntax');
