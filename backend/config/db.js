const mysql = require('mysql2');
const dotenv = require('dotenv');

// Memuat variabel dari .env
dotenv.config();

// Membuat pool koneksi
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT || 3306,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Mengubah pool menjadi format Promise agar bisa pakai async/await
const promisePool = pool.promise();

// Test koneksi
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Gagal terhubung ke MySQL:', err.message);
    } else {
        console.log('✅ Berhasil terhubung ke database MySQL [dashboard_vertikal]');
        connection.release();
    }
});

module.exports = promisePool;