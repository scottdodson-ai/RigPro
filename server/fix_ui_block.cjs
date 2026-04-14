const fs = require('fs');

let app = fs.readFileSync('../src/App.jsx', 'utf8');

app = app.replace(/role!=="admin"/g, "!(role || []).includes('admin')");
app = app.replace(/role !== "admin"/g, "!(role || []).includes('admin')");
app = app.replace(/role !== 'admin'/g, "!(role || []).includes('admin')");
app = app.replace(/profileUser\?\.role !== "admin"/g, "!(profileUser?.roles || []).includes('admin')");
app = app.replace(/profileUser\?\.role !== 'admin'/g, "!(profileUser?.roles || []).includes('admin')");

fs.writeFileSync('../src/App.jsx', app);
console.log('Fixed UI block');
