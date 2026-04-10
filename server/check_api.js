

async function check() {
  try {
    const loginRes = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.log("LOGIN FAIL:", loginData);
      return;
    }
    
    const token = loginData.token;
    const dataRes = await fetch("http://localhost:3000/api/data", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await dataRes.json();
    console.log("JOBS COUNT:", data.jobs ? data.jobs.length : "undefined");
    console.log("CUSTOMERS COUNT:", data.customers ? Object.keys(data.customers).length : "undefined");
    console.log("FIRST JOB:", data.jobs && data.jobs.length ? data.jobs[0] : null);
    console.log("LAST JOB:", data.jobs && data.jobs.length ? data.jobs[data.jobs.length - 1] : null);
  } catch (e) {
    console.error("ERROR", e.message);
  }
}
check();
