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
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Mengizinkan akses download file

// =====================================
// DAFTAR ROUTES KITA
// =====================================
const spkRoutes     = require('./routes/spkRoutes');
const machineRoutes = require('./routes/machineRoutes');
const mesinManpowerRoutes = require('./routes/mesinManpowerRoutes');

app.use('/api/spk',     spkRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/mesin-manpower', mesinManpowerRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Server Dashboard Mesin Vertikal Berjalan Lancar!" });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});