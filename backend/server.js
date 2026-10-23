const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Panggil koneksi database
require('./config/db'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── 1. HTTP SECURITY HEADERS (Helmet) ───────────────────────
// Mengamankan header HTTP terhadap Clickjacking (X-Frame-Options), MIME Sniffing (X-Content-Type-Options), HSTS, dsb.
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ── 2. CORS WHITELIST EKSPLISIT ──────────────────────────────
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : defaultOrigins;

app.use(cors({
    origin: (origin, callback) => {
        // Izinkan request tanpa origin (seperti curl, mobile app, postman, tools lokal)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS Error: Origin ${origin} tidak diizinkan oleh kebijakan keamanan server.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ── 3. RATE LIMITING (Anti-Flooding & Brute-Force) ───────────
// Batasi request umum untuk mencegah DoS dan API flooding
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 menit
    max: parseInt(process.env.RATE_LIMIT_MAX) || 300, // Maksimal 300 request per 15 menit per IP
    standardHeaders: 'draft-7', // Mengembalikan header standard RateLimit (draft-7)
    legacyHeaders: true, // Mengembalikan header X-RateLimit-* untuk kompatibilitas klien
    message: {
        success: false,
        message: 'Terlalu banyak permintaan dari alamat IP ini. Silakan coba lagi setelah 15 menit.'
    }
});

// Batasi khusus endpoint login untuk mencegah credential brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 20, // Maksimal 20 percobaan login per IP per 15 menit
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    message: {
        success: false,
        message: 'Terlalu banyak percobaan autentikasi dari alamat IP ini. Silakan coba lagi setelah 15 menit.'
    }
});

// Terapkan rate limiter ketat pada auth login
app.use('/api/auth/login', authLimiter);

// Terapkan rate limiter umum pada seluruh API endpoint
app.use('/api/', apiLimiter);

// ── 4. BATAS UKURAN PAYLOAD (Mencegah Memory Exhaustion DoS) ──
// Batas payload diturunkan dari 50mb menjadi 2mb untuk mencegah kelelahan event loop dan memori
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
// CATATAN KEAMANAN: Penyajian statis publik /uploads dihapus untuk mencegah Information Disclosure.
// Seluruh unduhan file dialihkan melalui endpoint terautentikasi: GET /api/spk/download/:id

// =====================================
// DAFTAR ROUTES KITA
// =====================================
const authRoutes = require('./routes/authRoutes');
const spkRoutes     = require('./routes/spkRoutes');
const machineRoutes = require('./routes/machineRoutes');
const mesinManpowerRoutes = require('./routes/mesinManpowerRoutes');
const matrixRoutes = require('./routes/matrixRoutes');
const realisasiRoutes = require('./routes/realisasiRoutes');
const auditRoutes = require('./routes/auditRoutes');

// ── 5. MOUNT ROUTER ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/spk',     spkRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/mesin-manpower', mesinManpowerRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/realisasi', realisasiRoutes);
app.use('/api/audit-logs', auditRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Server Dashboard Mesin Vertikal Berjalan Lancar!" });
});

// ── 6. ERROR HANDLING MIDDLEWARE ─────────────────────────────
app.use((err, req, res, next) => {
    if (err) {
        // Penanganan khusus jika ukuran payload melebihi batas (HTTP 413 Payload Too Large)
        if (err.type === 'entity.too.large' || err.status === 413) {
            return res.status(413).json({
                success: false,
                message: 'Ukuran payload melebihi batas maksimum yang diizinkan (maksimal 2MB).'
            });
        }

        const statusCode = err.status || 500;
        console.error(`[SERVER ERROR ${statusCode}]:`, err.stack || err.message || err);

        // Jangan pernah bocorkan detail internal database atau stack trace pada error 500
        const isClientError = statusCode >= 400 && statusCode < 500;
        const safeMessage = isClientError
            ? (err.message || 'Permintaan tidak valid.')
            : 'Terjadi kesalahan internal pada server saat memproses permintaan.';

        return res.status(statusCode).json({
            success: false,
            message: safeMessage
        });
    }
    next();
});

const { cleanupOrphanedUploads } = require('./middlewares/upload');

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    cleanupOrphanedUploads();
});