const fetch = require('node-fetch');

(async () => {
  const loginRes = await fetch('http://localhost:3001/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' }) // assuming admin/password works or I can use db access
  });
  // Or simpler, just test the DB directly
})();
