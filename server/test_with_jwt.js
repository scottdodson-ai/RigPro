import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_rigpro';
const token = jwt.sign({ userId: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });

async function check() {
  try {
    const dataRes = await fetch("http://localhost:3000/api/data", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!dataRes.ok) {
        console.log("STATUS:", dataRes.status, await dataRes.text());
        return;
    }
    
    const data = await dataRes.json();
    console.log("JOBS COUNT:", data.jobs ? data.jobs.length : "undefined");
    console.log("FIRST JOB:", data.jobs && data.jobs.length ? data.jobs[0] : null);
  } catch (e) {
    console.error("ERROR", e.message);
  }
}
check();
