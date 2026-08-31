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
    console.log('🔧 Step 1: ALTER TABLE — Tambah kolom tipe_mesin & CT detail...');
    
    const [cols] = await pool.query('DESCRIBE cycle_time_matrix');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('tipe_mesin')) {
      await pool.query(`ALTER TABLE cycle_time_matrix ADD COLUMN tipe_mesin VARCHAR(50) DEFAULT 'Vertikal' AFTER varians`);
      console.log('  ✅ Kolom tipe_mesin ditambahkan');
    } else {
      console.log('  ⏭️ Kolom tipe_mesin sudah ada');
    }

    const ctCols = ['ct_c1', 'ct_c2', 'ct_ptu', 'ct_pma', 'ct_pmu', 'ct_c3'];
    for (const col of ctCols) {
      if (!colNames.includes(col)) {
        await pool.query(`ALTER TABLE cycle_time_matrix ADD COLUMN ${col} DECIMAL(10,2) DEFAULT NULL`);
        console.log(`  ✅ Kolom ${col} ditambahkan`);
      } else {
        console.log(`  ⏭️ Kolom ${col} sudah ada`);
      }
    }

    console.log('\\n🔧 Step 2: UPDATE existing rows → tipe_mesin = Vertikal...');
    await pool.query(`UPDATE cycle_time_matrix SET tipe_mesin = 'Vertikal' WHERE tipe_mesin IS NULL OR tipe_mesin = ''`);
    console.log('  ✅ Done');

    console.log('\\n🔧 Step 3: Drop old UNIQUE, add composite UNIQUE...');
    try {
      await pool.query(`ALTER TABLE cycle_time_matrix DROP INDEX nama_item`);
      console.log('  ✅ Old UNIQUE index dropped');
    } catch (e) {
      console.log('  ⏭️ No old UNIQUE index to drop');
    }
    try {
      await pool.query(`ALTER TABLE cycle_time_matrix ADD UNIQUE INDEX idx_item_mesin (nama_item, tipe_mesin)`);
      console.log('  ✅ Composite UNIQUE index created');
    } catch (e) {
      console.log('  ⏭️ Composite index mungkin sudah ada:', e.message);
    }

    // ====================================================
    // HORIZONTAL MACHINE AREA (8 Varians)
    // ====================================================
    console.log('\\n🔧 Step 4: INSERT data Horizontal Machine...');

    const horizontalData = [
      { varians: 'Varians I',    items: ['D 11','D 12','TF1','GR 1','D 13','D 14','TF2','GR 2','D 15','D 16','TF3','TFP','GR 3','RF'], c1:1.18, c2:0.10, ptu:0.02, pma:0.10, pmu:0.08, c3:0.10 },
      { varians: 'Varians II',   items: ['D 18','D 19','TF4','GR 4','BC 16','BC 18','FR 18','RH 3'], c1:1.18, c2:0.10, ptu:0.02, pma:0.10, pmu:0.08, c3:0.10 },
      { varians: 'Varians III',  items: ['D 20','TF5','GR 5','FR 20','D 22','D 23','TF6','FR 22','BC 21','RK 2'], c1:1.18, c2:0.10, ptu:0.02, pma:0.10, pmu:0.08, c3:0.10 },
      { varians: 'Varians IV',   items: ['D 24','D 25','D 26','TF7','BC 25','FR 24','FR 25','RHL 25','RHL 26','RHL 28','HR 24','HR 26'], c1:1.18, c2:0.10, ptu:0.02, pma:0.11, pmu:0.08, c3:0.10 },
      { varians: 'Varians V',    items: ['D 28','D 30','D 32','D 33','D 35','FR 30','RHL 32','RHL 35','HR 30','HR 32','HR 35'], c1:1.18, c2:0.10, ptu:0.02, pma:0.10, pmu:0.08, c3:0.10 },
      { varians: 'Varians VI',   items: ['D 40','D 42','D 50','D 55','GH 55','FR 5 - 40','FR 8 - 50','FR 40','FRH 40','RHL 50','RHL 55'], c1:1.18, c2:0.10, ptu:0.02, pma:0.15, pmu:0.08, c3:0.10 },
      { varians: 'Varians VII',  items: ['R 40','R 50','R 55'], c1:1.18, c2:0.10, ptu:0.02, pma:0.19, pmu:0.08, c3:0.10 },
      { varians: 'Varians VIII', items: ['R 70','R 90','R 100'], c1:1.18, c2:0.10, ptu:0.02, pma:0.27, pmu:0.08, c3:0.10 },
    ];

    let hCount = 0;
    for (const row of horizontalData) {
      const totalCT = +(row.c1 + row.c2 + row.ptu + row.pma + row.pmu + row.c3).toFixed(2);
      for (const item of row.items) {
        const names = [item];
        if (!item.startsWith('LBR')) names.push('LBR ' + item);
        for (const name of names) {
          await pool.query(
            `INSERT INTO cycle_time_matrix (nama_item, varians, tipe_mesin, cycle_time_menit, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3)
             VALUES (?, ?, 'Horizontal', ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE cycle_time_menit=VALUES(cycle_time_menit), ct_c1=VALUES(ct_c1), ct_c2=VALUES(ct_c2), ct_ptu=VALUES(ct_ptu), ct_pma=VALUES(ct_pma), ct_pmu=VALUES(ct_pmu), ct_c3=VALUES(ct_c3)`,
            [name, row.varians, totalCT, row.c1, row.c2, row.ptu, row.pma, row.pmu, row.c3]
          );
          hCount++;
        }
      }
    }
    console.log('  ✅ ' + hCount + ' rows inserted/updated untuk Horizontal');

    // ====================================================
    // CAROUSEL MACHINE AREA (5 Varians) — NO PMU column
    // ====================================================
    console.log('\\n🔧 Step 5: INSERT data Carousel Machine...');

    const carouselData = [
      { varians: 'Varians I',   items: ['D 11','D 12','TF1','GR 1','D 13','D 14','TF2','GR 2','D 15','D 16','TF3','TFP','GR 3','RF'], c1:145.0, c2:71, ptu:1.8, pma:21.3, c3:37.5 },
      { varians: 'Varians II',  items: ['D 18','D 19','TF4','GR 4','BC 16','BC 18','FR 18','RH 3'], c1:145.0, c2:71, ptu:1.8, pma:35.2, c3:37.5 },
      { varians: 'Varians III', items: ['D 20','TF5','GR 5','FR 20','D 22','D 23','TF6','FR 22','BC 21','RK 2'], c1:145.0, c2:71, ptu:1.8, pma:35.2, c3:37.5 },
      { varians: 'Varians IV',  items: ['D 24','D 25','D 26','TF7','BC 25','FR 24','FR 25','RHL 25','RHL 26','RHL 28','HR 24','HR 26','D 28','D 30','D 32','D 33','D 35','FR 30','RHL 32','RHL 35','HR 30','HR 32','HR 35'], c1:145.0, c2:71, ptu:1.8, pma:41.7, c3:37.5 },
      { varians: 'Varians V',   items: ['D 40','D 42','D 50','D 55','GH 55','FR 5 - 40','FR 8 - 50','FR 40','FRH 40','RHL 50','RHL 55','R 40','R 50','R 55','R 70','R 90','R 100'], c1:145.0, c2:71, ptu:1.8, pma:47.6, c3:37.5 },
    ];

    let cCount = 0;
    for (const row of carouselData) {
      const totalCT = +(row.c1 + row.c2 + row.ptu + row.pma + row.c3).toFixed(2);
      for (const item of row.items) {
        const names = [item];
        if (!item.startsWith('LBR')) names.push('LBR ' + item);
        for (const name of names) {
          await pool.query(
            `INSERT INTO cycle_time_matrix (nama_item, varians, tipe_mesin, cycle_time_menit, ct_c1, ct_c2, ct_ptu, ct_pma, ct_pmu, ct_c3)
             VALUES (?, ?, 'Carousel', ?, ?, ?, ?, ?, NULL, ?)
             ON DUPLICATE KEY UPDATE cycle_time_menit=VALUES(cycle_time_menit), ct_c1=VALUES(ct_c1), ct_c2=VALUES(ct_c2), ct_ptu=VALUES(ct_ptu), ct_pma=VALUES(ct_pma), ct_pmu=NULL, ct_c3=VALUES(ct_c3)`,
            [name, row.varians, totalCT, row.c1, row.c2, row.ptu, row.pma, row.c3]
          );
          cCount++;
        }
      }
    }
    console.log('  ✅ ' + cCount + ' rows inserted/updated untuk Carousel');

    // Verifikasi
    console.log('\\n📊 Verifikasi:');
    const [verify] = await pool.query('SELECT tipe_mesin, COUNT(*) as total FROM cycle_time_matrix GROUP BY tipe_mesin');
    verify.forEach(r => console.log('  ' + r.tipe_mesin + ': ' + r.total + ' rows'));

    console.log('\\n✅ Migrasi selesai!');
    await pool.end();
  } catch (error) {
    console.error('❌ Migrasi gagal:', error);
    await pool.end();
    process.exit(1);
  }
})();
