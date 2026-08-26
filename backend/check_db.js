const db = require('./config/db');

async function check() {
    try {
        await db.query('ALTER TABLE upload_history ADD COLUMN shift int(11) NULL AFTER tanggal_upload;');
        console.log("Column shift added successfully.");
    } catch (e) {
        console.error("Error adding column:", e);
    } finally {
        process.exit(0);
    }
}
check();
