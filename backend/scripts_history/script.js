const db = require('../config/db');

(async () => {
  try {
    const [rows] = await db.query("SELECT * FROM cycle_time_matrix WHERE nama_item LIKE '%LBR D 55%'");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
