const mysql = require('mysql2/promise');
(async () => {
  const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'dashboard_vertikal'});
  const [rows] = await con.query("SELECT * FROM cycle_time_matrix WHERE nama_item LIKE '%LBR D 55%'");
  console.log(rows);
  await con.end();
})();
