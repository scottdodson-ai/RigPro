const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(
  /'INSERT INTO customers \(name, notes, address1, city, state, zip, website, industry, payment_terms, account_num\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)',\s+\[name, passStr\(c.notes\), passStr\(c.billingAddr\), passStr\(c.website\), passStr\(c.industry\), passStr\(c.paymentTerms\), passStr\(c.accountNum\)\]/g,
  `'INSERT INTO customers (name, notes, address1, city, state, zip, website, industry, payment_terms, account_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, passStr(c.notes), passStr(c.address1), passStr(c.city), passStr(c.state), passStr(c.zip), passStr(c.website), passStr(c.industry), passStr(c.paymentTerms), passStr(c.accountNum)]`
);

code = code.replace(
  /'INSERT INTO customers \(name, notes, address1, city, state, zip, website, industry, payment_terms, account_num\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)',\s+\[name.trim\(\), notes \|\| '', address1, city, state, zip, website \|\| '', industry \|\| '', payment_terms \|\| '', account_num \|\| ''\]/g,
  `'INSERT INTO customers (name, notes, address1, city, state, zip, website, industry, payment_terms, account_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), notes || '', address1 || '', city || '', state || '', zip || '', website || '', industry || '', payment_terms || '', account_num || '']`
);

code = code.replace(
  /'UPDATE customers SET name = \?, notes = \?, address1 = \?, city = \?, state = \?, zip = \?, website = \?, industry = \?, payment_terms = \?, account_num = \? WHERE id = \?',\s+\[name.trim\(\), notes \|\| '', address1, city, state, zip, website \|\| '', industry \|\| '', payment_terms \|\| '', account_num \|\| '', customerId\]/g,
  `'UPDATE customers SET name = ?, notes = ?, address1 = ?, city = ?, state = ?, zip = ?, website = ?, industry = ?, payment_terms = ?, account_num = ? WHERE id = ?',
      [name.trim(), notes || '', address1 || '', city || '', state || '', zip || '', website || '', industry || '', payment_terms || '', account_num || '', customerId]`
);

code = code.replace(
  /'INSERT INTO customers \(name, address1, city, state, zip, notes\) VALUES \(\?, \?, \?\)',\s+\[customerName, String\(quote.jobSite \|\| ''\).trim\(\), 'Auto-created from quote save'\]/g,
  `'INSERT INTO customers (name, address1, city, state, zip, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [customerName, String(quote.jobSiteAddress1 || '').trim(), String(quote.jobSiteCity || '').trim(), String(quote.jobSiteState || '').trim(), String(quote.jobSiteZip || '').trim(), 'Auto-created from quote save']`
);

fs.writeFileSync('server/server.js', code);
