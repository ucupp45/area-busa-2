const db = require('../config/db');

let tableInitialized = false;

/**
 * Inisialisasi skema tabel audit_logs jika belum ada
 */
async function initAuditTable() {
    if (tableInitialized) return;
    try {
        const createQuery = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(50) NOT NULL,
                target_entity VARCHAR(50) NOT NULL,
                target_id VARCHAR(100) NULL,
                user_id INT NULL,
                username VARCHAR(100) NULL,
                user_role VARCHAR(50) NULL,
                ip_address VARCHAR(100) NULL,
                details JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_action (action),
                INDEX idx_target (target_entity, target_id),
                INDEX idx_user (user_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await db.query(createQuery);
        tableInitialized = true;
    } catch (err) {
        console.error('[AUDIT LOGGER INIT ERROR]:', err.message);
    }
}

// Inisialisasi awal saat modul dimuat
initAuditTable();

/**
 * Catat audit log untuk setiap operasi mutasi (Create, Update, Delete, Toggle)
 * @param {object} req - Express request object (berisi req.user, req.ip, dll)
 * @param {object} param1 - Data audit: { action, targetEntity, targetId, details }
 */
async function logAudit(req, { action, targetEntity, targetId = null, details = null }) {
    try {
        if (!tableInitialized) {
            await initAuditTable();
        }

        const userId = req?.user?.id || null;
        const username = req?.user?.username || (req?.user?.name ? req.user.name : 'Anonymous');
        const userRole = req?.user?.role || 'Guest';

        // Deteksi IP address klien
        let ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null;
        if (ip && typeof ip === 'string' && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        const detailsJson = details ? JSON.stringify(details) : null;

        await db.query(
            `INSERT INTO audit_logs (action, target_entity, target_id, user_id, username, user_role, ip_address, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [action, targetEntity, targetId !== null && targetId !== undefined ? String(targetId) : null, userId, username, userRole, ip, detailsJson]
        );
    } catch (err) {
        // Jangan gagalkan alur utama jika audit logging mengalami kendala, namun laporkan error ke log internal
        console.error('[AUDIT LOG ERROR]:', err.message);
    }
}

module.exports = {
    initAuditTable,
    logAudit
};
