const fs = require('fs');

let svr = fs.readFileSync('server.js', 'utf8');

svr = svr.replace(/\(req\.user\.roles \|\| \[\]\)\.includes\('admin'\)/g, "((req.user.roles || []).includes('admin') || req.user.role === 'admin' || String(req.user.role) === '1')");

fs.writeFileSync('server.js', svr);
console.log('Fixed legacy admin roles check in server');
