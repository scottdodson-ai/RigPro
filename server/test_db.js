import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'rigpro',
  port: 3308
});

async function run() {
  const [masterRows] = await db.query('SELECT *, customer_name as client, job_number as job_num, total_billings as total FROM master_jobs LIMIT 5');
  
  const mappedMaster = masterRows.map((row) => {
    const qn = row.quote_number || row.qn || '';
    const jobNum = row.job_num || row.job_number || '';
    const fmtDate = (d) => {
      if (!d) return '';
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).split('T')[0];
    };
    return {
      ...row,
      qn,
      job_num: jobNum,
      jobNum,
      jobSite: row.job_site || row.jobSite || '',
      desc: row.description || row.desc || '',
      qtype: row.quote_type || row.qtype || 'Contract',
      salesAssoc: row.sales_assoc || row.salesAssoc || '',
      locked: Boolean(row.is_locked ?? row.locked),
      status: 'Won',
      date: fmtDate(row.month_closed) || fmtDate(row.start_date) || '',
      startDate: fmtDate(row.start_date) || '',
      compDate: fmtDate(row.end_date) || fmtDate(row.month_closed) || '',
      labor: row.total_expense ? (row.total_expense / 0.6) : 0,
      mats: 0,
      equip: 0,
      hauling: 0,
      travel: 0
    };
  });
  console.log("MAPPED MASTER:", mappedMaster[0]);
  process.exit(0);
}
run();
