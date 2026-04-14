const fs = require('fs');

let app = fs.readFileSync('../src/App.jsx', 'utf8');

app = app.replace(
  'const [role,       setRole]       = useState(localStorage.getItem("role") || "user");',
  'const [role,       setRole]       = useState(() => { try { return JSON.parse(localStorage.getItem("role")) || []; } catch(e) { return []; } });'
);

fs.writeFileSync('../src/App.jsx', app);
console.log('Fixed hook');
