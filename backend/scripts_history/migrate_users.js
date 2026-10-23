const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function migrateUsers() {
  try {
    console.log('🔄 Menjalankan migrasi dan seeding tabel users...');

    // 1. Buat tabel users jika belum ada
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('PPC', 'Supervisor', 'Operator', 'Superadmin') NOT NULL,
        name VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabel users sudah siap.');

    // 2. Cek apakah kolom name sudah ada di users
    try {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN name VARCHAR(100) DEFAULT NULL AFTER role
      `);
      console.log('✅ Kolom name berhasil ditambahkan ke tabel users.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Kolom name sudah ada di tabel users.');
      } else {
        throw err;
      }
    }

    // 3. Data akun default dengan hash bcrypt
    const defaultUsers = [
      {
        username: 'ppc_admin',
        password: 'password123',
        role: 'PPC',
        name: 'Yusup Kurniawan'
      },
      {
        username: 'operator1',
        password: 'password123',
        role: 'Operator',
        name: 'Operator V1'
      },
      {
        username: 'superadmin',
        password: 'superadmin123',
        role: 'Superadmin',
        name: 'Super Administrator'
      }
    ];

    for (const u of defaultUsers) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.query(`
        INSERT INTO users (username, password_hash, role, name)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          password_hash = VALUES(password_hash),
          role = VALUES(role),
          name = VALUES(name)
      `, [u.username, hash, u.role, u.name]);
      console.log(`✅ User ${u.username} (${u.role}) berhasil disimpan dengan bcrypt hash.`);
    }

    // Update jika ada admin_ppc lama
    const [oldAdmin] = await db.query('SELECT * FROM users WHERE username = "admin_ppc"');
    if (oldAdmin.length > 0) {
      const adminHash = await bcrypt.hash('password123', 10);
      await db.query(`
        UPDATE users 
        SET password_hash = ?, name = COALESCE(name, 'PPC Administrator') 
        WHERE username = 'admin_ppc'
      `, [adminHash]);
      console.log('✅ Akun lama admin_ppc password hash diperbarui.');
    }

    console.log('\n🎉 Migrasi tabel users selesai!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal menjalankan migrasi users:', error);
    process.exit(1);
  }
}

migrateUsers();
