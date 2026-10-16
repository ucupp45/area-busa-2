const mysql = require('mysql2/promise');
(async () => {
    const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'dashboard_vertikal'});
    await con.query(`UPDATE realisasi_identitas SET tanggal = '2026-10-02' WHERE nama_operator = 'Bot Injector'`);
    await con.query(`UPDATE realisasi_carousel SET tanggal_wo = '2026-10-02' WHERE identitas_id IN (SELECT id FROM realisasi_identitas WHERE nama_operator = 'Bot Injector')`);
    console.log('Updated dates');
    await con.end();
})();
