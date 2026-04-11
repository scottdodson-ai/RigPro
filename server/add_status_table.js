import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'rigpro',
  port: 3308
});

async function run() {
  try {
    await db.query(`DROP TABLE IF EXISTS statuses;`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS statuses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    
    await db.query(`
      INSERT INTO statuses (name, sort_order) VALUES
      ('Requested', 10),
      ('Customer Contact', 20),
      ('In process', 30),
      ('Accepted', 40),
      ('Modification needed', 50),
      ('Quoted', 60),
      ('Accepted', 70),
      ('Job complete', 80),
      ('Partial Payment', 90),
      ('Full Payment', 100);
    `);
    console.log("Successfully created and seeded statuses table.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
