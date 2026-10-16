const db = require('./config/db'); 
async function alter() { 
  try { 
    await db.query('ALTER TABLE realisasi_identitas ADD COLUMN waste_produksi_p DECIMAL(10,2) DEFAULT 0, ADD COLUMN waste_produksi_l DECIMAL(10,2) DEFAULT 0, ADD COLUMN waste_produksi_t DECIMAL(10,2) DEFAULT 0, ADD COLUMN waste_produksi_qty INT DEFAULT 0'); 
    console.log('success'); 
  } catch(e) { 
    console.error(e); 
  } 
  process.exit(0); 
} 
alter();
