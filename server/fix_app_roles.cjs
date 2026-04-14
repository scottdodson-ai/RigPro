const fs = require('fs');

let app = fs.readFileSync('../src/App.jsx', 'utf8');

// Fix the undefined variable reference (roles -> role) for prop checks
app = app.replace(/\(roles \|\| \[\]\)\.includes/g, "(role || []).includes");
app = app.replace(/\(profileUser\?\.roles \|\| \[\]\)\.includes/g, "(profileUser?.roles || []).includes");
app = app.replace(/\(u\.roles \|\| \[\]\)\.includes/g, "(u.roles || []).includes");

// Fix login and me routes saving `role` from the backend `roles` payload
// We will stringify the backend array payload into localStorage
app = app.replace(
  'localStorage.setItem("role", data.user.role);',
  'localStorage.setItem("role", JSON.stringify(data.user.roles || []));'
);
app = app.replace(
  'localStorage.setItem("role", data.role || "user");',
  'localStorage.setItem("role", JSON.stringify(data.roles || []));'
);

// We need to make sure the root App.jsx properly parses the initial role
// Usually it's `const [role, setRole] = useState(localStorage.getItem('role') || '');`
// Since localStorage gives a string, we want it to parse the JSON array.
app = app.replace(
  /^.*const \[role, setRole\] = useState\(localStorage\.getItem\("role"\).*$/m,
  "  const [role, setRole] = useState(() => { try { return JSON.parse(localStorage.getItem('role')) || []; } catch(e) { return []; } });"
);

// The login form login function sets the role state directly too.
app = app.replace(
  "setRole(data.user.role);",
  "setRole(data.user.roles || []);"
);
app = app.replace(
  "setRole(data.role || \"user\");",
  "setRole(data.roles || []);"
);

// If there's an instance where `role` string was checked manually locally without parens
app = app.replace(/typeof role === 'string' \? \[role\] : role/g, "role");

fs.writeFileSync('../src/App.jsx', app);
console.log('App fixed');
