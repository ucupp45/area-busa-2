const db = require('./config/db');
db.query("SELECT nama_item, tinggi_balokan_standar FROM cycle_time_matrix WHERE nama_item LIKE '%D 40%' OR nama_item LIKE '%D 16%' ORDER BY nama_item")
  .then(([rows]) => {
    rows.forEach(r => console.log(r.nama_item, '->', r.tinggi_balokan_standar));
  })
  .catch(console.error)
  .finally(() => process.exit(0));
