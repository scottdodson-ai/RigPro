const mysql = require('mysql2/promise');
const https = require('https');

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3308,
  user: 'root',
  password: 'password123',
  database: 'rigpro'
});

const delay = ms => new Promise(res => setTimeout(res, ms));

const geocodeWithNominatim = (addressStr) => {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressStr)}`;
    https.get(url, {
      headers: {
        'User-Agent': 'RigPro-Geocoding-Script/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.length > 0) {
            resolve(`${parsed[0].lat},${parsed[0].lon}`);
          } else {
            resolve(null);
          }
        } catch(e) {
          console.error("Parse err", e);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      resolve(null);
    });
  });
};

(async () => {
  try {
    const [rows] = await pool.query("SELECT id, address1, city, state, zip FROM sites WHERE geocode IS NULL AND address1 IS NOT NULL AND address1 != ''");
    console.log(`Found ${rows.length} sites to geocode...`);

    let count = 0;
    for (const row of rows) {
      if (!row.address1) continue;
      // build search string
      const addrStr = `${row.address1}, ${row.city || ''}, ${row.state || ''} ${row.zip || ''}`.trim().replace(/, ,/g, ',').replace(/, $/g, '');
      const geo = await geocodeWithNominatim(addrStr);
      if (geo) {
        await pool.query("UPDATE sites SET geocode = ? WHERE id = ?", [geo, row.id]);
        count++;
        console.log(`[${count}/${rows.length}] Geocoded id ${row.id}: ${addrStr} -> ${geo}`);
      } else {
        console.log(`[-] Could not geocode id ${row.id}: ${addrStr}`);
      }
      await delay(1100); // 1.1 sec delay to respect OpenStreetMap usage policy
    }
    console.log(`Done! Successfully geocoded ${count} sites.`);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
