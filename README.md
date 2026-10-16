# 🏭 Sistem Perencanaan Produksi & Monitoring Realisasi (Area Busa 2)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

Sistem aplikasi web terintegrasi yang dirancang khusus untuk lini produksi **Area Busa 2** (pemotongan busa dengan mesin **Horizontal**, **Vertikal**, dan **Carousel**). Sistem ini menghubungkan alur kerja **PPC** (Production Planning & Control) dan **Operator Produksi** secara *real-time*, memprediksi kebutuhan man power & mesin, menghitung Overall Equipment Effectiveness (**OEE**), serta memantau perputaran **Stok Sisa Potong (Sispot)**.

---

## 📑 Daftar Isi

- [Tentang Sistem](#-tentang-sistem)
- [Hak Akses & Akun Pengguna](#-hak-akses--akun-pengguna)
- [Tata Cara Penggunaan Website](#-tata-cara-penggunaan-website)
  - [1. Login ke Sistem](#1-login-ke-sistem)
  - [2. Alur Kerja PPC (Perencanaan Produksi)](#2-alur-kerja-ppc-perencanaan-produksi)
  - [3. Alur Kerja Operator (Input & Monitoring Realisasi)](#3-alur-kerja-operator-input--monitoring-realisasi)
  - [4. Evaluasi Planning vs Realisasi](#4-evaluasi-planning-vs-realisasi)
  - [5. Manajemen Stok Sisa Potong (CRUD Superadmin)](#5-manajemen-stok-sisa-potong-crud-superadmin)
  - [6. Master Database Mesin & Cycle Time](#6-master-database-mesin--cycle-time)
  - [7. Personalisasi & Pengaturan](#7-personalisasi--pengaturan)
- [Instalasi & Menjalankan Aplikasi](#-instalasi--menjalankan-aplikasi)
- [Struktur Direktori Proyek](#-struktur-direktori-proyek)

---

## 💡 Tentang Sistem

Aplikasi ini mengatasi tantangan dalam proses pemotongan busa lembaran dan balok:
1. **Perhitungan Kubikasi & Cycle Time Otomatis**: Menghilangkan perhitungan manual manual book/excel untuk alokasi man power dan jam kerja mesin.
2. **Sinkronisasi Target vs Aktual**: Membandingkan SPK harian PPC dengan hasil potong aktual operator secara real-time.
3. **Analisis OEE Prediktif & Aktual**: Menghitung Availability, Performance, dan Quality Rate serta mengidentifikasi faktor downtime dan defect.
4. **Pengendalian Limbah & Stok Sisa Potong**: Mencatat sisa potongan blok busa agar dapat dimanfaatkan kembali pada pesanan lain.

---

## 👥 Hak Akses & Akun Pengguna

Sistem menerapkan **Role-Based Access Control (RBAC)** untuk menjaga integritas data dan keamanan operasional:

| Role | Deskripsi Wewenang | Akses Menu Utama |
| :--- | :--- | :--- |
| **Superadmin** | Kontrol sistem penuh | Semua Menu, **CRUD Stok Sisa Potong**, Master Database & Cycle Time |
| **PPC** | Pengelola Perencanaan Produksi | Dashboard Planning, Insert SPK, Efisiensi/Predictive OEE, View Sisa Potong |
| **Operator** | Pelaksana Pemotongan di Mesin | Input Realisasi, Log Hasil Realisasi, Predictive OEE Realisasi, View Sisa Potong |

## 🚀 Tata Cara Penggunaan Website

### 1. Login ke Sistem
1. Buka aplikasi di browser (secara default: `http://localhost:5173`).
2. Masukkan **Username** dan **Password** sesuai role Anda.
3. Klik tombol **Login**. Sistem akan menyimpan sesi aktif dan mengarahkan Anda ke dashboard sesuai hak akses.
4. Jam kerja dan shift aktif (**Shift 1**, **Shift 2**, atau **Shift 3**) akan otomatis terdeteksi di pojok kanan atas layar.

---

### 2. Alur Kerja PPC (Perencanaan Produksi)

#### A. Input / Unggah SPK (`/insert-spk`)
> *Menu ini dapat diakses oleh role **PPC** dan **Superadmin**.*
1. Buka menu **Planning** > **Insert Planning**.
2. Pilih metode input data:
   - **Upload File Excel**: Unggah file format `.xls` atau `.xlsx` yang berisi daftar Work Order (WO).
   - **Copy-Paste dari Excel**: Salin baris tabel dari spreadsheet dan tempelkan langsung ke area input teks yang disediakan.
3. Sistem secara otomatis memproses:
   - Dimensi pemotongan ($P \times L \times T$).
   - Kuantitas ($Qty$) dan jenis kualitas busa.
   - Perhitungan total kubikasi ($m^3$) per mesin (Horizontal, Vertikal, Carousel).
   - Estimasi jumlah orang (man power) dan waktu pengerjaan.
4. Periksa tabel rekapitulasi data yang muncul, lalu klik **Simpan Planning SPK**.

#### B. Dashboard Planning (`/dashboard-planning`)
1. Buka menu **Planning** > **Dashboard Planning**.
2. Gunakan **Pemilih Tanggal** di bagian atas untuk memilih tanggal rencana produksi yang ingin ditinjau (bisa memilih hari ini maupun tanggal lampau).
3. Anda akan melihat:
   - Total Target Kubikasi ($m^3$) dan Target Pcs.
   - Estimasi Kebutuhan Operator/Man Power.
   - Grafik distribusi beban kerja antar mesin.
   - Daftar Work Order (WO) yang siap dipotong.

#### C. Prediksi OEE Planning (`/efisiensi`)
- Menampilkan simulasi efisiensi rencana kerja:
  - **Availability Rate**: Perbandingan antara waktu operasional bersih vs waktu shift.
  - **Performance Rate**: Kecepatan potong ideal terhadap target rencana.
  - **Quality Rate**: Estimasi hasil potong standar terhadap potensi reject.

---

### 3. Alur Kerja Operator (Input & Monitoring Realisasi)

#### A. Input Hasil Pemotongan Aktual (`/realisasi/input`)
1. Buka menu **Realisasi** > **Input Realisasi**.
2. Pilih jenis mesin yang digunakan (**Mesin Vertikal** atau **Mesin Horizontal**).
3. Pilih nomor Work Order (WO) / Barcode Induk yang sedang dikerjakan.
4. Masukkan data aktual pemotongan:
   - Jumlah potongan jadi (Good Output).
   - Ukuran sisa potongan busa (jika ada sisa yang masih dapat digunakan).
   - Waste produksi (kulit busa, pinggiran, dll.).
5. Jika terjadi kendala mesin, masukkan **Downtime**:
   - Pilih kategori downtime (ganti pisau, maintenance, setting mesin, material habis, dll.).
   - Catat durasi waktu dalam menit.
6. Klik **Simpan Realisasi**. Sistem otomatis:
   - Mengurangi target sisa WO.
   - Menyimpan sisa potongan busa ke dalam **Stok Sisa Potong**.

#### B. Log Hasil Realisasi (`/realisasi/hasil`)
1. Buka menu **Realisasi** > **Hasil Realisasi**.
2. Tinjau riwayat pemotongan yang telah selesai dikerjakan.
3. Anda dapat memfilter berdasarkan rentang tanggal, shift kerja, atau mesin.
4. Gunakan fitur **Export PDF / Excel** untuk mencetak bukti rekapitulasi harian.

#### C. Dashboard & Prediktif OEE Realisasi (`/realisasi/predictive-oee`)
- Menyajikan perolehan **OEE Aktual**:
  $$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$
- Menampilkan grafik pareto downtime dan analisis defect aktual per mesin.

---

### 4. Evaluasi Planning vs Realisasi

Buka menu utama **Dashboard Planning vs Realisasi** (`/planning-vs-realisasi`):
- **Capaian Kubikasi ($m^3$)**: Menampilkan perbandingan batang grafik antara target yang dibuat PPC dan hasil potong aktual operator.
- **Tingkat Deviasi (Gap Analysis)**: Mengetahui apakah produksi mengalami *over-capacity*, sesuai target, atau tertunda (*delay*).
- **Efisiensi Mesin**: Membandingkan efisiensi mesin Vertikal, Horizontal, dan Carousel dalam satu layar terpusat.

---

### 5. Manajemen Stok Sisa Potong (CRUD Superadmin)

Menu **Stok Sisa Potong** (`/realisasi/stok-sisa-potong`) berfungsi mengelola ketersediaan sisa balok atau lembaran busa yang dapat digunakan kembali untuk pesanan lain.

#### A. Tampilan untuk Semua Pengguna (View Only)
- Melihat indikator ringkasan:
  - **Proporsi Status**: Jumlah stok sisa yang *Tersedia* vs *Terpakai*.
  - **Top 5 Kualitas**: Busa yang paling banyak memiliki sisa stok.
  - **Aging (Umur Sisa Potong)**: Kategori lama penyimpanan (Hari ini, 1-3 Hari, 4-7 Hari, > 7 Hari).
- Filter pencarian berdasarkan:
  - Input teks: Mencari berdasarkan Barcode atau Kualitas Busa.
  - Tanggal Pemotongan.
  - Status (*Semua*, *Tersedia Saja*, *Terpakai*).

#### B. Operasi CRUD (Khusus Role Superadmin) 🔒
> [!IMPORTANT]
> Fitur Create, Update, dan Delete pada Stok Sisa Potong diproteksi ketat. Hanya pengguna yang masuk sebagai **Superadmin** yang dapat melihat tombol aksi dan melakukan perubahan data.

1. **Tambah Sisa Potong Manual (Create)**:
   - Klik tombol **`+ Tambah Manual`** di pojok kanan atas banner.
   - Isi form: Kualitas busa, Barcode Induk (opsional), Sumber Sisa (Manual/Vertical/Horizontal), Dimensi ($P \times L \times T$), dan Qty.
   - Klik **Simpan Data**.
2. **Ubah Data Sisa Potong (Update)**:
   - Klik ikon pensil (**Edit**) pada baris data yang ingin diperbarui.
   - Sesuaikan dimensi, kualitas, atau jumlah kuantitas.
   - Klik **Simpan Data**.
3. **Hapus Data Sisa Potong (Delete)**:
   - Klik ikon tempat sampah (**Hapus**) pada baris data.
   - Konfirmasi pada modal dialog penghapusan. Data akan terhapus secara permanen dari basis data.

---

### 6. Master Database Mesin & Cycle Time

> *Khusus untuk role **Superadmin**.*

Buka menu **Database**:
- **Mesin Vertikal, Horizontal, & Carousel**: Mengatur tabel cycle time pemotongan per density dan ketebalan.
- **Matriks Ketinggian & Density**: Standarisasi bobot dan densitas busa ($D16, D23, D40,$ dll.).
- **Mesin & Orang**: Alokasi rasio jumlah operator ideal terhadap kecepatan putar pisau mesin.

---

### 7. Personalisasi & Pengaturan

Buka menu **Pengaturan** (`/setting`) di sidebar bawah:
- **Tampilan Gelap / Terang (Dark Mode)**: Mengubah tema warna aplikasi sesuai kenyamanan operator di lapangan.
- **Bahasa**: Tersedia pilihan Bahasa Indonesia dan Bahasa Inggris.
- **Shift Pabrik**: Konfigurasi rentang jam shift operasional pabrik.

---

## 🛠️ Instalasi & Menjalankan Aplikasi

### Prasyarat
- [Node.js](https://nodejs.org/) (Versi 18 LTS atau lebih baru)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (Versi 8.x atau MariaDB 10.x)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/ucupp45/area-busa-2.git
cd area-busa-2
```

### 2. Konfigurasi Backend
1. Buka direktori backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env` di dalam folder `backend/` dan sesuaikan koneksi database MySQL Anda:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password_mysql_anda
   DB_NAME=dashboard_vertikal
   ```
4. Jalankan backend:
   ```bash
   npm run dev
   ```
   *Backend berjalan pada `http://localhost:5000`.*

### 3. Konfigurasi Frontend
1. Buka direktori frontend pada terminal baru:
   ```bash
   cd ../frontend
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan Vite:
   ```bash
   npm run dev
   ```
4. Buka tautan lokal yang ditampilkan (biasanya `http://localhost:5173`) di browser Anda.

---

## 📁 Struktur Direktori Proyek

```text
area-busa-2/
├── backend/
│   ├── config/             # Koneksi Database (MySQL2 Pool)
│   ├── controllers/        # Logika Bisnis (SPK, Realisasi, Dashboard, Sispot)
│   ├── routes/             # Routing REST API Express
│   ├── uploads/            # Direktori penyimpanan file upload SPK Excel
│   ├── server.js           # Titik masuk utama server Node.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, Sidebar, Navbar, dan UI Reusable
│   │   ├── context/        # Context Settings (Theme, Shift, Bahasa)
│   │   ├── pages/          # Halaman Aplikasi
│   │   │   ├── Login.jsx                 # Halaman Autentikasi
│   │   │   ├── PlanningVsRealisasi.jsx   # Dashboard Utama Komparasi
│   │   │   ├── Dashboard.jsx             # Dashboard Perencanaan PPC
│   │   │   ├── InsertSPK.jsx             # Form Input / Upload SPK
│   │   │   ├── Realisasi.jsx             # Form Input Realisasi Mesin
│   │   │   ├── HasilRealisasi.jsx        # Tabel Log Hasil Realisasi
│   │   │   ├── PredictiveOeeRealisasi.jsx# Analisis OEE Aktual & Defect
│   │   │   ├── SisaPotong.jsx            # Stok Sisa Potong (Role Superadmin CRUD)
│   │   │   ├── DatabaseCycle.jsx         # Master Cycle Time Mesin
│   │   │   └── Setting.jsx               # Pengaturan Profil & Tampilan
│   │   ├── App.jsx         # Routing & Guard Hak Akses
│   │   └── main.jsx
│   └── package.json
│
└── README.md               # Dokumentasi Panduan Penggunaan
```

---

## 📄 Lisensi & Tim Pengembang
Dikembangkan untuk kebutuhan operasional lini **Area Busa 2**.  
Hak cipta dilindungi undang-undang untuk internal pabrik.
