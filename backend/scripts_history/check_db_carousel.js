const db = require('../config/db');

async function check() {
    try {
        const [rows] = await db.query(`SELECT * FROM cycle_time_matrix WHERE tipe_mesin = 'Carousel' LIMIT 5`);
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
