const db = require('../config/db');

async function migrate() {
  try {
    const connection = await db.getConnection();
    
    // Add identitas_id to stok_sisa_potong
    const alterQuery = `
      ALTER TABLE stok_sisa_potong 
      ADD COLUMN identitas_id INT NOT NULL,
      ADD INDEX idx_identitas (identitas_id)
    `;
    
    try {
      await connection.query(alterQuery);
      console.log("Column identitas_id added to stok_sisa_potong.");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Column identitas_id already exists.");
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
