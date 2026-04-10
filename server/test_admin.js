import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_rigpro';
const token = jwt.sign({ userId: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });

async function check() {
  try {
    const dataRes = await fetch("http://localhost:3001/api/admin/tables/master_jobs", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!dataRes.ok) {
        console.log("STATUS:", dataRes.status, await dataRes.text());
        return;
    }
    
    const data = await dataRes.json();
    console.log("MASTER JOBS COUNT:", data ? data.length : "undefined");
  } catch (e) {
    console.error("ERROR", e.message);
  }
}
check();
