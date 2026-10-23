const db = require('../config/db');

(async () => {
    try {
        const [rows] = await db.query(`
            SELECT s.no_wo, s.qty_cutting, 
            (SELECT COALESCE(SUM(hasil_qty),0) FROM realisasi_carousel c WHERE c.no_wo = s.no_wo AND c.status != 'DRAFT') as qty_real 
            FROM spk_items s 
            JOIN upload_history h ON s.history_id = h.id 
            WHERE h.tanggal_upload >= '2026-10-01'
        `);
        console.log("All rows count: ", rows.length);
        let sumPlan = 0;
        let sumReal = 0;
        const diffs = rows.filter(r => {
            sumPlan += Number(r.qty_cutting);
            sumReal += Number(r.qty_real);
            return Number(r.qty_cutting) !== Number(r.qty_real);
        });
        console.log("Differences:");
        console.log(diffs);
        console.log("Total Plan:", sumPlan);
        console.log("Total Real:", sumReal);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
