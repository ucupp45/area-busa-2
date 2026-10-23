const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Controller untuk Login Pengguna
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password wajib diisi.'
            });
        }

        const cleanUsername = String(username).trim();

        // Cari user di database
        const [users] = await db.query(
            'SELECT id, username, password_hash, role, name FROM users WHERE username = ? LIMIT 1',
            [cleanUsername]
        );

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah!'
            });
        }

        const user = users[0];

        // Bandingkan password dengan hash bcrypt
        const isMatch = await bcrypt.compare(String(password), user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah!'
            });
        }

        // Generate JWT Token
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name || user.username
        };

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_area_busa_2';
        const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

        const token = jwt.sign(tokenPayload, secretKey, { expiresIn });

        return res.json({
            success: true,
            message: 'Login berhasil!',
            token,
            user: tokenPayload
        });
    } catch (error) {
        console.error('[ERROR] authController.login:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat login.'
        });
    }
};

/**
 * Controller untuk Memeriksa Status Autentikasi Pengguna
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Tidak terotentikasi.'
            });
        }

        const [users] = await db.query(
            'SELECT id, username, role, name, created_at FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pengguna tidak ditemukan.'
            });
        }

        return res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error('[ERROR] authController.getMe:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat memverifikasi sesi pengguna.'
        });
    }
};

/**
 * Controller untuk Mengubah Password Pengguna
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password lama dan password baru wajib diisi.'
            });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal harus terdiri dari 6 karakter.'
            });
        }

        const [users] = await db.query(
            'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
            [userId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pengguna tidak ditemukan.'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(String(currentPassword), user.password_hash);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Password lama tidak cocok.'
            });
        }

        const newHash = await bcrypt.hash(String(newPassword), 10);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

        return res.json({
            success: true,
            message: 'Password berhasil diperbarui.'
        });
    } catch (error) {
        console.error('[ERROR] authController.changePassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal memperbarui password.'
        });
    }
};
