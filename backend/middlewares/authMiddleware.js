const jwt = require('jsonwebtoken');

/**
 * Middleware untuk memverifikasi token JWT dari Header Authorization
 * Format header: Authorization: Bearer <token>
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Akses ditolak: Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Akses ditolak: Format token tidak valid.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_area_busa_2');
        req.user = decoded; // { id, username, role, name, iat, exp }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Sesi telah kedaluwarsa. Silakan login kembali.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid atau telah dirusak. Akses ditolak.'
        });
    }
};

/**
 * Middleware RBAC (Role-Based Access Control)
 * Contoh pemakaian: requireRole('Superadmin'), requireRole('Superadmin', 'PPC')
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Akses ditolak: Data pengguna tidak terotentikasi.'
            });
        }

        const userRole = req.user.role.toLowerCase();
        const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak: Peran '${req.user.role}' tidak memiliki izin untuk melakukan tindakan ini. Diperlukan salah satu dari peran: ${allowedRoles.join(', ')}.`
            });
        }

        next();
    };
};

module.exports = {
    verifyToken,
    requireRole
};
