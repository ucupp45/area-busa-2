// ============================================================
// MIGRASI TAHAP 1 — Kolom Prediksi Short Block
// Jalankan sekali: node migrate_sb_columns.js
// ============================================================
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dashboard_vertikal',
    port:     process.env.DB_PORT || 3306,
  });

  try {
    console.log('🔧 MIGRASI TAHAP 1 — Kolom Prediksi Short Block\n');

    // ── DESCRIBE tabel untuk cek kolom yang sudah ada ──────────
    const [spkCols]    = await pool.query('DESCRIBE spk_items');
    const [matrixCols] = await pool.query('DESCRIBE cycle_time_matrix');

    const spkColNames    = spkCols.map(c => c.Field);
    const matrixColNames = matrixCols.map(c => c.Field);

    console.log('📋 Kolom spk_items saat ini    :', spkColNames.join(', '));
    console.log('📋 Kolom cycle_time_matrix saat ini:', matrixColNames.join(', '));
    console.log('');

    // ── 1. spk_items: prediksi_sb ──────────────────────────────
    if (!spkColNames.includes('prediksi_sb')) {
      await pool.query(`
        ALTER TABLE spk_items
        ADD COLUMN prediksi_sb DECIMAL(12,4) DEFAULT NULL
        COMMENT 'Kebutuhan Short Block = (T_order x Qty) / tinggi_balokan_standar'
      `);
      console.log('  ✅ spk_items.prediksi_sb      → ditambahkan');
    } else {
      console.log('  ⏭️  spk_items.prediksi_sb      → sudah ada, dilewati');
    }

    // ── 2. spk_items: tinggi_balokan ──────────────────────────
    if (!spkColNames.includes('tinggi_balokan')) {
      await pool.query(`
        ALTER TABLE spk_items
        ADD COLUMN tinggi_balokan DECIMAL(8,2) DEFAULT NULL
        COMMENT 'Tinggi balokan standar (CM) yang dipakai saat kalkulasi prediksi_sb'
      `);
      console.log('  ✅ spk_items.tinggi_balokan   → ditambahkan');
    } else {
      console.log('  ⏭️  spk_items.tinggi_balokan   → sudah ada, dilewati');
    }

    // ── 3. spk_items: tipe_mesin (routing label) ───────────────
    if (!spkColNames.includes('tipe_mesin')) {
      await pool.query(`
        ALTER TABLE spk_items
        ADD COLUMN tipe_mesin VARCHAR(30) DEFAULT NULL
        COMMENT 'Mesin tujuan: Vertikal / Horizontal / Carousel / CNC'
      `);
      console.log('  ✅ spk_items.tipe_mesin       → ditambahkan');
    } else {
      console.log('  ⏭️  spk_items.tipe_mesin       → sudah ada, dilewati');
    }

    // ── 4. cycle_time_matrix: tinggi_balokan_standar ───────────
    if (!matrixColNames.includes('tinggi_balokan_standar')) {
      await pool.query(`
        ALTER TABLE cycle_time_matrix
        ADD COLUMN tinggi_balokan_standar DECIMAL(8,2) DEFAULT NULL
        COMMENT 'Tinggi standar balokan per kualitas busa (CM), dipakai hitung prediksi SB'
      `);
      console.log('  ✅ cycle_time_matrix.tinggi_balokan_standar → ditambahkan');
    } else {
      console.log('  ⏭️  cycle_time_matrix.tinggi_balokan_standar → sudah ada, dilewati');
    }

    // ── 5. Seed tinggi_balokan_standar dari data referensi ─────
    console.log('\n🔧 Step 2: Seed tinggi_balokan_standar ke cycle_time_matrix...');

    const tinggiMap = [
      ['BC 16', 115], ['BC 18', 115], ['BC 21', 115], ['BC 25', 105],
      ['D 11', 115], ['D 12', 115], ['D 13', 115], ['D 14', 115],
      ['D 15', 105], ['D 16', 115], ['D 18', 115], ['D 19', 115],
      ['D 20', 115], ['D 22', 115], ['D 23', 115], ['D 24', 115],
      ['D 25', 115], ['D 26', 80], ['D 28', 105], ['D 30', 105],
      ['D 32', 115], ['D 33', 100], ['D 35', 100], ['D 40', 60],
      ['D 42', 65], ['D 50', 45], ['D 55', 45], ['FR 18', 105],
      ['FR 20', 105], ['FR 22', 105], ['FR 24', 105], ['FR 25', 105],
      ['FR 30', 70], ['FR 40', 65], ['FR 5 - 40', 65], ['FR 8 - 50', 65],
      ['FRH 40', 65], ['GH 55', 60], ['HR 24', 75], ['HR 26', 75],
      ['HR 30', 75], ['HR 35', 75], ['R 100', 45], ['R 40', 85],
      ['R 50', 85], ['R 55', 85], ['R 70', 70], ['R 90', 45],
      ['RF GR', 115], ['RF LI', 115], ['RF YE', 115], ['RH 3', 115],
      ['RHL 25', 75], ['RHL 26', 75], ['RHL 28', 75], ['RHL 32', 75],
      ['RHL 35', 75], ['RHL 50', 60], ['RHL 55', 60], ['RK 2', 115]
    ];

    const tinggiLebarShortBlockData = [
      ['LBR BC 16', 115], ['LBR BC 18', 115], ['LBR BC 21', 115], ['LBR BC 25', 105],
      ['LBR D 11',  115], ['LBR D 12',  115], ['LBR D 13',  115], ['LBR D 14',  115],
      ['LBR D 15',  105], ['LBR D 16',  115], ['LBR D 18',  115], ['LBR D 19',  115],
      ['LBR D 20',  115], ['LBR D 22',  115], ['LBR D 23',  115], ['LBR D 24',  115],
      ['LBR D 25',  115], ['LBR D 26',   80], ['LBR D 28',  105], ['LBR D 30',  105],
      ['LBR D 32',  115], ['LBR D 33',  100], ['LBR D 35',  100], ['LBR D 40',   60],
      ['LBR D 42',   65], ['LBR D 50',   45], ['LBR D 55',   45],
      ['LBR R 40',   85], ['LBR R 50',   85], ['LBR R 55',   85],
      ['LBR R 70',   70], ['LBR R 90',   45], ['LBR R 100',  45],
    ];

    let seedCount = 0;
    let skipCount = 0;

    // Seed tinggiMap (entri utama)
    for (const [namaItem, tinggi] of tinggiMap) {
      const [result] = await pool.query(
        `UPDATE cycle_time_matrix
         SET tinggi_balokan_standar = ?
         WHERE nama_item = ?`,
        [tinggi, namaItem]
      );
      if (result.affectedRows > 0) {
        seedCount += result.affectedRows;
      } else {
        skipCount++;
      }
    }

    // Seed tinggiLebarShortBlockData (entri LBR)
    for (const [namaItem, tinggi] of tinggiLebarShortBlockData) {
      const [result] = await pool.query(
        `UPDATE cycle_time_matrix
         SET tinggi_balokan_standar = ?
         WHERE nama_item = ?`,
        [tinggi, namaItem]
      );
      if (result.affectedRows > 0) {
        seedCount += result.affectedRows;
      } else {
        skipCount++;
      }
    }

    console.log(`  ✅ ${seedCount} baris di-update dengan tinggi_balokan_standar`);
    if (skipCount > 0) {
      console.log(`  ℹ️  ${skipCount} nama item tidak ditemukan di cycle_time_matrix (wajar jika belum di-seed)`);
    }

    // ── 6. Verifikasi akhir ────────────────────────────────────
    console.log('\n📊 Verifikasi kolom akhir:');

    const [spkColsAfter] = await pool.query('DESCRIBE spk_items');
    const spkNew = spkColsAfter.map(c => c.Field);
    console.log('  spk_items:', spkNew.join(', '));

    const [matrixColsAfter] = await pool.query('DESCRIBE cycle_time_matrix');
    const matrixNew = matrixColsAfter.map(c => c.Field);
    console.log('  cycle_time_matrix:', matrixNew.join(', '));

    const [sampleSeed] = await pool.query(
      `SELECT nama_item, tipe_mesin, tinggi_balokan_standar
       FROM cycle_time_matrix
       WHERE tinggi_balokan_standar IS NOT NULL
       LIMIT 5`
    );
    if (sampleSeed.length > 0) {
      console.log('\n  Sample tinggi_balokan_standar yang sudah ter-seed:');
      sampleSeed.forEach(r =>
        console.log(`    [${r.tipe_mesin}] ${r.nama_item} → ${r.tinggi_balokan_standar} CM`)
      );
    }

    console.log('\n🎉 TAHAP 1 SELESAI! Semua kolom berhasil ditambahkan/diverifikasi.\n');
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migrasi gagal:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
})();
