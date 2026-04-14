

async function check() {
  try {
    const loginRes = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      return;
    }
    
    const token = loginData.token;
    const dataRes = await fetch("http://localhost:3000/api/data", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await dataRes.json();
  } catch (e) {
    console.error("ERROR", e.message);
  }
}
check();
console.log(data.customers && Object.values(data.customers)[0]);
