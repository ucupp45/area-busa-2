const db = require('./config/db');

async function migrate() {
    try {
        console.log('Mulai migrasi tabel mesin_manpower...');

        // Create table
        await db.query(`
            CREATE TABLE IF NOT EXISTS mesin_manpower (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipe_mesin VARCHAR(50) NOT NULL UNIQUE,
                total_mesin INT NOT NULL DEFAULT 1,
                manpower_per_mesin INT NOT NULL DEFAULT 1
            )
        `);
        console.log('Tabel mesin_manpower berhasil dibuat atau sudah ada.');

        // Insert default data if not exists
        const defaultData = [
            ['Vertikal', 3, 3],
            ['Horizontal', 3, 1],
            ['Carousel', 2, 1]
        ];

        for (const data of defaultData) {
            await db.query(`
                INSERT INTO mesin_manpower (tipe_mesin, total_mesin, manpower_per_mesin) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                total_mesin = VALUES(total_mesin), 
                manpower_per_mesin = VALUES(manpower_per_mesin)
            `, data);
        }
        
        console.log('Data default mesin & manpower berhasil di-insert/update.');
    } catch (error) {
        console.error('Terjadi error saat migrasi:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
