const db = require('../config/db');

async function migrate() {
  try {
    const connection = await db.getConnection();
    
    // Create stok_sisa_potong table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS stok_sisa_potong (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_barcode VARCHAR(255) NOT NULL,
        kualitas VARCHAR(255),
        sumber_potong VARCHAR(50) NOT NULL,
        p FLOAT NOT NULL,
        l FLOAT NOT NULL,
        t FLOAT NOT NULL,
        qty INT NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_no_barcode (no_barcode),
        INDEX idx_is_used (is_used)
      )
    `;
    
    await connection.query(createTableQuery);
    console.log("Table stok_sisa_potong created successfully.");
    
    // Let's add sisa_potong_id_used to realisasi_vertical to track usage
    const alterRealisasiQuery = `
      ALTER TABLE realisasi_vertical 
      ADD COLUMN sisa_potong_id_used INT DEFAULT NULL
    `;
    
    try {
      await connection.query(alterRealisasiQuery);
      console.log("Column sisa_potong_id_used added to realisasi_vertical.");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Column sisa_potong_id_used already exists.");
      } else {
        throw err;
      }
    }
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
