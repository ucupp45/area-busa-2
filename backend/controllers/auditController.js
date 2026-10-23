const db = require('../config/db');

/**
 * Controller untuk mengambil data riwayat audit log (Hanya Superadmin & Supervisor)
 * GET /api/audit-logs
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        const { action, target_entity, username } = req.query;

        let whereClauses = [];
        let params = [];

        if (action) {
            whereClauses.push('action = ?');
            params.push(action);
        }
        if (target_entity) {
            whereClauses.push('target_entity = ?');
            params.push(target_entity);
        }
        if (username) {
            whereClauses.push('username LIKE ?');
            params.push(`%${username}%`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Hitung total data
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM audit_logs ${whereSql}`,
            params
        );
        const total = countResult[0]?.total || 0;

        // Ambil baris data
        const [rows] = await db.query(
            `SELECT id, action, target_entity, target_id, user_id, username, user_role, ip_address, details, created_at 
             FROM audit_logs 
             ${whereSql}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ERROR] getAuditLogs:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat audit log', error: error.message });
    }
};
