// Script migrasi: jalankan sekali dengan: node migrate.js
const db = require('./config/db');

async function migrate() {
  try {
    console.log('🔧 Menjalankan migrasi database...');

    // 1. Buat tabel machine_health
    await db.query(`
      CREATE TABLE IF NOT EXISTS machine_health (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        mesin_id      VARCHAR(10) NOT NULL,
        tanggal       DATE NOT NULL,
        shift         TINYINT NOT NULL,
        downtime      FLOAT DEFAULT 0,
        output_pcs    INT DEFAULT 0,
        defects       INT DEFAULT 0,
        loading_time  FLOAT DEFAULT 420,
        availability  FLOAT DEFAULT 100,
        performance_eff FLOAT DEFAULT 0,
        quality_rate  FLOAT DEFAULT 100,
        oee           FLOAT DEFAULT 0,
        status        ENUM('Operational','Warning','Maintenance') DEFAULT 'Operational',
        catatan       VARCHAR(255) DEFAULT '',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_mesin_tanggal_shift (mesin_id, tanggal, shift)
      )
    `);
    console.log('✅ Tabel machine_health berhasil dibuat / sudah ada');

    // 2. Tambah kolom mesin_digunakan di upload_history (jika belum ada)
    try {
      await db.query(`
        ALTER TABLE upload_history 
        ADD COLUMN mesin_digunakan VARCHAR(50) DEFAULT NULL
      `);
      console.log('✅ Kolom mesin_digunakan ditambahkan ke upload_history');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Kolom mesin_digunakan sudah ada, dilewati');
      } else {
        throw e;
      }
    }

    // 3. Seed data awal untuk 4 mesin hari ini (shift 1)
    const today = new Date().toISOString().slice(0, 10);
    const mesinList = ['V1', 'V2', 'V3'];
    for (const mesin of mesinList) {
      for (const shift of [1, 2, 3]) {
        await db.query(`
          INSERT IGNORE INTO machine_health 
            (mesin_id, tanggal, shift, downtime, output_pcs, defects, loading_time,
             availability, performance_eff, quality_rate, oee, status)
          VALUES (?, ?, ?, 0, 0, 0, 420, 100, 0, 100, 0, 'Operational')
        `, [mesin, today, shift]);
      }
    }
    console.log('✅ Seed data 4 mesin × 3 shift untuk hari ini selesai');

    console.log('\n🎉 Migrasi selesai! Semua perubahan berhasil diterapkan.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migrasi gagal:', err.message);
    process.exit(1);
  }
}

migrate();
