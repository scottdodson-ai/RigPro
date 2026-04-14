const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/App.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Update Header Component signature
content = content.replace(
  'function Header({ view, setView, extra, crumb, role, token, setToken, setRole, profileUser, setProfileUser, customerCount, reqCount, quoteCount, jobCount }) {',
  'function Header({ view, setView, extra, crumb, role, token, setToken, setRole, profileUser, setProfileUser, customerCount, reqCount, quoteCount, jobCount, leadCount }) {'
);

// 2. Update the Leads tab definition
content = content.replace(
  '["dash","Dashboard"], ["leads", "Leads"], [',
  '["dash","Dashboard"], ["leads", leadCount !== undefined ? `Leads (${leadCount})` : "Leads"], ['
);

// 3. Add leadCount={leads.length} to all Header instance invocations
content = content.replace(
  /<Header customerCount=\{customers\.length\} reqCount=\{reqs\.length\}/g,
  '<Header leadCount={leads.length} customerCount={customers.length} reqCount={reqs.length}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('App.jsx updated successfully.');
