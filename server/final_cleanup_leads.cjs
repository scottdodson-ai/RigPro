
const fs = require('fs');

// 1. Cleanup App.jsx
(function() {
  const path = 'src/App.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Remove Open Leads button
  content = content.replace("<button style={{ ...mkBtn(\"green\"), ...s }} onClick={onNewLead}>Open Leads</button>", "");
  
  // Remove view==="leads" block
  const leadsBlockStart = 'if (view==="leads") return (';
  let startIndex = content.indexOf(leadsBlockStart);
  if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    for (let i = startIndex; i < content.length; i++) {
       if (content[i] === '{') braceCount++;
       if (content[i] === '}') {
         braceCount--;
         if (braceCount === 0) {
           endIndex = i + 1;
           break;
         }
       }
    }
    if (endIndex !== -1) {
       content = content.slice(0, startIndex) + content.slice(endIndex);
    }
  }

  // Remove onNewLead from actBtns
  content = content.replace('onNewLead={() => setView("leads")}', '');

  fs.writeFileSync(path, content);
  console.log('Successfully cleaned up App.jsx');
})();

// 2. Cleanup server.js
(function() {
  const path = 'server/server.js';
  let content = fs.readFileSync(path, 'utf8');

  // Remove leads from allowedTables (multiple occurrences)
  content = content.replace(/'leads',/g, '');

  // Remove redirection logic from server.js
  // Search for the let table = ... let leadsFilter ... lines I added
  content = content.replace(/let table = req\.params\.table; let filter = ''; if\(table==='leads'\)\{ table='quotes'; filter=' WHERE status=1'; \}/g, "const table = req.params.table;");
  content = content.replace(/let table = req\.params\.table; if \(table === 'leads'\) \{ table = 'quotes'; leadsFilter = ' WHERE status = 1'; \}/g, "const table = req.params.table;");
  content = content.replace(" \${leadsFilter}", "");
  content = content.replace(", leadsFilter", "");
  
  content = content.replace(/let table = req\.params\.table; if \(table === 'leads'\) \{ table = 'quotes'; data\.status = 1; if\(!data\.quote_number\) data\.quote_number = ''; \}/g, "const table = req.params.table;");
  content = content.replace(/if \(req\.params\.table === 'leads'\) req\.params\.table = 'quotes';/g, "");

  fs.writeFileSync(path, content);
  console.log('Successfully cleaned up server.js');
})();
