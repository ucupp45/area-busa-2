const db = require('../config/db');

async function run() {
  try {
    await db.query('ALTER TABLE realisasi_carousel ADD COLUMN tanggal_wo DATE DEFAULT NULL AFTER no_disk');
    console.log('Successfully added tanggal_wo to realisasi_carousel');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('tanggal_wo already exists.');
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}

run();
