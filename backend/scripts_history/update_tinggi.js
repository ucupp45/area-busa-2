const db = require('./config/db');

const data = [
  { name: 'BC 21', height: 105 },
  { name: 'BC 25', height: 95 },
  { name: 'D 11', height: 110 },
  { name: 'D 14', height: 110 },
  { name: 'D 15', height: 99 },
  { name: 'D 16', height: 110 },
  { name: 'D 18', height: 110 },
  { name: 'D 20', height: 110 },
  { name: 'D 22', height: 110 },
  { name: 'D 23', height: 105 },
  { name: 'D 24', height: 110 },
  { name: 'D 25', height: 105 },
  { name: 'D 26', height: 100 },
  { name: 'D 28', height: 105 },
  { name: 'D 30', height: 100 },
  { name: 'D 32', height: 80 },
  { name: 'D 33', height: 100 },
  { name: 'D 35', height: 70 },
  { name: 'D 40', height: 75 },
  { name: 'D 55', height: 100 },
  { name: 'FR 20', height: 100 },
  { name: 'HR 32', height: 70 },
  { name: 'R 40', height: 75 },
  { name: 'R 50', height: 80 },
  { name: 'REBONDED 100', height: 48 },
  { name: 'REBONDED 50', height: 80 },
  { name: 'REBONDED 70', height: 68 },
  { name: 'REBONDED 90', height: 52 },
  { name: 'RF', height: 110 },
  { name: 'RH 3', height: 110 },
  { name: 'RK 2', height: 105 },
  { name: 'TF 2', height: 110 },
  { name: 'TF 3', height: 110 },
  { name: 'TF 5', height: 110 },
];

async function updateTinggi() {
  try {
    for (const item of data) {
      let searchQuery = item.name === 'RF' ? 'nama_item = "RF" OR nama_item = "LBR RF"' : `nama_item LIKE '%${item.name}%'`;
      
      // Specifically handle REBONDED which maps to R in the DB sometimes
      if (item.name === 'REBONDED 100') searchQuery = `nama_item LIKE '%R 100%'`;
      if (item.name === 'REBONDED 50') searchQuery = `nama_item LIKE '%R 50%'`;
      if (item.name === 'REBONDED 70') searchQuery = `nama_item LIKE '%R 70%'`;
      if (item.name === 'REBONDED 90') searchQuery = `nama_item LIKE '%R 90%'`;
      if (item.name === 'HR 32') searchQuery = `nama_item LIKE '%HR 32%'`;

      // Specifically handle exact matching where needed to avoid D 1 matching D 11
      if (item.name.match(/^D \d+$/)) {
        searchQuery = `(nama_item = '${item.name}' OR nama_item = 'LBR ${item.name}')`;
      }
      if (item.name.match(/^BC \d+$/)) {
        searchQuery = `(nama_item = '${item.name}' OR nama_item = 'LBR ${item.name}')`;
      }
      if (item.name.match(/^FR \d+$/)) {
        searchQuery = `(nama_item = '${item.name}' OR nama_item = 'LBR ${item.name}')`;
      }
      if (item.name.match(/^TF \d+$/)) {
        searchQuery = `(nama_item = '${item.name}' OR nama_item = 'LBR ${item.name}')`;
      }
      if (item.name === 'RK 2' || item.name === 'RH 3' || item.name === 'R 40' || item.name === 'R 50') {
         searchQuery = `(nama_item = '${item.name}' OR nama_item = 'LBR ${item.name}')`;
      }

      await db.query(`UPDATE cycle_time_matrix SET tinggi_balokan_standar = ? WHERE ${searchQuery}`, [item.height]);
      console.log(`Updated ${item.name} to ${item.height}`);
    }
    console.log("Done!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

updateTinggi();
