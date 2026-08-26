const db = require('../config/db');

// Ideal CT dari DatabaseCycle (total 148.5 sec = 2.475 mnt/pcs)
const IDEAL_CT_MENIT = 148.5 / 60; // ~2.475 mnt/pcs
const LOADING_TIME   = 420;         // menit/shift
const OEE_THRESHOLD  = { warning: 60, maintenance: 40 };

// ─── Helper: Hitung OEE ────────────────────────────────────────────────────
function hitungOEE({ downtime = 0, output_pcs = 0, defects = 0, loading_time = 420 }) {
  const operatingTime = loading_time - downtime;

  // Availability
  const A = operatingTime > 0 ? (operatingTime / loading_time) * 100 : 0;

  // Performance
  const P = operatingTime > 0
    ? Math.min(((IDEAL_CT_MENIT * output_pcs) / operatingTime) * 100, 100)
    : 0;

  // Quality
  const input = output_pcs + defects;
  const Q = input > 0 ? ((input - defects) / input) * 100 : 100;

  // OEE
  const oee = (A / 100) * (P / 100) * (Q / 100) * 100;

  // Status berdasarkan OEE
  let status = 'Operational';
  if (oee < OEE_THRESHOLD.maintenance && (downtime > 0 || output_pcs > 0)) {
    status = 'Maintenance';
  } else if (oee < OEE_THRESHOLD.warning && (downtime > 0 || output_pcs > 0)) {
    status = 'Warning';
  }

  return {
    availability:    parseFloat(A.toFixed(2)),
    performance_eff: parseFloat(P.toFixed(2)),
    quality_rate:    parseFloat(Q.toFixed(2)),
    oee:             parseFloat(oee.toFixed(2)),
    status,
  };
}

// ─── GET: Ambil health semua mesin hari ini ───────────────────────────────
exports.getMachineHealth = async (req, res) => {
  try {
    const { tanggal, shift } = req.query;
    const today = tanggal || new Date().toISOString().slice(0, 10);
    const currentShift = shift || getCurrentShift();

    // Pastikan seed untuk hari ini ada
    const mesinList = ['V1', 'V2', 'V3'];
    for (const mesin of mesinList) {
      await db.query(`
        INSERT IGNORE INTO machine_health
          (mesin_id, tanggal, shift, downtime, output_pcs, defects, loading_time,
           availability, performance_eff, quality_rate, oee, status)
        VALUES (?, ?, ?, 0, 0, 0, 420, 100, 0, 100, 0, 'Operational')
      `, [mesin, today, currentShift]);
    }

    // Ambil data + output aktual dari SPK hari ini
    const [rows] = await db.query(`
      SELECT mh.*,
             COALESCE(spk_out.total_output, 0) as spk_output,
             COALESCE(spk_out.total_defects, 0) as spk_defects
      FROM machine_health mh
      LEFT JOIN (
        SELECT 
          mesin_digunakan,
          SUM(si.qty) as total_output,
          0 as total_defects
        FROM upload_history uh
        JOIN spk_items si ON uh.id = si.history_id
        WHERE DATE(uh.tanggal_upload) = ?
        GROUP BY mesin_digunakan
      ) spk_out ON JSON_CONTAINS(JSON_ARRAY(mh.mesin_id), JSON_QUOTE(spk_out.mesin_digunakan))
      WHERE mh.tanggal = ? AND mh.shift = ?
      ORDER BY mh.mesin_id
    `, [today, today, currentShift]);

    // Hitung OEE dari data quality_logs hari ini per mesin
    const [qLogs] = await db.query(`
      SELECT SUM(ql.qty_ok) as ok, SUM(ql.qty_ng) as ng
      FROM quality_logs ql
      JOIN upload_history uh ON ql.history_id = uh.id
      WHERE DATE(uh.tanggal_upload) = ?
    `, [today]);

    const totalOk = qLogs[0]?.ok || 0;
    const totalNg = qLogs[0]?.ng || 0;

    // Hitung ulang OEE tiap mesin berdasarkan data aktual
    const result = rows.map(row => {
      const outputPcs = row.output_pcs > 0 ? row.output_pcs : Math.floor(totalOk / 4);
      const defectsPcs = row.defects > 0 ? row.defects : Math.floor(totalNg / 4);

      const calc = hitungOEE({
        downtime:     row.downtime,
        output_pcs:   outputPcs,
        defects:      defectsPcs,
        loading_time: row.loading_time,
      });

      // Update ke DB
      db.query(`
        UPDATE machine_health SET
          output_pcs      = ?,
          defects         = ?,
          availability    = ?,
          performance_eff = ?,
          quality_rate    = ?,
          oee             = ?,
          status          = CASE WHEN status = 'Maintenance' AND ? != 'Maintenance' THEN 'Maintenance' ELSE ? END
        WHERE id = ?
      `, [outputPcs, defectsPcs, calc.availability, calc.performance_eff,
          calc.quality_rate, calc.oee, calc.status, calc.status, row.id]);

      return {
        id:             row.id,
        mesin_id:       row.mesin_id,
        tanggal:        row.tanggal,
        shift:          row.shift,
        downtime:       row.downtime,
        output_pcs:     outputPcs,
        defects:        defectsPcs,
        loading_time:   row.loading_time,
        availability:   calc.availability,
        performance_eff: calc.performance_eff,
        quality_rate:   calc.quality_rate,
        oee:            calc.oee,
        status:         row.status === 'Maintenance' ? 'Maintenance' : calc.status,
        catatan:        row.catatan,
      };
    });

    res.json({ tanggal: today, shift: currentShift, machines: result });
  } catch (err) {
    console.error('[ERROR] getMachineHealth:', err);
    res.status(500).json({ message: 'Gagal mengambil data health mesin', error: err.message });
  }
};

// ─── GET: Mesin yang tersedia (Operational/Warning) ───────────────────────
exports.getAvailableMachines = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const shift = getCurrentShift();

    const [rows] = await db.query(`
      SELECT mesin_id, status, oee
      FROM machine_health
      WHERE tanggal = ? AND shift = ?
      ORDER BY mesin_id
    `, [today, shift]);

    const available = rows.filter(r => r.status !== 'Maintenance').map(r => r.mesin_id);
    res.json({ available, detail: rows, shift });
  } catch (err) {
    console.error('[ERROR] getAvailableMachines:', err);
    res.status(500).json({ message: 'Gagal mengambil daftar mesin tersedia' });
  }
};

// ─── POST: Update downtime (operator input) ───────────────────────────────
exports.updateDowntime = async (req, res) => {
  const { mesin_id, downtime, catatan } = req.body;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const shift = getCurrentShift();

    // Pastikan row ada
    await db.query(`
      INSERT IGNORE INTO machine_health (mesin_id, tanggal, shift)
      VALUES (?, ?, ?)
    `, [mesin_id, today, shift]);

    // Ambil data sekarang
    const [rows] = await db.query(
      'SELECT * FROM machine_health WHERE mesin_id = ? AND tanggal = ? AND shift = ?',
      [mesin_id, today, shift]
    );
    const row = rows[0];

    // Hitung ulang OEE dengan downtime baru
    const calc = hitungOEE({
      downtime:     parseFloat(downtime),
      output_pcs:   row.output_pcs,
      defects:      row.defects,
      loading_time: row.loading_time,
    });

    // Tentukan status: jika sudah di-Maintenance manual, tidak bisa otomatis Operational
    let newStatus = calc.status;
    if (row.status === 'Maintenance' && calc.oee >= OEE_THRESHOLD.warning) {
      newStatus = 'Maintenance'; // Tetap maintenance sampai direset manual
    }

    await db.query(`
      UPDATE machine_health SET
        downtime        = ?,
        catatan         = ?,
        availability    = ?,
        performance_eff = ?,
        quality_rate    = ?,
        oee             = ?,
        status          = ?
      WHERE mesin_id = ? AND tanggal = ? AND shift = ?
    `, [downtime, catatan || '', calc.availability, calc.performance_eff,
        calc.quality_rate, calc.oee, newStatus, mesin_id, today, shift]);

    res.json({ message: 'Downtime berhasil diupdate', oee: calc.oee, status: newStatus });
  } catch (err) {
    console.error('[ERROR] updateDowntime:', err);
    res.status(500).json({ message: 'Gagal update downtime', error: err.message });
  }
};

// ─── PUT: Toggle Maintenance manual ──────────────────────────────────────
exports.toggleMaintenance = async (req, res) => {
  const { mesin_id } = req.params;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const shift = getCurrentShift();

    const [rows] = await db.query(
      'SELECT status FROM machine_health WHERE mesin_id = ? AND tanggal = ? AND shift = ?',
      [mesin_id, today, shift]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Data mesin tidak ditemukan' });

    const current = rows[0].status;
    const newStatus = current === 'Maintenance' ? 'Operational' : 'Maintenance';

    await db.query(
      'UPDATE machine_health SET status = ? WHERE mesin_id = ? AND tanggal = ? AND shift = ?',
      [newStatus, mesin_id, today, shift]
    );

    res.json({ message: `Mesin ${mesin_id} diubah ke ${newStatus}`, status: newStatus });
  } catch (err) {
    console.error('[ERROR] toggleMaintenance:', err);
    res.status(500).json({ message: 'Gagal toggle maintenance' });
  }
};

// ─── Helper: Shift berdasarkan jam ───────────────────────────────────────
function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 7 && h < 14) return 1;
  if (h >= 14 && h < 21) return 2;
  return 3;
}
