const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Panggil koneksi database
require('./config/db'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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