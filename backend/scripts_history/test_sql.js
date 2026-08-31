const db = require('./config/db');

async function test() {
    try {
        await db.query(`DELETE FROM machine_health WHERE mesin_id = 'V4'`);
        console.log("V4 deleted.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
