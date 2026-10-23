const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const helmet = require('helmet');

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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

// ── 3. MOUNT ROUTER ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/spk',     spkRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/mesin-manpower', mesinManpowerRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/realisasi', realisasiRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Server Dashboard Mesin Vertikal Berjalan Lancar!" });
});

// ── 4. ERROR HANDLING MIDDLEWARE ─────────────────────────────
app.use((err, req, res, next) => {
    if (err) {
        console.error('[SERVER ERROR]:', err.message || err);
        return res.status(err.status || 400).json({
            success: false,
            message: err.message || 'Terjadi kesalahan pada server saat memproses permintaan.'
        });
    }
    next();
});

const { cleanupOrphanedUploads } = require('./middlewares/upload');

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    cleanupOrphanedUploads();
});