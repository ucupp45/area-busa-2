# 🏭 Sistem Perencanaan Produksi & Monitoring Realisasi (Area Busa 2)

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20RBAC%20%7C%20Helmet-success?style=flat-square)](#-keamanan-sistem)

Sistem aplikasi web manufaktur terintegrasi yang dirancang khusus untuk lini produksi **Area Busa 2** (mesin pemotong busa **Horizontal**, **Vertikal**, dan **Carousel**). Sistem ini menghubungkan alur kerja tim **PPC** (Production Planning & Control) dan **Operator Produksi** secara *real-time*, memprediksi kebutuhan man power & mesin, menghitung Overall Equipment Effectiveness (**OEE**), serta melacak perputaran **Stok Sisa Potong (Sispot)** secara akurat dan aman.

---

## 📑 Daftar Isi

- [Tujuan Sistem](#-tujuan-sistem)
- [Fitur-Fitur Utama](#-fitur-fitur-utama)
- [Hak Akses Pengguna (RBAC)](#-hak-akses-pengguna-rbac)
- [Keamanan Sistem](#-keamanan-sistem)
- [Tata Cara Penggunaan](#-tata-cara-penggunaan)
  - [1. Masuk ke Aplikasi](#1-masuk-ke-aplikasi-login)
  - [2. Alur Perencanaan (PPC)](#2-alur-perencanaan-ppc)
  - [3. Alur Realisasi (Operator)](#3-alur-realisasi-operator)
  - [4. Evaluasi Manajemen & Dashboard](#4-evaluasi-manajemen--dashboard)
- [Instalasi & Menjalankan Aplikasi](#-instalasi--menjalankan-aplikasi)
- [Struktur Direktori Proyek](#-struktur-direktori-proyek)

---

## 🎯 Tujuan Sistem

1. **Efisiensi Perencanaan (PPC)**: Mengeliminasi kalkulasi manual spreadsheet dengan perhitungan otomatis dimensi ($P \times L \times T$), total kubikasi ($m^3$), estimasi durasi potong (*cycle time*), dan rekomendasi alokasi tenaga kerja (*man power*).
2. **Sinkronisasi Data Real-Time**: Menghubungkan target rencana harian SPK dari PPC langsung dengan input aktual operator di lantai pabrik tanpa jeda birokrasi manual.
3. **Analisis Produktivitas & Mesin (OEE)**: Menghitung metrik *Availability*, *Performance*, dan *Quality Rate* secara prediktif maupun aktual, dilengkapi pencatatan downtime dan klasifikasi reject/defect.
4. **Pengendalian Limbah & Stok Sisa (Sispot)**: Mencatat dan menginventarisasi potongan balok atau lembaran busa yang dapat digunakan kembali (*reusable foam*), sehingga meminimalkan sisa buangan (*waste*).
5. **Integritas & Keamanan Data Operasional**: Mencegah manipulasi data, membatasi akses sesuai wewenang peran kerja, serta mencatat rekam jejak aktivitas operasional pabrik.

---

## ✨ Fitur-Fitur Utama

### 1. Perencanaan & Penjadwalan Produksi (PPC)
- **Upload / Input SPK Fleksibel**: Mendukung impor berkas spreadsheet (`.xlsx`, `.xls`) dengan validasi struktur dan biner, atau input cepat melalui salin-tempel baris tabel.
- **Kalkulasi Kubikasi & Cycle Time Otomatis**: Menghitung volume ($m^3$) per mesin dan mengestimasi jam kerja berdasarkan densitas dan ketebalan busa.
- **Predictive OEE Planning**: Memprediksi efisiensi rencana kerja sebelum perintah kerja dijalankan di lantai produksi.
- **Dashboard Perencanaan Harian**: Filter kalender interaktif untuk meninjau distribusi beban kerja antar mesin.

### 2. Pelaksanaan & Monitoring Lapangan (Operator)
- **Input Realisasi Pemotongan**: Form pencatatan hasil potong aktual per Work Order (WO) untuk Mesin Vertikal dan Horizontal.
- **Pencatatan Downtime & Kendala**: Pelaporan gangguan operasional (ganti pisau, maintenance, setelan mesin, material tunggu) beserta durasinya dalam menit.
- **Inventarisasi Sisa Potong Otomatis**: Potongan busa yang masih bernilai ekonomis langsung terdaftar ke sistem stok sisa potong.
- **Log Riwayat Pemotongan**: Riwayat rekapitulasi kerja yang dapat difilter berdasarkan shift kerja, mesin, atau rentang tanggal.

### 3. Evaluasi & Analisis Komparasi (Planning vs Realisasi)
- **Gap Analysis Kubikasi ($m^3$)**: Visualisasi perbandingan target SPK vs capaian aktual operator.
- **Dashboard OEE Aktual**: Analisis performa mesin secara menyeluruh dilengkapi diagram pareto downtime.
- **Monitoring Utilisasi Mesin**: Memantau kapasitas operasional Mesin Vertikal, Horizontal, dan Carousel dalam satu tampilan terpadu.

### 4. Manajemen Stok Sisa Potong (Sispot)
- **Pelacakan Status Stok**: Klasifikasi ketersediaan material (*Tersedia* vs *Terpakai*).
- **Aging Analysis**: Pengelompokan umur simpan material sisa di gudang pemotongan (Hari ini, 1–3 hari, 4–7 hari, > 7 hari).
- **Akses Terkendali**: Hak melihat data terbuka untuk perencanaan, sedangkan modifikasi/penyesuaian data sisa potong dibatasi secara ketat berdasarkan hak akses administratif.

### 5. Master Database & Parameter Mesin
- Pengaturan matriks *cycle time* per kepadatan (*density*) dan varian ketebalan busa.
- Konfigurasi parameter mesin, rasio operator terhadap mesin, dan standarisasi bobot busa.

---

## 👥 Hak Akses Pengguna (RBAC)

Sistem menerapkan pembatasan hak akses berbasis peran (*Role-Based Access Control*) untuk menjaga integritas dan kerahasiaan data operasional:

| Peran (*Role*) | Cakupan Wewenang & Tanggung Jawab | Akses Utama |
| :--- | :--- | :--- |
| **Superadmin** | Pengelolaan sistem penuh, master data mesin & cycle time, otorisasi penuh stok sisa potong, dan pengawasan log audit sistem. | Seluruh Modul & Konfigurasi Master |
| **PPC** | Pembuatan dan pengunggahan SPK, pemantauan dashboard perencanaan, estimasi predictive OEE, serta peninjauan ketersediaan sisa potong. | Modul Planning & Monitoring Stok |
| **Operator** | Pencatatan hasil potong aktual di mesin, pelaporan durasi downtime mesin, dan peninjauan riwayat kerja harian. | Modul Input & Log Realisasi |

> 🔒 **Keamanan Kredensial**: Akun pengguna diterbitkan secara tertutup oleh Administrator Sistem sesuai penugasan kerja. Demi alasan keamanan, kredensial akun tidak dipublikasikan pada repositori publik.

---

## 🛡️ Keamanan Sistem

Aplikasi telah diperkuat dengan berbagai lapisan perlindungan siber:
- **Autentikasi Terenkripsi**: Menggunakan JSON Web Token (JWT) yang diverifikasi pada setiap request API.
- **Otorisasi Sisi Server**: Pengecekan izin peran (*server-side role guard*) kebal terhadap rekayasa header klien.
- **Validasi Berkas Ketat**: Pembatasan ukuran unggahan Multer (maksimal 10MB) serta verifikasi *Magic Bytes* (signature biner) untuk mencegah injeksi berkas berbahaya.
- **Proteksi Direktori Unggahan**: Berkas SPK tidak diekspos melalui direktori publik; unduhan file wajib melalui rute API terautentikasi.
- **HTTP Security Headers & CORS**: Menggunakan modul **Helmet** (`nosniff`, `X-Frame-Options: SAMEORIGIN`, dll.) dan whitelist domain klien.
- **Rate Limiting & Payload Control**: Pembatasan frekuensi request API dan restriksi payload JSON (maksimal 2MB) guna memitigasi serangan DoS dan brute force.
- **Audit Logging**: Perekaman jejak audit otomatis di database untuk aksi-aksi penting (upload, update, delete, maintenance).

---

## 📖 Tata Cara Penggunaan

### 1. Masuk ke Aplikasi (*Login*)
1. Buka antarmuka aplikasi melalui peramban web resmi.
2. Masukkan identitas akun dan kata sandi yang telah didaftarkan administrator.
3. Setelah berhasil masuk, sistem otomatis mengenali peran (*role*) serta mendeteksi jam kerja dan shift aktif (**Shift 1**, **Shift 2**, atau **Shift 3**).

### 2. Alur Perencanaan (PPC)
1. Buka menu **Planning** > **Insert Planning**.
2. Unggah berkas SPK berformat Excel atau tempel baris data tabel pemotongan.
3. Periksa kalkulasi otomatis dimensi, kubikasi, dan kebutuhan operator.
4. Klik **Simpan Planning SPK**.
5. Tinjau jadwal dan estimasi efisiensi pada **Dashboard Planning** dan **Predictive OEE**.

### 3. Alur Realisasi (Operator)
1. Buka menu **Realisasi** > **Input Realisasi**.
2. Pilih mesin yang sedang beroperasi dan nomor Work Order (WO) yang dikerjakan.
3. Masukkan jumlah potongan jadi (*Good Output*), dimensi sisa potongan busa (jika ada), dan durasi kendala mesin (*Downtime*).
4. Klik **Simpan Realisasi**. Data akan otomatis memperbarui sisa target WO dan menambah stok sisa potong.
5. Rekapitulasi dapat ditinjau melalui menu **Hasil Realisasi** dan diekspor jika diperlukan.

### 4. Evaluasi Manajemen & Dashboard
1. Buka menu **Planning vs Realisasi** untuk mengevaluasi selisih antara target dan hasil produksi aktual.
2. Buka menu **Predictive OEE Realisasi** untuk menganalisis performa mesin dan diagram kendala (*pareto downtime*).
3. Pantau ketersediaan material pada menu **Stok Sisa Potong** untuk efisiensi bahan baku.

---

## 🛠️ Instalasi & Menjalankan Aplikasi

### Prasyarat Lingkungan
- **Node.js** (v18 LTS atau yang lebih baru)
- **MySQL / MariaDB Database Server**
- **Git**

### 1. Salin Repositori
```bash
git clone https://github.com/ucupp45/area-busa-2.git
cd area-busa-2
```

### 2. Pengaturan Backend
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Siapkan file konfigurasi lingkungan dari template:
   ```bash
   cp .env.example .env
   ```
   *Konfigurasikan parameter koneksi database lokal dan kunci rahasia JWT (`JWT_SECRET`) pada file `.env` lokal Anda.*
4. Jalankan backend:
   ```bash
   npm run dev
   ```

### 3. Pengaturan Frontend
1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd ../frontend
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan antarmuka:
   ```bash
   npm run dev
   ```
4. Buka alamat lokal yang muncul di terminal (default: `http://localhost:5173`) melalui peramban web.

---

## 📁 Struktur Direktori Proyek

```text
area-busa-2/
├── backend/
│   ├── config/             # Konfigurasi Koneksi Database (MySQL2 Pool)
│   ├── controllers/        # Logika Bisnis (SPK, Realisasi, Audit, Sispot)
│   ├── middlewares/        # Proteksi Autentikasi JWT, RBAC, dan Validasi Upload
│   ├── routes/             # Rute Endpoint REST API
│   ├── uploads/            # Direktori Terproteksi Penyimpanan Berkas SPK
│   ├── .env.example        # Template Variabel Lingkungan Publik
│   ├── server.js           # Titik Masuk Server Express (Security Hardened)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Komponen UI, Layout, Sidebar, Navbar
│   │   ├── context/        # Pengaturan Tema, Shift, dan Bahasa
│   │   ├── pages/          # Halaman Aplikasi (Login, Dashboard, Planning, Realisasi)
│   │   ├── App.jsx         # Manajemen Rute & Pembatasan Hak Akses
│   │   └── main.jsx
│   └── package.json
│
├── .gitignore              # Pengecualian Berkas Sensitif & Output Build
└── README.md               # Dokumentasi Sistem
```

---

## 📄 Lisensi & Hak Penggunaan
Sistem ini dikembangkan secara khusus untuk operasional manufaktur **Area Busa 2**.  
Seluruh hak cipta dilindungi undang-undang untuk penggunaan internal organisasi.
