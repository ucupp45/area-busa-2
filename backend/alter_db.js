const db = require('./config/db');
async function run() {
  try {
    await db.query(`ALTER TABLE realisasi_identitas ADD COLUMN status VARCHAR(20) DEFAULT 'SUBMITTED'`);
    console.log('Column added');
  } catch (e) {
    if(e.code === 'ER_DUP_FIELDNAME') console.log('Column already exists');
    else console.error(e);
  }
  process.exit();
}
run();
