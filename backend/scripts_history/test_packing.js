const db = require('./config/db');

async function test() {
    try {
        const [rows] = await db.query("SELECT * FROM cycle_time_matrix WHERE tipe_mesin = 'Packing'");
        console.log("PACKING ROWS:", rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
