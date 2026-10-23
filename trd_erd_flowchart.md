# 📘 DOKUMEN TEKNIS SISTEM (TRD, ERD, DAN FLOWCHART)
## Sistem Perencanaan Produksi & Monitoring Realisasi (Area Busa 2)

**Versi Dokumen:** 1.0  
**Tanggal:** 16 Oktober 2026  
**Lini Produksi:** Area Busa 2 (Mesin Horizontal, Vertikal, Carousel)  
**Status:** Approved / Production-Ready  

Dokumen fisik lengkap telah tersimpan di: [docs/TRD_ERD_FLOWCHART.md](file:///c:/Users/ASUS/OneDrive/Dokumen/MAGANG/Gabungan%20Mesin/Sistem%20Mesin/docs/TRD_ERD_FLOWCHART.md)

---

## 📑 DAFTAR ISI
1. [BAGIAN 1: TECHNICAL REQUIREMENTS DOCUMENT (TRD)](#bagian-1-technical-requirements-document-trd)
   - 1.1 Latar Belakang & Tujuan
   - 1.2 Arsitektur Sistem (High-Level Architecture)
   - 1.3 Tech Stack & Spesifikasi Lingkungan
   - 1.4 Kebutuhan Fungsional per Modul (FR)
   - 1.5 Kebutuhan Non-Fungsional (NFR)
   - 1.6 Desain REST API Endpoints
   - 1.7 Keamanan & Role-Based Access Control (RBAC)
2. [BAGIAN 2: ENTITY RELATIONSHIP DIAGRAM (ERD)](#bagian-2-entity-relationship-diagram-erd)
   - 2.1 Visualisasi ERD (Mermaid Diagram)
   - 2.2 Kamus Data & Relasi Entitas
3. [BAGIAN 3: FLOWCHART SISTEM](#bagian-3-flowchart-sistem)
   - 3.1 Flowchart 1: Alur Kerja Terintegrasi Sistem (Global Workflow)
   - 3.2 Flowchart 2: Alur Proses Perencanaan SPK (PPC Planning)
   - 3.3 Flowchart 3: Alur Proses Realisasi Produksi (Operator Cutting)
   - 3.4 Flowchart 4: Alur Manajemen Siklus Stok Sisa Potong (Sispot Lifecycle)

---

# BAGIAN 1: TECHNICAL REQUIREMENTS DOCUMENT (TRD)

### 1.1 Latar Belakang & Tujuan
Lini produksi **Area Busa 2** bertanggung jawab memotong balokan busa (*polyurethane foam blocks*) menjadi produk setengah jadi maupun produk jadi sesuai pesanan Work Order (WO) pelanggan. Proses pemotongan melibatkan 3 jenis mesin utama:
- **Mesin Horizontal (HRZ):** Pemotongan ketebalan busa lembaran secara mendatar.
- **Mesin Vertikal (VRT):** Pemotongan ukuran panjang dan lebar balok secara tegak.
- **Mesin Carousel (CRS):** Pemotongan berputar kontinyu untuk kapasitas tinggi.

Tujuan teknis sistem ini adalah:
1. Mengotomatiskan konversi pesanan SPK dari dokumen Excel menjadi kebutuhan bahan baku, kubikasi ($m^3$), estimasi waktu siklus (*cycle time*), dan alokasi *man power*.
2. Menyinkronkan target rencana PPC dengan hasil potong aktual operator secara *real-time*.
3. Mengukur efektivitas operasional melalui kalkulasi **OEE (Overall Equipment Effectiveness)**: *Availability*, *Performance*, dan *Quality Rate*.
4. Mengendalikan limbah potongan busa melalui sistem inventori **Stok Sisa Potong (Sispot)** untuk efisiensi biaya material.

---

### 1.2 Arsitektur Sistem (High-Level Architecture)

Sistem menggunakan pola arsitektur **Three-Tier Client-Server Architecture**:
```
+-------------------------------------------------------------+
|                  PRESENTATION LAYER                         |
|     React 19 + Vite 8 + TailwindCSS v4 + Recharts           |
|   (SPA Client: Multi-Role Dashboard & Mobile/PC Friendly)   |
+------------------------------+------------------------------+
                               | HTTP / REST API (JSON)
                               v
+-------------------------------------------------------------+
|                  APPLICATION / BUSINESS LAYER               |
|            Node.js (v18+) + Express 5 REST API              |
|   [Auth RBAC] - [SPK Parser Engine] - [OEE Metric Engine]   |
|   [Realisasi Processor] - [Stock Sisa Potong Controller]     |
+------------------------------+------------------------------+
                               | MySQL Connection Pool (mysql2)
                               v
+-------------------------------------------------------------+
|                      DATA LAYER                             |
|          MySQL 8.x Database (dashboard_vertikal)            |
|   InnoDB Engine, Foreign Keys, UTF8MB4, Timestamped Logs    |
+------------------------------+------------------------------+
```

---

### 1.3 Tech Stack & Spesifikasi Lingkungan

| Layer | Komponen / Library | Versi | Fungsi / Alasan Pemilihan |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | 19.2 | Library antarmuka berbasis komponen modular reaktif. |
| | Vite | 8.2 | Build tool & bundler berkecepatan tinggi dengan HMR instan. |
| | Tailwind CSS | 4.3 | Utility-first styling untuk desain antarmuka modern & dark mode. |
| | Recharts | 3.10 | Pustaka visualisasi grafik (Bar, Line, Pie, Trend Analysis). |
| | Axios | 1.19 | HTTP Client untuk komunikasi API asynchronous. |
| | Lucide React | 1.28 | Ikon antarmuka modern yang konsisten. |
| **Backend** | Node.js | >= 18 LTS | Runtime environment asynchronous event-driven. |
| | Express | 5.2 | Web framework REST API minimalis dan cepat. |
| | mysql2/promise | 3.23 | Driver database MySQL dengan koneksi pooling teroptimasi. |
| | xlsx (SheetJS) | 0.18 | Parser file spreadsheet SPK Excel (`.xls`, `.xlsx`). |
| | Multer | 2.2 | Middleware upload file mutipart/form-data. |
| **Database** | MySQL | 8.0+ | RDBMS ACID-compliant dengan dukungan indexing performa tinggi. |

---

### 1.4 Kebutuhan Fungsional per Modul (FR)

#### FR-01: Modul Autentikasi & RBAC
- Sistem menyediakan login berbasis kredensial (Username & Password).
- Sesi pengguna disimpan pada `localStorage` browser dan dikirim via header request `x-user-role`.
- Tiga level akses:
  - **Superadmin:** Akses penuh ke seluruh menu, CRUD Sisa Potong, dan Master Database.
  - **PPC:** Akses Planning, Insert SPK, OEE Planning, dan View Sisa Potong.
  - **Operator:** Akses Input Realisasi, Log Hasil, OEE Realisasi, dan View Sisa Potong.

#### FR-02: Modul Perencanaan SPK (PPC)
- **Upload File SPK:** Menerima file Excel (`.xls`, `.xlsx`) dan mem-parsing baris WO.
- **Copy-Paste Manual:** Menyediakan input teks langsung untuk paste data tabel dari spreadsheet.
- **Auto-Calculations:**
  - Kubikasi Hasil ($m^3$) = $\frac{P \times L \times T \times Qty}{1.000.000}$
  - Cycle Time Matching: Memetakan nama kualitas busa dan ketebalan ke tabel `cycle_time_matrix`.
  - Prediksi Short Block (SB) dan Estimasi Man Power berdasarkan `mesin_manpower`.
- **Date Filter:** Dashboard planning mendukung peninjauan target tanggal lampau maupun sekarang.

#### FR-03: Modul Realisasi Produksi (Operator)
- Pemilihan jenis mesin (*Vertikal* atau *Horizontal/Carousel*).
- Pencatatan pemotongan aktual: Good Qty, Waste Kulit, Waste Samping, Waste Potong, dan Waste Produksi (Defect).
- Pencatatan Downtime Mesin: Kode kendala, jam awal, jam akhir, dan durasi otomatis dalam jam/menit.
- Ekspor log data hasil pemotongan ke format PDF dan Excel.

#### FR-04: Modul Stok Sisa Potong (Sispot)
- **Otomatisasi:** Setiap potongan sisa yang masih dapat digunakan dari input realisasi otomatis masuk ke tabel `stok_sisa_potong` dengan status `Tersedia` (`is_used = 0`).
- **Analitik Sispot:** Proporsi ketersediaan, Top 5 kualitas busa sisa terbanyak, dan pengelompokan umur simpan (*aging*: Hari ini, 1-3 hari, 4-7 hari, >7 hari).
- **CRUD Superadmin Protection:**
  - Tambah sisa potong manual (*Create*), perbarui dimensi/kualitas (*Update*), dan hapus (*Delete*) **hanya dapat dieksekusi oleh Superadmin** baik di sisi UI maupun verifikasi server (`403 Forbidden` untuk non-superadmin).

#### FR-05: Modul OEE Calculation Engine
- Menghitung efektivitas peralatan dengan rumus standar industri:
  $$\text{Availability} = \frac{\text{Waktu Operasi Bersih}}{\text{Waktu Shift Tersedia}} \times 100\%$$
  $$\text{Performance} = \frac{\text{Output Aktual} \times \text{Ideal Cycle Time}}{\text{Waktu Operasi}} \times 100\%$$
  $$\text{Quality} = \frac{\text{Total Output} - \text{Defect Output}}{\text{Total Output}} \times 100\%$$
  $$\text{OEE Score} = \text{Availability} \times \text{Performance} \times \text{Quality}$$
- Menyediakan grafik tren OEE 7 hari terakhir dengan batas ambang minimum efisiensi (*threshold*) 80%.

---

### 1.5 Kebutuhan Non-Fungsional (NFR)

| Kategori | Spesifikasi & Standar Target |
| :--- | :--- |
| **Performa** | Waktu respon API rata-rata $\le 200\text{ ms}$; loading dashboard $\le 1.5\text{ detik}$. |
| **Kapasitas** | Mendukung hingga $\ge 1.000.000$ transaksi baris potong dengan pengindeksan MySQL (*B-Tree index* pada `no_barcode`, `tanggal`, `is_used`, `identitas_id`). |
| **Keamanan** | Server-side validation pada header `x-user-role`; sanitasi input SQL parameterized query anti SQL Injection. |
| **Reliabilitas** | MySQL Connection Pool mengelola sambungan database secara otomatis tanpa *memory leak*. |
| **User Experience** | Transisi halaman halus (*page fade slide*), accordion submenu berbasis CSS Grid natural, dan responsif terhadap perangkat desktop/tablet. |

---

### 1.6 Desain REST API Endpoints

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/spk/upload` | Upload & parsing file SPK Excel | PPC, Superadmin |
| `POST` | `/api/spk/manual` | Simpan data SPK hasil input manual/copas | PPC, Superadmin |
| `GET` | `/api/spk/efisiensi` | Ambil data kalkulasi OEE Planning per tanggal | Semua Role |
| `GET` | `/api/spk/chart` | Ambil histori kubikasi & tren SPK harian | Semua Role |
| `GET` | `/api/realisasi` | Ambil seluruh data transaksi realisasi | Semua Role |
| `POST` | `/api/realisasi/vertical` | Simpan transaksi pemotongan mesin vertikal | Operator, Superadmin |
| `POST` | `/api/realisasi/carousel` | Simpan transaksi pemotongan horizontal/carousel | Operator, Superadmin |
| `GET` | `/api/realisasi/sisa-potong/all` | Ambil semua data inventori sisa potong | Semua Role |
| `POST` | `/api/realisasi/sisa-potong` | Tambah manual sisa potong | **Khusus Superadmin** |
| `PUT` | `/api/realisasi/sisa-potong/:id` | Update data sisa potong | **Khusus Superadmin** |
| `DELETE` | `/api/realisasi/sisa-potong/:id` | Hapus data sisa potong | **Khusus Superadmin** |
| `GET` | `/api/matrix` | Ambil data master cycle time matrix | Semua Role |
| `POST` | `/api/matrix` | Tambah/update master cycle time | **Khusus Superadmin** |

---

# BAGIAN 2: ENTITY RELATIONSHIP DIAGRAM (ERD)

### 2.1 Visualisasi ERD

```mermaid
erDiagram
    UPLOAD_HISTORY ||--o{ SPK_ITEMS : "memiliki detail"
    REALISASI_IDENTITAS ||--o{ REALISASI_VERTICAL : "menghasilkan potong vertikal"
    REALISASI_IDENTITAS ||--o{ REALISASI_CAROUSEL : "menghasilkan potong horizontal"
    REALISASI_IDENTITAS ||--o{ STOK_SISA_POTONG : "menghasilkan sisa potong"
    MACHINES ||--o{ MACHINE_HEALTH : "memiliki status kesehatan"

    UPLOAD_HISTORY {
        int id PK
        varchar nama_file
        varchar file_unik
        varchar tipe_file
        varchar diupload_oleh
        datetime tanggal_upload
        int shift
        int total_item
        varchar status
        text mesin_digunakan
    }

    SPK_ITEMS {
        int id PK
        int history_id FK
        text no_wo
        text customer
        varchar nama_item
        decimal qty
        decimal estimasi_waktu_menit
        varchar spk_cutting
        decimal ukuran_p
        decimal ukuran_l
        decimal ukuran_t
        decimal bahan_baku_p
        decimal bahan_baku_l
        decimal bahan_baku_t
        varchar tipe_mesin
        decimal tinggi_balokan
        decimal prediksi_sb
    }

    REALISASI_IDENTITAS {
        int id PK
        varchar no_barcode
        varchar kualitas
        date tanggal
        varchar no_spk
        varchar nama_operator
        varchar shift
        decimal asal_p
        decimal asal_l
        decimal asal_t
        int asal_qty
        text keterangan_kondisi
        varchar grup
        varchar status
        decimal waste_produksi_p
        decimal waste_produksi_l
        decimal waste_produksi_t
        int waste_produksi_qty
        timestamp created_at
    }

    REALISASI_VERTICAL {
        int id PK
        int identitas_id FK
        decimal hasil_p
        decimal hasil_l
        decimal hasil_t
        int hasil_qty
        decimal waste_samping_p
        decimal waste_samping_l
        decimal waste_samping_t
        int waste_samping_qty
        decimal sisa_p
        decimal sisa_l
        decimal sisa_t
        int sisa_qty
        varchar dt_kode
        time dt_jam_awal
        time dt_jam_akhir
        text dt_keterangan
        varchar no_mesin
    }

    REALISASI_CAROUSEL {
        int id PK
        int identitas_id FK
        varchar no_wo
        varchar tipe_mesin
        decimal hasil_p
        decimal hasil_l
        decimal hasil_t
        int hasil_qty
        decimal waste_kulit_t
        int waste_kulit_qty
        decimal sispot_p
        decimal sispot_l
        decimal sispot_t
        int sispot_qty
        decimal waste_potong_t
        int waste_potong_qty
        decimal waste_produksi_p
        decimal waste_produksi_l
        decimal waste_produksi_t
        int waste_produksi_qty
        varchar no_mesin
        varchar dt_kode
        time dt_jam_awal
        time dt_jam_akhir
    }

    STOK_SISA_POTONG {
        int id PK
        int identitas_id FK
        varchar no_barcode
        varchar kualitas
        varchar sumber_potong
        float p
        float l
        float t
        int qty
        tinyint is_used
        timestamp created_at
    }

    CYCLE_TIME_MATRIX {
        int id PK
        varchar nama_item
        varchar varians
        varchar tipe_mesin
        decimal cycle_time_menit
        decimal ct_c1
        decimal ct_c2
        decimal ct_c3
        decimal ct_ptu
        decimal ct_pma
        decimal ct_pmu
        decimal tinggi_balokan_standar
    }

    MACHINES {
        int id PK
        varchar kode_mesin UK
        enum status
    }

    MACHINE_HEALTH {
        int id PK
        varchar mesin_id FK
        date tanggal
        tinyint shift
        float downtime
        int output_pcs
        int defects
        float availability
        float performance_eff
        float quality_rate
        float oee
        enum status
    }

    MESIN_MANPOWER {
        int id PK
        varchar tipe_mesin UK
        int total_mesin
        int manpower_per_mesin
    }
```

---

### 2.2 Kamus Data & Relasi Entitas

1. **`upload_history` ke `spk_items` (One-to-Many - 1:N)**:
   - Satu sesi unggah dokumen SPK (`upload_history.id`) memuat banyak rincian baris pesanan Work Order (`spk_items.history_id`).
   - *Cascading Delete:* Jika dokumen unggah dihapus, rincian SPK ikut terhapus.
2. **`realisasi_identitas` ke `realisasi_vertical` / `realisasi_carousel` (One-to-Many - 1:N)**:
   - `realisasi_identitas` adalah entitas induk (header) balok busa asal (barcode induk, dimensi awal, operator, shift).
   - Satu balok busa asal dapat dipotong menjadi beberapa ukuran hasil jadi vertikal atau horizontal/carousel.
3. **`realisasi_identitas` ke `stok_sisa_potong` (One-to-Many - 1:N)**:
   - Potongan busa sisa yang memiliki nilai guna dicatat ke `stok_sisa_potong` dengan referensi `identitas_id`.
   - Untuk data yang ditambahkan manual oleh Superadmin, `identitas_id` bernilai `NULL`.
4. **`machines` ke `machine_health` (One-to-Many - 1:N)**:
   - Memantau metrik performa dan riwayat kesehatan harian per mesin berdasarkan `kode_mesin`.

---

# BAGIAN 3: FLOWCHART SISTEM

### 3.1 Flowchart 1: Alur Kerja Terintegrasi Sistem (Global Workflow)

```mermaid
flowchart TD
    Start([Mulai]) --> Login[Pengguna Login ke Sistem]
    Login --> RoleCheck{Cek Role Pengguna}
    
    %% Alur PPC
    RoleCheck -->|Role: PPC / Superadmin| MenuPlanning[Buka Menu Planning]
    MenuPlanning --> InputSPK[Upload File SPK Excel / Copas Text]
    InputSPK --> ParseEngine[Engine Parsing & Auto-Fill Kubikasi]
    ParseEngine --> SimpanSPK[(Database: upload_history & spk_items)]
    SimpanSPK --> DashPlan[Pantau Dashboard Planning & Prediksi OEE]

    %% Alur Operator
    RoleCheck -->|Role: Operator / Superadmin| MenuRealisasi[Buka Menu Realisasi]
    MenuRealisasi --> PilihMesin{Pilih Jenis Mesin}
    PilihMesin -->|Vertikal| FormV[Input Potong Vertikal & Waste]
    PilihMesin -->|Horizontal/Carousel| FormH[Input Potong Horizontal & Waste]
    
    FormV --> CekSisaV{Ada Sisa Potong?}
    FormH --> CekSisaH{Ada Sisa Potong?}
    
    CekSisaV -->|Ya| AutoSispotV[Generate Otomatis Stok Sisa Potong]
    CekSisaH -->|Ya| AutoSispotH[Generate Otomatis Stok Sisa Potong]
    CekSisaV -->|Tidak| SimpanReal[(Database: realisasi_identitas & detail)]
    CekSisaH -->|Tidak| SimpanReal
    AutoSispotV --> SimpanReal
    AutoSispotH --> SimpanReal

    %% Alur Evaluasi Manajemen
    SimpanSPK --> CompareEngine[Engine Komparasi Plan vs Real]
    SimpanReal --> CompareEngine
    CompareEngine --> DashComp[Dashboard Planning vs Realisasi]
    DashComp --> AnalisisOEE[Analisis OEE, Downtime, Defect & Gap Kubikasi]
    AnalisisOEE --> End([Selesai])
```

---

### 3.2 Flowchart 2: Alur Proses Perencanaan SPK (PPC Planning)

```mermaid
flowchart TD
    A[PPC Buka Form Insert SPK] --> B{Pilih Metode Input}
    B -->|Upload File| C1[Pilih File Excel .xls / .xlsx]
    C1 --> C2[Parser XLSX SheetJS Ekstrak Baris]
    B -->|Copy-Paste| D1[Paste Teks Tabel dari Spreadsheet]
    D1 --> D2[Regex & Tab Separator Parser]
    
    C2 --> E[Ekstraksi Kolom: No WO, Customer, Kualitas, Dimensi P x L x T, Qty]
    D2 --> E
    
    E --> F[Pencocokan Nama Kualitas ke cycle_time_matrix]
    F --> G{Item Cocok di DB Matrix?}
    G -->|Ya| H1[Terapkan Cycle Time Standar DB]
    G -->|Tidak| H2[Gunakan Default Cycle Time & Tandai Unmatched]
    
    H1 --> I[Hitung Kubikasi M3 = P x L x T x Qty / 1.000.000]
    H2 --> I
    I --> J[Kalkulasi Estimasi Waktu Siklus per Mesin VRT, HRZ, CRS]
    J --> K[Kalkulasi Rekomendasi Man Power Berdasarkan Kelas Mesin 420 Menit/Shift]
    K --> L[Tampilkan Tabel Pratinjau Rekapitulasi SPK]
    L --> M{PPC Konfirmasi Simpan?}
    M -->|Batal/Edit| L
    M -->|Ya| N[Kirim Request POST /api/spk/upload ke Server]
    N --> O[(Simpan ke Database MySQL)]
    O --> P[Notifikasi Berhasil & Redirect ke Dashboard Planning]
```

---

### 3.3 Flowchart 3: Alur Proses Realisasi Produksi (Operator Cutting)

```mermaid
flowchart TD
    A[Operator Buka Form Input Realisasi] --> B[Pilih Tanggal, Shift, & Nama Operator]
    B --> C[Input / Scan Barcode Balokan Busa Asal]
    C --> D[Pilih Kualitas Busa & Dimensi Awal Balok]
    D --> E{Pilih Mesin Pemotongan}
    
    %% Vertikal
    E -->|Mesin Vertikal| V1[Input Dimensi Hasil Jadi P x L x T & Qty Jadi]
    V1 --> V2[Input Waste Samping, Depan/Belakang]
    V2 --> V3{Terdapat Sisa Potong Balok?}
    V3 -->|Ya| V4[Input Dimensi Sisa Potong P x L x T & Qty]
    V3 -->|Tidak| V5[Lewati Sisa Potong]
    V4 --> V6{Terjadi Downtime Mesin?}
    V5 --> V6
    
    %% Horizontal
    E -->|Mesin Horizontal / Carousel| H1[Input No WO & Dimensi Hasil Lembaran]
    H1 --> H2[Input Waste Kulit & Waste Potong]
    H2 --> H3{Terdapat Sisa Potong Lembaran?}
    H3 -->|Ya| H4[Input Dimensi Sispot Lembaran P x L x T & Qty]
    H3 -->|Tidak| H5[Lewati Sispot]
    H4 --> V6
    H5 --> V6
    
    V6 -->|Ya| DT1[Pilih Kode Downtime & Jam Mulai s.d Selesai]
    V6 -->|Tidak| DT2[Downtime = 0]
    DT1 --> SIMPAN
    DT2 --> SIMPAN
    
    SIMPAN[Klik Simpan Realisasi] --> API[Kirim POST ke Backend API]
    API --> DB[(Tulis ke realisasi_identitas, detail potong, & stok_sisa_potong)]
    DB --> OUT[Perbarui Stok Real-Time & Tampilkan di Hasil Realisasi]
```

---

### 3.4 Flowchart 4: Alur Manajemen Siklus Stok Sisa Potong (Sispot Lifecycle)

```mermaid
flowchart TD
    subgraph INVENTORI["1. Sumber Penambahan Sisa Potong"]
        S1[Hasil Potong Aktual Operator Mesin] -->|Otomatis| S3[Tercatat di Tabel stok_sisa_potong]
        S2[Busa Sisa Temuan Gudang / Input Manual] --> S4[Superadmin Klik + Tambah Manual]
        S4 --> S5{Verifikasi Role: Superadmin?}
        S5 -->|Bukan Superadmin| S6[Akses Ditolak: 403 Forbidden]
        S5 -->|Superadmin Valid| S7[Input Form: Kualitas, Ukuran, Qty]
        S7 --> S3
    end

    subgraph MONITORING["2. Pemantauan & Analitik Stok Sispot"]
        S3 --> M1[Sistem Menghitung Aging / Lama Hari Simpan]
        M1 --> M2[Kategori Umur: Hari ini, 1-3 Hari, 4-7 Hari, > 7 Hari]
        M2 --> M3[Tampilkan Indikator Visual & Top 5 Kualitas Busa]
    end

    subgraph UTILISASI["3. Pemanfaatan / Pengurangan Stok"]
        M3 --> U1[PPC/Operator Cari Sispot Tersedia untuk WO Baru]
        U1 --> U2{Busa Sisa Digunakan untuk Potong Baru?}
        U2 -->|Ya| U3[Update Status Sispot: is_used = 1 Terpakai]
        U2 -->|Batal/Rusak| U4{Superadmin Hapus Data?}
        U4 -->|Ya| U5[Request DELETE oleh Superadmin]
        U5 --> U6[Data Terhapus dari DB]
        U3 --> U7[Efisiensi Material Tercapai]
    end
```
