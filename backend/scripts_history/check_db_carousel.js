const mysql = require('mysql2/promise');

async function check() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'dashboard_vertikal'
    });
    
    const [rows] = await db.query(`SELECT * FROM cycle_time_matrix WHERE tipe_mesin = 'Carousel' LIMIT 5`);
    console.log(rows);
    process.exit(0);
}

check();
