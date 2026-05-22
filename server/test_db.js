const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'rigpro_password_123',
    database: 'rigpro'
  }).catch(e => mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'rigpro_password_123',
    database: 'rigpro'
  }));
  try {
    const [result] = await db.query(
      `INSERT INTO \`status\` (\`type\`, \`name\`, \`sort_order\`, \`date_time\`, \`description\`) VALUES (?, ?, ?, ?, ?)`,
      ["quote", "test_status", "0", null, ""]
    );
    console.log("Success", result);
  } catch(e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
})();
