const mysql = require('mysql2/promise');

(async () => {
    const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'dashboard_vertikal'});
    const [rows] = await con.query(`SELECT identitas_id, no_wo, hasil_qty, status FROM realisasi_carousel WHERE no_wo = '4145776'`);
    console.log("Realisasi for 4145776:");
    console.log(rows);
    await con.end();
})();
