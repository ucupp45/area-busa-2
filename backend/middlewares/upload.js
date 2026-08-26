const multer = require('multer');
const path = require('path');

// Konfigurasi tempat penyimpanan file sementara
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // File akan disimpan di folder backend/uploads/
    },
    filename: function (req, file, cb) {
        // Menambahkan timestamp agar nama file unik
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Filter menerima file Excel DAN PDF
const fileFilter = (req, file, cb) => {
    const isExcel = file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml');
    const isPdf = file.mimetype === 'application/pdf';

    if (isExcel || isPdf) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak didukung! Harap upload file Excel (.xlsx) atau PDF (.pdf)'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;