const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dashboard_vertikal',
  });

  try {
    console.log('Inserting TFP for Vertikal...');
    const items = ['TFP', 'LBR TFP'];
    for (const item of items) {
      await pool.query(
        `INSERT INTO cycle_time_matrix (nama_item, varians, tipe_mesin, cycle_time_menit)
         VALUES (?, 'Varians I', 'Vertikal', 1.8)
         ON DUPLICATE KEY UPDATE varians='Varians I', cycle_time_menit=1.8`,
        [item]
      );
    }
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
