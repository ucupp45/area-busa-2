const db = require('./config/db');

async function migrate() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS oee_metrics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tanggal DATE NOT NULL,
          tipe_mesin VARCHAR(50) NOT NULL,
          shift_time FLOAT DEFAULT 480,
          efficiency FLOAT DEFAULT 1.0,
          downtime FLOAT DEFAULT 0,
          machine_qty INT DEFAULT 1,
          cycle_time_per_machine FLOAT DEFAULT 0,
          operating_time FLOAT DEFAULT 0,
          total_input FLOAT DEFAULT 0,
          defect_qty FLOAT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_date_machine (tanggal, tipe_mesin)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    await db.query(query);
    console.log("Migration successful: oee_metrics table ensured.");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    process.exit(0);
  }
}

migrate();
