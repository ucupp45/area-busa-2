const mysql = require('mysql2/promise');
(async () => {
    const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'dashboard_vertikal'});
    await con.query(`UPDATE realisasi_identitas SET tanggal = '2026-10-02' WHERE id = 77`);
    await con.query(`UPDATE realisasi_carousel SET tanggal_wo = '2026-10-02' WHERE identitas_id = 77`);
    console.log('Fixed date for identitas 77');
    await con.end();
})();
