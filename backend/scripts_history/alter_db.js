const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_vertikal'
  });
  
  try {
    await connection.query('ALTER TABLE realisasi_carousel ADD COLUMN tanggal_wo DATE DEFAULT NULL AFTER no_disk');
    console.log('Successfully added tanggal_wo to realisasi_carousel');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('tanggal_wo already exists.');
    } else {
      console.error(err);
    }
  } finally {
    await connection.end();
  }
}

run();
