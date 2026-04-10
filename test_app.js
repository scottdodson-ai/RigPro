const custData = { "Pyrotek": { name: "Pyrotek" } };
const jobs = [
  {
    "client": "Pyrotek",
    "qn": "",
    "job_num": "SV65",
    "jobNum": "SV65",
    "status": "Won"
  }
];

const m = {};
Object.keys(custData).forEach(name => {
  m[name] = { name, quotes: [], ...custData[name] };
});

jobs.forEach(q => {
  if (q.client && m[q.client]) {
    m[q.client].quotes.push(q);
  }
});

const customers = Object.values(m)
  .map(c => ({ ...c, isProspect: c.quotes.length === 0 }))
  .sort((a,b) => a.name.localeCompare(b.name));

console.log("CUSTOMERS", JSON.stringify(customers, null, 2));
