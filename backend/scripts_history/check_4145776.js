const db = require('../config/db');

(async () => {
    try {
        const [rows] = await db.query(`SELECT identitas_id, no_wo, hasil_qty, status FROM realisasi_carousel WHERE no_wo = '4145776'`);
        console.log("Realisasi for 4145776:");
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
