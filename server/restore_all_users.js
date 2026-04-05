import fs from 'fs';
import mysql from 'mysql2/promise';

async function restoreUsers() {
  const pool = mysql.createPool({ host: '127.0.0.1', port: 3308, user: 'root', password: 'password123', database: 'rigpro' });
  
  // Wipe users
  await pool.query('DELETE FROM users');
  
  // Read backup
  const backup = fs.readFileSync('/root/RigPro/server/backups/rigpro_backup_2026-04-02T18-12-35-402Z.sql', 'utf8');
  const lines = backup.split('\n');
  let valuesString = "";
  for(let i=0; i<lines.length; i++){
      if(lines[i].startsWith("INSERT INTO `users` VALUES")) {
          valuesString = lines[i+1];
          let j = 2;
          while(valuesString && !valuesString.endsWith(";")) {
             valuesString += lines[i+j];
             j++;
          }
          break;
      }
  }
  
  if(!valuesString) {
      console.log("No users found in backup.");
      process.exit();
  }
  
  // Poor-man parse
  try {
      const dbRows = valuesString.replace(");", ")").split("),(");
      for(let row of dbRows) {
          row = row.replace(/(\(|\))/g, '');
          const parts = row.split(",");
          
          let id = parseInt(parts[0]);
          let username = parts[1].replace(/'/g, "");
          let email = parts[2].replace(/'/g, "");
          let pw = parts[3].replace(/'/g, "");
          let role = parts[4].replace(/'/g, "");
          
          let fn = parts[6] && parts[6]!=='NULL' ? parts[6].replace(/'/g, "") : '';
          let ln = parts[7] && parts[7]!=='NULL' ? parts[7].replace(/'/g, "") : '';
          let cp = parts[8] && parts[8]!=='NULL' ? parts[8].replace(/'/g, "") : '';
          let user_num = String(100 + id);
          
          await pool.query(`INSERT INTO users (id, user_number, first_name, last_name, username, email, cell_phone, password_hash, role, is_disabled) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`, 
          [id, user_num, fn, ln, username, email, cp, pw, role]);
          
          console.log("Restored user", username);
      }
  } catch(e) { console.error("Error restoring", e); }

  process.exit();
}
restoreUsers();
