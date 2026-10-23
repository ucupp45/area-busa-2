const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

// Pastikan direktori uploads dan uploads/temp selalu tersedia
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Konfigurasi penyimpanan staging sementara (uploads/temp/)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TEMP_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ['.xlsx', '.xls'].includes(ext) ? ext : '.bin';
        const uniqueSuffix = `stage-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
        cb(null, uniqueSuffix);
    }
});

// Filter ekstensi dan MIME type awal
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ext === '.xlsx' || ext === '.xls';
    const isAllowedMime = 
        file.mimetype.includes('excel') || 
        file.mimetype.includes('spreadsheetml') ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/octet-stream';

    if (isAllowedExt && isAllowedMime) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak didukung! Harap unggah file Excel (.xlsx atau .xls).'), false);
    }
};

// Batas ukuran eksplisit 10MB (Mencegah DoS Kehabisan Memori dan Disk)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB batas maksimal
        files: 1
    },
    fileFilter: fileFilter
});

/**
 * Validasi Magic Number / File Signature biner file Excel
 * Memeriksa header biner aktual untuk memastikan file bukan script berbahaya yang dipalsukan MIME-nya.
 */
function validateExcelFile(req, res, next) {
    if (!req.file) {
        return res.status(400).json({ message: 'File SPK tidak ditemukan.' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ message: 'File upload tidak ditemukan di direktori sementara.' });
        }

        const fd = fs.openSync(filePath, 'r');
        const headerBuf = Buffer.alloc(512);
        const bytesRead = fs.readSync(fd, headerBuf, 0, 512, 0);
        fs.closeSync(fd);

        if (bytesRead < 4) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'File rusak atau tidak memiliki data yang valid.' });
        }

        // 1. XLSX (ZIP Archive: 50 4B 03 04, 50 4B 05 06, atau 50 4B 07 08)
        const isZip = headerBuf[0] === 0x50 && headerBuf[1] === 0x4B &&
            (headerBuf[2] === 0x03 || headerBuf[2] === 0x05 || headerBuf[2] === 0x07) &&
            (headerBuf[3] === 0x04 || headerBuf[3] === 0x06 || headerBuf[3] === 0x08);

        // 2. XLS Binary (BIFF8 OLE2 Compound File: D0 CF 11 E0 A1 B1 1A E1)
        const isOle2 = bytesRead >= 8 &&
            headerBuf[0] === 0xD0 && headerBuf[1] === 0xCF && headerBuf[2] === 0x11 && headerBuf[3] === 0xE0 &&
            headerBuf[4] === 0xA1 && headerBuf[5] === 0xB1 && headerBuf[6] === 0x1A && headerBuf[7] === 0xE1;

        // 3. XLS SpreadsheetML XML 2003 (starts with <?xml and contains Spreadsheet / Workbook namespace)
        const headerStr = headerBuf.toString('utf8', 0, bytesRead);
        const isXmlExcel = headerStr.trim().startsWith('<?xml') &&
            (headerStr.includes('urn:schemas-microsoft-com:office:spreadsheet') ||
             headerStr.includes('mso-application') ||
             headerStr.includes('<Workbook'));

        if (ext === '.xlsx' && !isZip) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({
                message: 'File ditolak: Signature biner tidak cocok dengan format Excel .xlsx (Magic number bukan ZIP/SpreadsheetML sah).'
            });
        }

        if (ext === '.xls' && !isOle2 && !isXmlExcel) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({
                message: 'File ditolak: Signature file tidak cocok dengan format Excel .xls (Magic number bukan OLE2 atau XML SpreadsheetML sah).'
            });
        }

        if (!isZip && !isOle2 && !isXmlExcel) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({
                message: 'File ditolak: File bukan dokumen spreadsheet Excel yang valid.'
            });
        }

        next();
    } catch (err) {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
        }
        console.error('[UPLOAD VALIDATION ERROR]:', err);
        return res.status(500).json({ message: 'Gagal memvalidasi integritas file upload', error: err.message });
    }
}

/**
 * Middleware komprehensif penanganan upload file SPK:
 * - Menangkap batas ukuran file Multer (LIMIT_FILE_SIZE)
 * - Menangani error ekstensi/mimetype
 * - Memvalidasi magic number
 */
const uploadSPKMiddleware = (req, res, next) => {
    // Jalankan auto-clean file staging lama sebelum upload baru
    cleanOldStagingFiles(30);

    upload.single('spk_file')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        message: 'Ukuran file terlalu besar! Batas maksimal ukuran upload adalah 10MB.'
                    });
                }
                return res.status(400).json({ message: `Kesalahan upload: ${err.message}` });
            }
            return res.status(400).json({ message: err.message || 'Gagal memproses upload file.' });
        }

        validateExcelFile(req, res, next);
    });
};

/**
 * Pembersihan otomatis file staging di uploads/temp/ yang berumur lebih dari maxAgeMinutes (default 30 menit).
 * Mencegah akumulasi file yatim (orphaned) dari user yang hanya melakukan preview lalu meninggalkan halaman.
 */
function cleanOldStagingFiles(maxAgeMinutes = 30) {
    try {
        if (!fs.existsSync(TEMP_DIR)) return;
        const now = Date.now();
        const files = fs.readdirSync(TEMP_DIR);
        for (const file of files) {
            if (file === '.gitkeep') continue;
            const fullPath = path.join(TEMP_DIR, file);
            try {
                const stat = fs.statSync(fullPath);
                const ageMs = now - stat.mtimeMs;
                if (ageMs > maxAgeMinutes * 60 * 1000) {
                    fs.unlinkSync(fullPath);
                    console.log(`[CLEANUP] Menghapus file staging kedaluwarsa: ${file}`);
                }
            } catch (e) {}
        }
    } catch (err) {
        console.error('[CLEANUP STAGING ERROR]:', err);
    }
}

/**
 * Pembersihan file yatim (orphaned) di uploads/ yang tidak terdaftar di database upload_history.
 * Mencegah pemborosan ruang disk dari sisa file lama yang tidak pernah disimpan.
 */
async function cleanupOrphanedUploads() {
    try {
        const db = require('../config/db');
        const [rows] = await db.query('SELECT file_unik FROM upload_history WHERE file_unik IS NOT NULL');
        const activeFiles = new Set(rows.map(r => path.basename(r.file_unik)));

        if (!fs.existsSync(UPLOADS_DIR)) return 0;
        const files = fs.readdirSync(UPLOADS_DIR);
        let deletedCount = 0;

        for (const file of files) {
            if (file === '.gitkeep' || file === 'temp') continue;
            const fullPath = path.join(UPLOADS_DIR, file);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isFile() && !activeFiles.has(file)) {
                    fs.unlinkSync(fullPath);
                    deletedCount++;
                }
            } catch (e) {}
        }

        if (deletedCount > 0) {
            console.log(`[CLEANUP] Berhasil membersihkan ${deletedCount} file yatim (orphaned) dari uploads/.`);
        }
        return deletedCount;
    } catch (err) {
        console.error('[CLEANUP ORPHANED ERROR]:', err);
        return 0;
    }
}

// Timer otomatis untuk membersihkan staging setiap 15 menit
setInterval(() => cleanOldStagingFiles(30), 15 * 60 * 1000).unref();

// Ekspor properti modular
uploadSPKMiddleware.upload = upload;
uploadSPKMiddleware.single = (...args) => upload.single(...args);
uploadSPKMiddleware.validateExcelFile = validateExcelFile;
uploadSPKMiddleware.cleanOldStagingFiles = cleanOldStagingFiles;
uploadSPKMiddleware.cleanupOrphanedUploads = cleanupOrphanedUploads;
uploadSPKMiddleware.uploadSPKMiddleware = uploadSPKMiddleware;

module.exports = uploadSPKMiddleware;