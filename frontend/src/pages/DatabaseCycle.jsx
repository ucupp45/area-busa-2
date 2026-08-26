import React, { useState, useEffect, useCallback } from 'react';
import { Database, Clock, GitMerge, Plus, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import royalCorpLogo from '../assets/royal-corp-logo.jpg';

const DatabaseCycle = () => {
  const matriksVerticalData = [
    { varians: 'I', shortBlock: 'D 16', equivalents: ['D 11', 'D 12', 'D 13', 'D 14', 'D 15', 'RF', 'TF 1', 'TF 2', 'TF 3', 'TFP', 'GR 1', 'GR 2', 'GR 3', 'RK 2'], ct: 1.8 },
    { varians: 'II', shortBlock: 'D 18', equivalents: ['D 19', 'D 20', 'D 22', 'D 23', 'FR 18', 'FR 20', 'FR 22', 'BC 16', 'BC 18', 'BC 21', 'RH 3', 'TF 4', 'TF 5', 'TF 6', 'GR 4', 'GR 5'], ct: 2.0 },
    { varians: 'III', shortBlock: 'D 24', equivalents: ['D 25', 'D 26', 'FR 24', 'HR 24', 'FR 25', 'RHL 25', 'RHL 26', 'RHL 28', 'BC 25', 'HR 26'], ct: 2.2 },
    { varians: 'IV', shortBlock: 'D 40', equivalents: ['D 28', 'D 30', 'D 32', 'D 33', 'D 35', 'D 42', 'D 50', 'D 55', 'FR 30', 'FR 40', 'FRH 40', 'FR 5 - 40', 'FR 8 - 50', 'HR 30', 'HR 35', 'RHL 32', 'RHL 35', 'RHL 50', 'RHL 55', 'GH 55'], ct: 2.3 },
    { varians: 'V', shortBlock: 'R 50', equivalents: ['R 40', 'R 55'], ct: 2.5 },
    { varians: 'VI', shortBlock: 'R 100', equivalents: ['R 70', 'R 90'], ct: 3.6 }
  ];
  const { mesin } = useParams();
  const activeMachine = mesin || 'vertikal';
  const [activeTab, setActiveTab] = useState('cycle_time');
  // ==========================================
  // DATA OPC + CYCLE TIME PER OPERASI (Detik)
  // Sesuai tabel referensi update 14 Juli 2026
  // ==========================================
  const operasiData = [
    { kode: 'O - 1', nama: 'LOADING MATERIAL', mesin: 'MS. VERTIKAL', totalCT: 10.5, opcTime: 10.5007, i: 8.1, ii: 8.4, iii: 8.7, iv: 14.0, v: 13.3, vi: 10.5 },

    { kode: 'O - 2', nama: 'POSITIONING MATERIAL', mesin: 'MS. VERTIKAL', totalCT: 9.8, opcTime: 9.810433333, i: 7.3, ii: 9.9, iii: 8.5, iv: 11.0, v: 9.5, vi: 12.7 },
    { kode: 'O - 3', nama: 'POTONG SISI KE-1', mesin: 'MS. VERTIKAL', totalCT: 16.9, opcTime: 16.94753333, i: 12.1, ii: 13.5, iii: 14.2, iv: 18.5, v: 18.9, vi: 24.6 },
    { kode: 'O - 4', nama: 'POSITIONING MATERIAL', mesin: 'MS. VERTIKAL', totalCT: 14.3, opcTime: 14.28006667, i: 10.8, ii: 15.4, iii: 13.9, iv: 13.0, v: 15.5, vi: 17.0 },
    { kode: 'O - 5', nama: 'POTONG SISI KE-2', mesin: 'MS. VERTIKAL', totalCT: 18.8, opcTime: 18.7574, i: 14.7, ii: 16.1, iii: 18.1, iv: 19.5, v: 15.8, vi: 28.4 },
    { kode: 'O - 6', nama: 'POSITIONING MATERIAL', mesin: 'MS. VERTIKAL', totalCT: 15.4, opcTime: 15.3801, i: 10.3, ii: 11.2, iii: 12.4, iv: 13.0, v: 15.5, vi: 29.9 },
    { kode: 'O - 7', nama: 'POTONG SISI KE-3', mesin: 'MS. VERTIKAL', totalCT: 16.4, opcTime: 16.42966667, i: 13.2, ii: 11.9, iii: 13.9, iv: 13.7, v: 17.3, vi: 28.6 },
    { kode: 'O - 8', nama: 'POSITIONING MATERIAL', mesin: 'MS. VERTIKAL', totalCT: 14.5, opcTime: 14.47103333, i: 10.3, ii: 10.4, iii: 13.5, iv: 12.0, v: 15.5, vi: 25.1 },
    { kode: 'O - 9', nama: 'POTONG SISI KE-4', mesin: 'MS. VERTIKAL', totalCT: 12.9, opcTime: 12.8535, i: 11.7, ii: 10.0, iii: 14.3, iv: 11.0, v: 13.8, vi: 16.4 },
    { kode: 'O - 10', nama: 'UNLOADING', mesin: 'MS. VERTIKAL', totalCT: 15.3, opcTime: 15.2681, i: 11.7, ii: 11.5, iii: 12.8, iv: 14.5, v: 16.7, vi: 24.4 },
  ];

  // Data OPC untuk Diagram Visual - HORIZONTAL MACHINE
  const opcHorizontalData = [
    { kode: 'O - 1', nama: 'SETUP MACHINE', mesin: 'MS. HORIZONTAL', totalCT: 71.1 },
    { kode: 'O - 2', nama: 'SETUP BALOKAN', mesin: 'MS. HORIZONTAL', totalCT: 12.9 },
    { kode: 'O - 3', nama: 'LOADING MATERIAL', mesin: 'MS. HORIZONTAL', totalCT: 4.8 },
    { kode: 'O - 4', nama: 'POSITIONING MATERIAL', mesin: 'MS. HORIZONTAL', totalCT: 5.8 },
    { kode: 'O - 5', nama: 'CUTTING MATERIAL', mesin: 'MS. HORIZONTAL', totalCT: 5.9 },
    { kode: 'O - 6', nama: 'UNLOADING', mesin: 'MS. HORIZONTAL', totalCT: 6.1 },
  ];

  // Data OPC untuk Diagram Visual - CAROUSEL MACHINE
  const opcCarouselData = [
    { kode: 'O - 1', nama: 'SETUP MACHINE', mesin: 'MS. CAROUSEL', totalCT: 145.0 },
    { kode: 'O - 2', nama: 'SETUP BALOKAN', mesin: 'MS. CAROUSEL', totalCT: 16.4 },
    { kode: 'O - 3', nama: 'LOADING MATERIAL', mesin: 'MS. CAROUSEL', totalCT: 18.2 },
    { kode: 'O - 4', nama: 'POSITIONING MATERIAL', mesin: 'MS. CAROUSEL', totalCT: 36.4 },
    { kode: 'O - 5', nama: 'CUTTING MATERIAL', mesin: 'MS. CAROUSEL', totalCT: 1.6 },
    { kode: 'O - 6', nama: 'UNLOADING', mesin: 'MS. CAROUSEL', totalCT: 37.5 },
  ];

  // Total Cycle Time (Detik) & konversi ke Menit
  const totalData = { i: 110.2, ii: 118.3, iii: 130.4, iv: 140.1, v: 151.8, vi: 217.5 };

  // Konversi ke menit (dibulatkan 2 desimal) — dipakai backend
  const mnitData = {
    i: (110.2 / 60).toFixed(2),
    ii: (118.3 / 60).toFixed(2),
    iii: (130.4 / 60).toFixed(2),
    iv: (140.1 / 60).toFixed(2),
    v: (151.8 / 60).toFixed(2),
    vi: (217.5 / 60).toFixed(2),
  };

  // Data Matriks Short Block
  const matriksShortBlock = [
    { varians: 'I', base: 'D 16', dummy: 'I', ct: 1.8, products: ['D 11', 'D 12', 'D 13', 'D 14', 'D 15', 'RF', 'TF 1', 'TF 2', 'TF 3', 'TFP', 'GR 1', 'GR 2', 'GR 3', 'RK 2'] },
    { varians: 'II', base: 'D 18', dummy: 'II', ct: 2.0, products: ['D 19', 'D 20', 'D 22', 'D 23', 'FR 18', 'FR 20', 'FR 22', 'BC 16', 'BC 18', 'BC 21', 'RH 3', 'TF 4', 'TF 5', 'TF 6', 'GR 4', 'GR 5'] },
    { varians: 'III', base: 'D 24', dummy: 'III', ct: 2.2, products: ['D 25', 'D 26', 'FR 24', 'HR 24', 'FR 25', 'RHL 25', 'RHL 26', 'RHL 28', 'BC 25', 'HR 26'] },
    { varians: 'IV', base: 'D 40', dummy: 'IV', ct: 2.3, products: ['D 28', 'D 30', 'D 32', 'D 33', 'D 35', 'D 42', 'D 50', 'D 55', 'FR 30', 'FR 40', 'FRH 40', 'FR 5 - 40', 'FR 8 - 50', 'HR 30', 'HR 35', 'RHL 32', 'RHL 35', 'RHL 50', 'RHL 55', 'GH 55'] },
    { varians: 'V', base: 'R 50', dummy: 'V', ct: 2.5, products: ['R 40', 'R 55'] },
    { varians: 'VI', base: 'R 100', dummy: 'VI', ct: 3.6, products: ['R 70', 'R 90'] },
  ];
  const maxProductsLength = 20;

  // Data Matriks Short Block — HORIZONTAL MACHINE (8 Varians, 6 kolom CT)
  const matriksHorizontal = [
    { varians: 'I', base: 'D 11', dummy: 'I', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.10, pmu: 0.08, c3: 0.10, products: ['D 12', 'TF1', 'GR 1', 'D 13', 'D 14', 'TF2', 'GR 2', 'D 15', 'D 16', 'TF3', 'TFP', 'GR 3', 'RF'] },
    { varians: 'II', base: 'D 18', dummy: 'II', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.10, pmu: 0.08, c3: 0.10, products: ['D 19', 'TF4', 'GR 4', 'BC 16', 'BC 18', 'FR 18', 'RH 3'] },
    { varians: 'III', base: 'D 20', dummy: 'III', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.10, pmu: 0.08, c3: 0.10, products: ['TF5', 'GR 5', 'FR 20', 'D 22', 'D 23', 'TF6', 'FR 22', 'BC 21', 'RK 2'] },
    { varians: 'IV', base: 'D 24', dummy: 'IV', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.11, pmu: 0.08, c3: 0.10, products: ['D 26', 'D 25', 'TF7', 'BC 25', 'FR 24', 'FR 25', 'RHL 25', 'RHL 26', 'RHL 28', 'HR 24', 'HR 26'] },
    { varians: 'V', base: 'D 28', dummy: 'V', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.10, pmu: 0.08, c3: 0.10, products: ['D 30', 'D 32', 'D 33', 'D 35', 'FR 30', 'RHL 32', 'RHL 35', 'HR 30', 'HR 32', 'HR 35'] },
    { varians: 'VI', base: 'D 40', dummy: 'VI', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.15, pmu: 0.08, c3: 0.10, products: ['D 42', 'D 50', 'D 55', 'GH 55', 'FR 5 - 40', 'FR 8 - 50', 'FR 40', 'FRH 40', 'RHL 50', 'RHL 55', 'RHL 55'] },
    { varians: 'VII', base: 'R 40', dummy: 'VII', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.19, pmu: 0.08, c3: 0.10, products: ['R 50', 'R 55'] },
    { varians: 'VIII', base: 'R 70', dummy: 'VIII', c1: 1.18, c2: 0.10, ptu: 0.02, pma: 0.27, pmu: 0.08, c3: 0.10, products: ['R 90', 'R 100'] },
  ];
  const maxHorizontalProducts = 13;

  // Data Matriks Short Block — CAROUSEL MACHINE (5 Varians, 5 kolom CT — tanpa PMU)
  const matriksCarousel = [
    { varians: 'I', base: 'D 11', dummy: 'I', c1: 2.40, c2: 1.20, ptu: 0.03, pma: 0.36, c3: 0.60, products: ['D 12', 'TF1', 'GR 1', 'D 13', 'D 14', 'TF2', 'GR 2', 'D 15', 'D 16', 'TF3', 'TFP', 'GR 3', 'RF'] },
    { varians: 'II', base: 'D 18', dummy: 'II', c1: 2.40, c2: 1.20, ptu: 0.03, pma: 0.59, c3: 0.60, products: ['D 19', 'TF4', 'GR 4', 'BC 16', 'BC 18', 'FR 18', 'RH 3'] },
    { varians: 'III', base: 'D 20', dummy: 'III', c1: 2.40, c2: 1.20, ptu: 0.03, pma: 0.64, c3: 0.60, products: ['TF5', 'GR 5', 'FR 20', 'D 22', 'D 23', 'TF6', 'FR 22', 'BC 21', 'RK 2'] },
    { varians: 'IV', base: 'D 24', dummy: 'IV', c1: 2.40, c2: 1.20, ptu: 0.03, pma: 0.70, c3: 0.60, products: ['D 25', 'D 26', 'TF7', 'BC 25', 'FR 24', 'FR 25', 'RHL 25', 'RHL 26', 'RHL 28', 'HR 24', 'HR 26', 'D 28', 'D 30', 'D 32', 'D 33', 'D 35', 'FR 30', 'RHL 32', 'RHL 35', 'HR 30', 'HR 32', 'HR 35'] },
    { varians: 'V', base: 'D 40', dummy: 'V', c1: 2.40, c2: 1.20, ptu: 0.03, pma: 0.79, c3: 0.60, products: ['D 42', 'D 50', 'D 55', 'GH 55', 'FR 5 - 40', 'FR 8 - 50', 'FR 40', 'FRH 40', 'RHL 50', 'RHL 55', 'RHL 53', 'R 40', 'R 50', 'R 55', 'R 70', 'R 90', 'R 100'] },
  ];
  const maxCarouselProducts = 22;

  // Data Matriks Short Block — PACKING AREA
  const matriksPacking = [
    { varians: 'I', typePacking: 'WITH TATO', equivalent: 'ALL QUALITY', dummy: 'I', ct: 0.47 },
    { varians: 'II', typePacking: 'WITHOUT TATO', equivalent: 'ALL QUALITY', dummy: 'II', ct: 0.39 },
    { varians: 'III', typePacking: 'WITHOUT PACKING', equivalent: 'ALL QUALITY', dummy: 'III', ct: 0.15 },
  ];

  // Data OPC Horizontal Machine (8 operasi × 8 Varians + kolom L)
  const horizontalOpcData = [
    { codeCT: 'C1', nama: 'SETUP MACHINE', kode: 'O - 1', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 71.1 },
    { codeCT: 'C1', nama: 'SETUP BALOKAN', kode: 'O - 2', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 12.9 },
    { codeCT: 'C1', nama: 'LOADING MATERIAL', kode: 'O - 3', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 4.8 },
    { codeCT: 'C2', nama: 'POSITIONING MATERIAL', kode: 'O - 4', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 5.8 },
    { codeCT: 'PTU', nama: 'PISAU TURUN', kode: 'O - 5A', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 1.3 },
    { codeCT: 'PMA', nama: 'PISAU MAJU', kode: 'O - 5B', i: 5.7, ii: 6.2, iii: 6.3, iv: 6.4, v: 6.8, vi: 8.7, vii: 11.7, viii: 16.2, L: 0.0 },
    { codeCT: 'PMU', nama: 'PISAU MUNDUR', kode: 'O - 5C', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 4.7 },
    { codeCT: 'C3', nama: 'UNLOADING MATERIAL', kode: 'O - 6', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, vi: 0.0, vii: 0.0, viii: 0.0, L: 6.1 },
  ];

  // Data OPC Carousel Machine (7 operasi × 5 Varians + kolom L — tanpa PMU)
  const carouselOpcData = [
    { codeCT: 'C1', nama: 'SETUP MACHINE', kode: 'O - 1', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, L: 145.0 },
    { codeCT: '', nama: 'SETUP BALOKAN', kode: 'O - 2', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, L: 16.4 },
    { codeCT: 'C2', nama: 'LOADING MATERIAL', kode: 'O - 3', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, L: 18.2 },
    { codeCT: '', nama: 'POSITIONING MATERIAL', kode: 'O - 4', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, L: 36.4 },
    { codeCT: 'PTU', nama: 'PISAU TURUN', kode: 'O - 5A', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, L: 1.8 },
    { codeCT: 'PMA', nama: 'PISAU MAJU', kode: 'O - 5B', i: 21.5, ii: 35.2, iii: 38.6, iv: 41.7, v: 47.6, L: 0.0 },
    { codeCT: 'C3', nama: 'UNLOADING MATERIAL', kode: 'O - 6', i: 0.0, ii: 0.0, iii: 0.0, iv: 0.0, v: 0.0, L: 37.5 },
  ];

  const varians = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const varKeys = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];


  const tinggiShortBlockData = [
    { busa: 'BC 16', tinggi: 115 }, { busa: 'BC 18', tinggi: 115 }, { busa: 'BC 21', tinggi: 105 }, { busa: 'BC 25', tinggi: 95 },
    { busa: 'D 11', tinggi: 110 }, { busa: 'D 12', tinggi: 115 }, { busa: 'D 13', tinggi: 115 }, { busa: 'D 14', tinggi: 110 },
    { busa: 'D 15', tinggi: 99 }, { busa: 'D 16', tinggi: 110 }, { busa: 'D 18', tinggi: 110 }, { busa: 'D 19', tinggi: 115 },
    { busa: 'D 20', tinggi: 110 }, { busa: 'D 22', tinggi: 110 }, { busa: 'D 23', tinggi: 105 }, { busa: 'D 24', tinggi: 110 },
    { busa: 'D 25', tinggi: 105 }, { busa: 'D 26', tinggi: 100 }, { busa: 'D 28', tinggi: 105 }, { busa: 'D 30', tinggi: 100 },
    { busa: 'D 32', tinggi: 80 }, { busa: 'D 33', tinggi: 100 }, { busa: 'D 35', tinggi: 70 }, { busa: 'D 40', tinggi: 75 },
    { busa: 'D 42', tinggi: 65 }, { busa: 'D 50', tinggi: 45 }, { busa: 'D 55', tinggi: 100 }, { busa: 'FR 18', tinggi: 105 },
    { busa: 'FR 20', tinggi: 100 }, { busa: 'FR 22', tinggi: 105 }, { busa: 'FR 24', tinggi: 105 }, { busa: 'FR 25', tinggi: 105 },
    { busa: 'FR 30', tinggi: 70 }, { busa: 'FR 40', tinggi: 65 }, { busa: 'FR 5 - 40', tinggi: 65 }, { busa: 'FR 8 - 50', tinggi: 65 },
    { busa: 'FRH 40', tinggi: 65 }, { busa: 'GH 55', tinggi: 60 }, { busa: 'HR 24', tinggi: 75 }, { busa: 'HR 26', tinggi: 75 },
    { busa: 'HR 30', tinggi: 75 }, { busa: 'HR 35', tinggi: 75 }, { busa: 'R 100', tinggi: 48 }, { busa: 'R 40', tinggi: 75 },
    { busa: 'R 50', tinggi: 80 }, { busa: 'R 55', tinggi: 85 }, { busa: 'R 70', tinggi: 68 }, { busa: 'R 90', tinggi: 52 },
    { busa: 'RF GR', tinggi: 110 }, { busa: 'RF LI', tinggi: 110 }, { busa: 'RF YE', tinggi: 110 }, { busa: 'RH 3', tinggi: 110 },
    { busa: 'RHL 25', tinggi: 75 }, { busa: 'RHL 26', tinggi: 75 }, { busa: 'RHL 28', tinggi: 75 }, { busa: 'RHL 32', tinggi: 75 },
    { busa: 'RHL 35', tinggi: 75 }, { busa: 'RHL 50', tinggi: 60 }, { busa: 'RHL 55', tinggi: 60 }, { busa: 'RK 2', tinggi: 105 }
  ];

  const matriksProductData = [
    { base: 'BC 21', setara: [] },
    { base: 'D 11', setara: ['D 12'] },
    { base: 'D 14', setara: ['D 13'] },
    { base: 'D 15', setara: ['RF GR', 'RF LI', 'RF YE'] },
    { base: 'D 16', setara: [] },
    { base: 'D 18', setara: ['BC 16', 'BC 18', 'D 19', 'FR 18', 'RH 3'] },
    { base: 'D 20', setara: ['FR 20'] },
    { base: 'D 22', setara: ['D 23', 'FR 22'] },
    { base: 'D 24', setara: ['BC 25', 'D 25', 'D 26', 'FR 24', 'FR 25', 'HR 24', 'HR 26', 'RHL 25', 'RHL 26', 'RHL 28'] },
    { base: 'D 32', setara: ['D 28', 'D 30', 'D 33', 'D 35', 'FR 30', 'HR 30', 'HR 35', 'RHL 32', 'RHL 35'] },
    { base: 'D 55', setara: ['D 40', 'D 42', 'D 50', 'FR 40', 'FR 5 - 40', 'FR 8 - 50', 'FRH 40', 'GH 55', 'RHL 50', 'RHL 55'] },
    { base: 'R 100', setara: ['R 70', 'R 90'] },
    { base: 'R 50', setara: ['R 40', 'R 55'] },
    { base: 'RK 2', setara: [] },
  ];

  const UPDATE_DATE = '14 JULI 2026';

  // ─── CRUD: Tinggi Short Block ───────────────────────────────────────────────
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const isPPC = user.role === 'PPC';

  const STORAGE_KEY = 'tinggi_short_block_data';

  // Load awal: gabung data statis + data dari localStorage (custom entries)
  const loadData = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved)) {
        const savedMap = new Map(saved.map(d => [d.busa, d.tinggi]));

        const mergedMap = new Map();
        // 1. Masukkan data default, tapi gunakan tinggi dari saved (jika ada)
        tinggiShortBlockData.forEach(item => {
          mergedMap.set(item.busa, {
            busa: item.busa,
            tinggi: savedMap.has(item.busa) ? savedMap.get(item.busa) : item.tinggi
          });
        });

        // 2. Tambahkan item custom yang hanya ada di saved
        saved.forEach(item => {
          if (!mergedMap.has(item.busa)) {
            mergedMap.set(item.busa, item);
          }
        });

        return Array.from(mergedMap.values()).sort((a, b) => a.busa.localeCompare(b.busa));
      }
    } catch { /* ignore */ }

    return [...tinggiShortBlockData].sort((a, b) => a.busa.localeCompare(b.busa));
  }, []);

  const [sbData, setSbData] = useState(loadData);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);   // null = mode tambah
  const [formBusa, setFormBusa] = useState('');
  const [formTinggi, setFormTinggi] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // item yang akan dihapus

  // Persist ke localStorage dan sinkronisasi ke database backend setiap sbData berubah
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sbData));

    // Sinkronisasi ke backend dengan debounce (mencegah deadlock karena request ganda berdekatan)
    if (sbData && sbData.length > 0) {
      const timer = setTimeout(() => {
        axios.post('http://localhost:5000/api/spk/update-tinggi-matrix', { items: sbData })
          .catch(err => console.error("Gagal sinkronisasi tinggi_balokan ke database", err));
      }, 1000); // Tunggu 1 detik sebelum sinkronisasi

      return () => clearTimeout(timer);
    }
  }, [sbData]);

  // Buka modal tambah
  const handleOpenAdd = () => {
    setEditItem(null);
    setFormBusa('');
    setFormTinggi('');
    setFormError('');
    setShowModal(true);
  };

  // Buka modal edit
  const handleOpenEdit = (item) => {
    setEditItem(item);
    setFormBusa(item.busa);
    setFormTinggi(String(item.tinggi));
    setFormError('');
    setShowModal(true);
  };

  // Tutup modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditItem(null);
    setFormError('');
  };

  // Validasi & simpan (tambah/edit)
  const handleSave = () => {
    const busaTrimmed = formBusa.trim().toUpperCase();
    const tinggiNum = parseInt(formTinggi, 10);

    if (!busaTrimmed) { setFormError('Quality Busa tidak boleh kosong.'); return; }
    if (!formTinggi || isNaN(tinggiNum) || tinggiNum <= 0) {
      setFormError('Tinggi harus berupa angka positif.'); return;
    }
    // Cek duplikat (kecuali item yang sedang diedit)
    const duplikat = sbData.some(
      (d) => d.busa.toUpperCase() === busaTrimmed && d !== editItem
    );
    if (duplikat) { setFormError(`Quality Busa "${busaTrimmed}" sudah ada.`); return; }

    if (editItem) {
      // UPDATE
      setSbData(prev => prev.map(d => d === editItem
        ? { busa: busaTrimmed, tinggi: tinggiNum }
        : d
      ));
    } else {
      // CREATE — sisipkan urut alfabetis
      setSbData(prev => {
        const next = [...prev, { busa: busaTrimmed, tinggi: tinggiNum }];
        return next.sort((a, b) => a.busa.localeCompare(b.busa));
      });
    }
    handleCloseModal();
  };

  // Konfirmasi hapus
  const handleDeleteConfirm = () => {
    setSbData(prev => prev.filter(d => d !== deleteTarget));
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">

      {activeMachine === 'matriks' ? (
        <div className="flex flex-col gap-6 animate-in fade-in">
          {/* TABEL TINGGI SHORT BLOCK */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
            {/* ── Header ── */}
            <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy-dark">Tinggi Short Block (CM)</h3>
                {isPPC && (
                  <p className="text-xs text-gray-400 mt-0.5">Kelola data sebagai PPC</p>
                )}
              </div>
              {isPPC && (
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-navy-dark text-xs font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Plus size={14} />
                  Tambah Data
                </button>
              )}
            </div>

            {/* ── Tabel ── */}
            <div className="p-5 overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="bg-navy-dark text-white text-xs uppercase">
                    <th className="p-3 font-semibold border-r border-blue-800 w-8 text-center">#</th>
                    <th className="p-3 font-semibold border-r border-blue-800">Quality Busa</th>
                    <th className="p-3 font-semibold text-center border-r border-blue-800">Tinggi Short Block (CM)</th>
                    {isPPC && (
                      <th className="p-3 font-semibold text-center w-28">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sbData.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group">
                      <td className="p-3 text-center text-gray-400 text-xs border-r border-gray-100">{idx + 1}</td>
                      <td className="p-3 border-r border-gray-100 font-bold text-navy-dark">{item.busa}</td>
                      <td className="p-3 text-center text-accent-blue font-bold border-r border-gray-100">{item.tinggi}</td>
                      {isPPC && (
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Edit"
                              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus"
                              className="p-1.5 rounded-md text-red-500 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Footer: total entri ── */}
            <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 font-medium">
              Total: <span className="font-bold text-navy-dark">{sbData.length}</span> quality busa
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              MODAL — TAMBAH / EDIT
          ══════════════════════════════════════════════════ */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    {editItem ? <Pencil size={16} className="text-blue-600" /> : <Plus size={16} className="text-green-600" />}
                    <h2 className="font-bold text-navy-dark text-sm">
                      {editItem ? 'Edit Quality Busa' : 'Tambah Quality Busa'}
                    </h2>
                  </div>
                  <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5 flex flex-col gap-4">
                  {/* Field Quality Busa */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Quality Busa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formBusa}
                      onChange={e => { setFormBusa(e.target.value); setFormError(''); }}
                      placeholder="Contoh: D 60"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-navy-dark focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent uppercase"
                    />
                  </div>

                  {/* Field Tinggi */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Tinggi Short Block (CM) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={formTinggi}
                      onChange={e => { setFormTinggi(e.target.value); setFormError(''); }}
                      placeholder="Contoh: 110"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-navy-dark focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                    />
                  </div>

                  {/* Error message */}
                  {formError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-semibold">
                      <AlertTriangle size={13} className="shrink-0" />
                      {formError}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-navy-dark bg-accent-blue rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Check size={13} />
                    {editItem ? 'Simpan Perubahan' : 'Tambah'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              MODAL — KONFIRMASI HAPUS
          ══════════════════════════════════════════════════ */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
                <div className="px-6 py-5 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={22} className="text-red-500" />
                  </div>
                  <h2 className="font-bold text-navy-dark text-sm">Hapus Data?</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Quality busa <span className="font-black text-navy-dark">{deleteTarget.busa}</span> dengan
                    tinggi <span className="font-black text-navy-dark">{deleteTarget.tinggi} CM</span> akan dihapus permanen.
                  </p>
                </div>
                <div className="flex border-t border-gray-200">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TABEL MATRIKS PRODUCT */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
            <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-1">
              <h3 className="font-bold text-navy-dark text-lg uppercase">Matriks Product</h3>
              <div className="text-xs text-gray-500 font-bold">PRODUCT TYPE : <span className="text-red-500">SHORT BLOCK (FOAM)</span></div>
              <div className="text-xs text-gray-500 font-bold">PLANT LOCATION : <span className="text-navy-dark">ROYAL 1</span></div>
              <div className="text-xs text-gray-500 font-bold">PLANT AREA : <span className="text-red-500">BUSA 2</span></div>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-dark text-white text-xs uppercase">
                    <th className="p-3 font-semibold border-r border-blue-800" rowSpan="2">Quality Busa</th>
                    <th className="p-3 font-semibold text-center" colSpan="10">Produk Setara</th>
                  </tr>
                  <tr className="bg-gray-100 text-gray-500 text-xs">
                    {[...Array(10)].map((_, i) => (
                      <th key={i} className="p-2 border border-gray-200 text-center font-bold">{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matriksProductData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3 border-r border-gray-100 font-bold text-navy-dark bg-gray-50">{row.base}</td>
                      {[...Array(10)].map((_, i) => (
                        <td key={i} className={`p-2 border border-gray-100 text-center text-xs font-semibold ${row.setara[i] ? 'text-gray-700' : 'bg-gray-800'}`}>
                          {row.setara[i] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>

          {/* Alert Banner */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center gap-3 text-blue-800 shadow-sm">
            <Database size={20} className="text-accent-blue shrink-0" />
            <span className="text-sm font-semibold">
              Halaman ini Menampilkan referensi Total Cycle Time dan Operation Process Chart (OPC) untuk area Mesin {activeMachine.charAt(0).toUpperCase() + activeMachine.slice(1)}.
            </span>
          </div>

          {/* ========================================== */}
          {/* TABEL PENUH — CYCLE TIME VARIANS (DETIK)  */}
          {/* ========================================== */}
          {activeMachine === 'vertikal' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-accent-blue" />
                    <h3 className="font-bold text-navy-dark">Cycle Time Varians (Detik)</h3>
                    <span className="text-xs text-gray-400 font-medium ml-1">— Data Referensi Mesin Vertikal</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Update: {UPDATE_DATE}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                        <th className="p-3 font-semibold border-r border-gray-200 w-48">Detail Operations</th>
                        <th className="p-3 font-semibold text-center border-r border-gray-200 w-32">Code Ops</th>
                        {varians.map(v => (
                          <th key={v} className="p-3 font-semibold text-center border-r border-gray-100 last:border-r-0">{v}</th>
                        ))}
                        <th className="p-3 font-semibold text-center bg-blue-50 border-l-2 border-blue-200">Total CT</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {operasiData.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 font-semibold text-navy-dark border-r border-gray-200 text-xs tracking-wide uppercase">{row.nama}</td>
                          <td className="p-3 text-center font-mono font-bold text-gray-500 border-r border-gray-200 text-xs">{row.kode}</td>
                          {varKeys.map(key => (
                            <td key={key} className="p-3 text-center text-gray-700 font-medium border-r border-gray-100 last:border-r-0">
                              {Number.isInteger(row[key]) ? row[key].toFixed(1) : row[key]}
                            </td>
                          ))}
                          <td className="p-3 text-center font-bold text-blue-700 bg-blue-50 border-l-2 border-blue-200">{row.totalCT.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                        <td colSpan={2} className="p-3 font-black text-center text-navy-dark text-xs uppercase tracking-wider border-r border-yellow-300">
                          Total Cycle Time
                        </td>
                        {varKeys.map(key => (
                          <td key={key} className="p-3 text-center font-bold text-navy-dark border-r border-yellow-300 last:border-r-0">
                            {totalData[key].toFixed(1)}
                          </td>
                        ))}
                        <td className="p-3 text-center font-bold text-navy-dark border-l-2 border-yellow-300 bg-yellow-100">
                          {operasiData.reduce((sum, r) => sum + r.totalCT, 0).toFixed(1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 font-medium">
                  *CT (Menit/Pcs) di bawah total adalah nilai yang digunakan sistem backend untuk kalkulasi prediksi waktu produksi.
                </div>
              </div>

              {/* ========================================== */}
              {/* MATRIKS SHORT BLOCK                       */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-accent-blue" />
                    <h3 className="font-bold text-navy-dark">Matriks Short Block</h3>
                    <span className="text-xs text-gray-400 font-medium ml-1">— Vertical Machine Area</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 uppercase border-b border-gray-200 font-bold tracking-wider">
                        <th className="p-2 border-r border-gray-200 w-16">Varians</th>
                        <th className="p-2 border-r border-gray-200 w-24">Short Block Based</th>
                        <th className="p-2 border-r border-gray-200" colSpan={20}>Equivalent Short Block Product</th>
                        <th className="p-2 border-r border-gray-200 w-16">Dummy</th>
                        <th className="p-2 bg-yellow-300 border-l border-yellow-400 w-24 text-navy-dark">Total Cycle<br />Time (Menit)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriksVerticalData.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 bg-white hover:bg-gray-50">
                          <td className="p-2 font-bold border-r border-gray-200">{row.varians}</td>
                          <td className="p-2 font-semibold border-r border-gray-200">{row.shortBlock}</td>
                          {[...Array(20)].map((_, i) => {
                            const val = row.equivalents[i];
                            if (val) {
                              return <td key={i} className="p-1 border-r border-gray-100 whitespace-nowrap min-w-[35px] text-gray-700 font-medium">{val}</td>;
                            } else {
                              return <td key={i} className="p-1 border-r border-gray-100 bg-gray-400 min-w-[35px]"></td>;
                            }
                          })}
                          <td className="p-2 font-bold border-r border-gray-200">{row.varians}</td>
                          <td className="p-2 font-black bg-yellow-200 border-l border-yellow-300 text-navy-dark">{row.ct.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ========================================== */}
              {/* OPERATION PROCESS CHART (OPC)             */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
                  <GitMerge size={18} className="text-accent-blue" />
                  <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
                </div>

                <div className="p-6 bg-white flex justify-center">
                  {/* ── Kertas OPC sesuai format dokumen resmi ── */}
                  <div className="w-full max-w-[420px] border border-gray-300 font-sans text-xs shadow-sm">

                    {/* ── HEADER: Logo | Judul ── */}
                    <div className="flex border-b border-gray-300">
                      {/* Logo kiri */}
                      <div className="flex items-center justify-center border-r border-gray-300 px-4 py-3 w-28 shrink-0">
                        <img
                          src={royalCorpLogo}
                          alt="Royal Corp"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      {/* Judul tengah */}
                      <div className="flex-1 flex items-center justify-center py-3 px-2">
                        <div className="text-center">
                          <p className="font-black text-[13px] text-gray-900 tracking-widest uppercase leading-tight">
                            OPERATIONS PROCESS
                          </p>
                          <p className="font-black text-[13px] text-gray-900 tracking-widest uppercase leading-tight">
                            CHART
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── INFO BARIS: Machine / Plant Area / Plant Location / Update ── */}
                    <div className="border-b border-gray-300 px-4 py-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-[3px]">
                      <span className="font-bold text-gray-700 uppercase text-[10px]">MACHINE</span>
                      <span className="text-red-600 font-black text-[10px] uppercase">
                        : VERTICAL MACHINE
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">PLANT AREA</span>
                      <span className="font-semibold text-gray-800 text-[10px] uppercase">
                        : FOAM CONVERTION
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">PLANT LOCATION</span>
                      <span className="font-semibold text-gray-800 text-[10px] uppercase">
                        : ROYAL-1
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">UPDATE</span>
                      <span className="font-black text-red-600 text-[10px] uppercase">
                        : {UPDATE_DATE}
                      </span>
                    </div>

                    {/* ── DIAGRAM OPC ── */}
                    <div className="py-6 flex flex-col items-center bg-white">

                      {/* Label BAGIAN ATAS */}
                      <div className="mb-1 text-center">
                        <p className="font-black text-red-600 text-[11px] uppercase tracking-wider leading-tight">
                          BAGIAN
                        </p>
                        <p className="font-black text-red-600 text-[11px] uppercase tracking-wider leading-tight">
                          ATAS
                        </p>
                      </div>

                      {/* Garis horizontal atas */}
                      <div className="w-32 h-[2px] bg-gray-900 mb-0"></div>
                      {/* Garis vertikal turun ke node pertama */}
                      <div className="w-[2px] h-5 bg-gray-900"></div>

                      {operasiData.map((row, idx) => (
                        <React.Fragment key={idx}>
                          {/* ── Node operasi ── */}
                          <div className="w-full flex items-center justify-center">
                            {/* Kiri: waktu presisi */}
                            <div className="flex-1 text-right pr-3">
                              <span className="text-[9px] font-mono text-[#c8860a] font-semibold leading-none">
                                {row.opcTime}
                              </span>
                            </div>

                            {/* Lingkaran */}
                            <div className="w-[68px] h-[68px] rounded-full border-[3px] border-gray-900 bg-white flex items-center justify-center shrink-0 z-10">
                              <span className="font-black text-gray-900 text-[11px] text-center leading-tight">
                                {row.kode}
                              </span>
                            </div>

                            {/* Kanan: nama operasi + mesin */}
                            <div className="flex-1 pl-3 flex flex-col gap-[2px]">
                              <span className="text-[9px] font-bold text-[#c8860a] uppercase leading-tight tracking-wide">
                                {row.nama}
                              </span>
                              <span className="text-[8px] font-semibold text-gray-500 uppercase">
                                {row.mesin}
                              </span>
                            </div>
                          </div>

                          {/* Konektor antar node */}
                          {idx < operasiData.length - 1 && (
                            <div className="flex flex-col items-center">
                              <div className="w-[2px] h-7 bg-gray-900"></div>
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="#111827" className="-mt-[1px]">
                                <polygon points="0,0 10,0 5,8" />
                              </svg>
                            </div>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Konektor akhir ke simbol output */}
                      <div className="flex flex-col items-center">
                        <div className="w-[2px] h-7 bg-gray-900"></div>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="#111827" className="-mt-[1px]">
                          <polygon points="0,0 10,0 5,8" />
                        </svg>
                      </div>

                      {/* Simbol segitiga output (finish) */}
                      <div className="mt-1">
                        <svg width="52" height="42" viewBox="0 0 52 42" fill="white" stroke="#111827" strokeWidth="2.5">
                          <polygon points="2,2 50,2 26,40" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* TABEL CYCLE TIME — HORIZONTAL MACHINE      */}
          {/* ========================================== */}
          {activeMachine === 'horizontal' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-500" />
                    <h3 className="font-bold text-navy-dark">Cycle Time Varians (Detik)</h3>
                    <span className="text-xs text-blue-600 font-bold ml-1">— Horizontal Machine Area</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Update: 14 JULI 2026
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                        <th className="p-3 font-semibold border-r border-gray-200 w-20">Code CT</th>
                        <th className="p-3 font-semibold border-r border-gray-200 w-48">Detail Operations</th>
                        <th className="p-3 font-semibold text-center border-r border-gray-200 w-24">Code Ops</th>
                        {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(v => (
                          <th key={v} className="p-3 font-semibold text-center border-r border-gray-100 last:border-r-0">{v}</th>
                        ))}
                        <th className="p-3 font-semibold text-center bg-blue-50 border-l-2 border-blue-200">L</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {horizontalOpcData.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 font-bold text-navy-dark border-r border-gray-200 text-xs">{row.codeCT}</td>
                          <td className="p-3 font-semibold text-navy-dark border-r border-gray-200 text-xs tracking-wide uppercase">{row.nama}</td>
                          <td className="p-3 text-center font-mono font-bold text-gray-500 border-r border-gray-200 text-xs">{row.kode}</td>
                          {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'].map(key => (
                            <td key={key} className="p-3 text-center text-gray-700 font-medium border-r border-gray-100 last:border-r-0">{row[key]}</td>
                          ))}
                          <td className="p-3 text-center font-bold text-blue-700 bg-blue-50 border-l-2 border-blue-200">{row.L}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                        <td colSpan={3} className="p-3 font-black text-center text-navy-dark text-xs uppercase tracking-wider border-r border-yellow-300">
                          Total Cycle Time
                        </td>
                        {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'].map(key => {
                          const total = horizontalOpcData.reduce((sum, r) => sum + r[key], 0);
                          return (
                            <td key={key} className="p-3 text-center font-bold text-navy-dark border-r border-yellow-300 last:border-r-0">
                              {total.toFixed(1)}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-bold text-navy-dark border-l-2 border-yellow-300 bg-yellow-100">
                          {horizontalOpcData.reduce((sum, r) => sum + r.L, 0).toFixed(1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ========================================== */}
              {/* MATRIKS SHORT BLOCK                       */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                {/* Header judul formal */}
                <div className="p-5 border-b border-gray-200">
                  <p className="font-black text-navy-dark text-sm uppercase underline tracking-wide">MATRIKS SHORT BLOCK</p>
                  <p className="text-red-600 font-bold text-xs uppercase mt-0.5">HORIZONTAL MACHINE AREA</p>
                  <p className="text-gray-600 text-xs font-semibold mt-2">
                    UPDATE &nbsp;&nbsp; : <span className="font-black text-gray-800">14 JULI 2026</span>
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      {/* Baris header 1 */}
                      <tr className="bg-white text-gray-800 uppercase border border-gray-300 font-bold text-[9px]">
                        <th className="p-2 border border-gray-300 align-middle" rowSpan={2}>VARIANS</th>
                        <th className="p-2 border border-gray-300 align-middle" rowSpan={2}>SHORT BLOCK<br />BASED</th>
                        <th className="p-2 border border-gray-300 align-middle" colSpan={maxHorizontalProducts}>EQUIVALENT SHORT BLOCK PRODUCT</th>
                        <th className="p-2 border border-gray-300 align-middle" rowSpan={2}>DUMMY</th>
                        <th className="p-2 border border-gray-300 align-middle bg-yellow-300 text-gray-900" colSpan={6}>TOTAL CYCLE TIME (MENIT)</th>
                      </tr>
                      {/* Baris header 2 — sub-kolom CT */}
                      <tr className="bg-white text-gray-700 uppercase border border-gray-300 font-bold text-[9px]">
                        {[...Array(maxHorizontalProducts)].map((_, i) => (
                          <th key={i} className="p-1 border border-gray-200 text-gray-400 font-semibold">{i + 1}</th>
                        ))}
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">C1</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">C2</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">PTU</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">PMA</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">PMU</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">C3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriksHorizontal.map((row, idx) => (
                        <tr key={idx} className="border border-gray-200 bg-white hover:bg-gray-50">
                          {/* Varians — warna sesuai gambar (biru) */}
                          <td className="p-2 font-black border border-gray-300 text-blue-600">{row.varians}</td>
                          {/* Short Block Based */}
                          <td className="p-2 font-bold border border-gray-300 text-gray-800 whitespace-nowrap">{row.base}</td>
                          {/* Kolom produk ekuivalen */}
                          {[...Array(maxHorizontalProducts)].map((_, i) => {
                            const val = row.products[i];
                            return val
                              ? <td key={i} className="p-1 border border-gray-200 whitespace-nowrap min-w-[38px] text-gray-700 font-semibold">{val}</td>
                              : <td key={i} className="p-1 border border-gray-200 bg-gray-400 min-w-[38px]"></td>;
                          })}
                          {/* Dummy — warna biru sesuai gambar */}
                          <td className="p-2 font-black border border-gray-300 text-blue-600">{row.dummy}</td>
                          {/* Kolom CT — latar kuning */}
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.c1.toFixed(2)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.c2.toFixed(2)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.ptu.toFixed(2)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.pma.toFixed(2)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.pmu.toFixed(2)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.c3.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ========================================== */}
              {/* OPERATION PROCESS CHART (OPC) — HORIZONTAL*/}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
                  <GitMerge size={18} className="text-blue-500" />
                  <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
                </div>

                <div className="p-6 bg-white flex justify-center">
                  {/* ── Kertas OPC format dokumen resmi ── */}
                  <div className="w-full max-w-[420px] border border-gray-300 font-sans text-xs shadow-sm">

                    {/* ── HEADER: Logo | Judul ── */}
                    <div className="flex border-b border-gray-300">
                      {/* Logo kiri */}
                      <div className="flex items-center justify-center border-r border-gray-300 px-4 py-3 w-28 shrink-0">
                        <img
                          src={royalCorpLogo}
                          alt="Royal Corp"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      {/* Judul tengah */}
                      <div className="flex-1 flex items-center justify-center py-3 px-2">
                        <div className="text-center">
                          <p className="font-black text-[13px] text-gray-900 tracking-widest uppercase leading-tight">
                            OPERATIONS PROCESS
                          </p>
                          <p className="font-black text-[13px] text-gray-900 tracking-widest uppercase leading-tight">
                            CHART
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── INFO BARIS ── */}
                    <div className="border-b border-gray-300 px-4 py-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-[3px]">
                      <span className="font-bold text-gray-700 uppercase text-[10px]">MACHINE</span>
                      <span className="text-red-600 font-black text-[10px] uppercase">
                        : HORIZONTAL MACHINE
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">PLANT AREA</span>
                      <span className="font-semibold text-blue-700 text-[10px] uppercase">
                        : FOAM CONVERTION
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">PLANT LOCATION</span>
                      <span className="font-semibold text-gray-800 text-[10px] uppercase">
                        : ROYAL-1
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">UPDATE</span>
                      <span className="font-black text-gray-800 text-[10px] uppercase">
                        : {UPDATE_DATE}
                      </span>
                    </div>

                    {/* ── DIAGRAM OPC ── */}
                    <div className="py-6 flex flex-col items-center bg-white">

                      {/* Label BAGIAN ATAS */}
                      <div className="mb-1 text-center">
                        <p className="font-black text-red-600 text-[11px] uppercase tracking-wider leading-tight">
                          BAGIAN
                        </p>
                        <p className="font-black text-red-600 text-[11px] uppercase tracking-wider leading-tight">
                          ATAS
                        </p>
                      </div>

                      {/* Garis horizontal atas */}
                      <div className="w-32 h-[2px] bg-gray-900"></div>
                      {/* Garis vertikal turun ke node pertama */}
                      <div className="w-[2px] h-5 bg-gray-900"></div>

                      {opcHorizontalData.map((row, idx) => (
                        <React.Fragment key={idx}>
                          {/* ── Node operasi ── */}
                          <div className="w-full flex items-center justify-center">
                            {/* Kiri: waktu */}
                            <div className="flex-1 text-right pr-3">
                              <span className="text-[9px] font-mono text-[#c8860a] font-semibold leading-none">
                                {row.totalCT}
                              </span>
                            </div>

                            {/* Lingkaran */}
                            <div className="w-[68px] h-[68px] rounded-full border-[3px] border-gray-900 bg-white flex items-center justify-center shrink-0 z-10">
                              <span className="font-black text-gray-900 text-[11px] text-center leading-tight">
                                {row.kode}
                              </span>
                            </div>

                            {/* Kanan: nama operasi + mesin */}
                            <div className="flex-1 pl-3 flex flex-col gap-[2px]">
                              <span className="text-[9px] font-bold text-[#c8860a] uppercase leading-tight tracking-wide">
                                {row.nama}
                              </span>
                              <span className="text-[8px] font-semibold text-gray-500 uppercase">
                                {row.mesin}
                              </span>
                            </div>
                          </div>

                          {/* Konektor antar node */}
                          {idx < opcHorizontalData.length - 1 && (
                            <div className="flex flex-col items-center">
                              <div className="w-[2px] h-7 bg-gray-900"></div>
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="#111827" className="-mt-[1px]">
                                <polygon points="0,0 10,0 5,8" />
                              </svg>
                            </div>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Konektor akhir ke simbol output */}
                      <div className="flex flex-col items-center">
                        <div className="w-[2px] h-7 bg-gray-900"></div>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="#111827" className="-mt-[1px]">
                          <polygon points="0,0 10,0 5,8" />
                        </svg>
                      </div>

                      {/* Simbol segitiga output */}
                      <div className="mt-1">
                        <svg width="52" height="42" viewBox="0 0 52 42" fill="white" stroke="#111827" strokeWidth="2.5">
                          <polygon points="2,2 50,2 26,40" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* TABEL CYCLE TIME — CAROUSEL MACHINE        */}
          {/* ========================================== */}
          {activeMachine === 'carousel' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-purple-500" />
                    <h3 className="font-bold text-navy-dark">Cycle Time Varians (Detik)</h3>
                    <span className="text-xs text-purple-600 font-bold ml-1">— Carousel Machine Area</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Update: {UPDATE_DATE}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                        <th className="p-3 font-semibold border-r border-gray-200 w-20">Code CT</th>
                        <th className="p-3 font-semibold border-r border-gray-200 w-48">Detail Operations</th>
                        <th className="p-3 font-semibold text-center border-r border-gray-200 w-24">Code Ops</th>
                        {['I', 'II', 'III', 'IV', 'V'].map(v => (
                          <th key={v} className="p-3 font-semibold text-center border-r border-gray-100 last:border-r-0">{v}</th>
                        ))}
                        <th className="p-3 font-semibold text-center bg-purple-50 border-l-2 border-purple-200">L</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {carouselOpcData.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                          <td className="p-3 font-bold text-navy-dark border-r border-gray-200 text-xs">{row.codeCT}</td>
                          <td className="p-3 font-semibold text-navy-dark border-r border-gray-200 text-xs tracking-wide uppercase">{row.nama}</td>
                          <td className="p-3 text-center font-mono font-bold text-gray-500 border-r border-gray-200 text-xs">{row.kode}</td>
                          {['i', 'ii', 'iii', 'iv', 'v'].map(key => (
                            <td key={key} className="p-3 text-center text-gray-700 font-medium border-r border-gray-100 last:border-r-0">{row[key] > 0 ? row[key].toFixed(1) : '0.0'}</td>
                          ))}
                          <td className="p-3 text-center font-bold text-purple-700 bg-purple-50 border-l-2 border-purple-200">{row.L.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                        <td colSpan={3} className="p-3 font-black text-center text-navy-dark text-xs uppercase tracking-wider border-r border-yellow-300">
                          Total Cycle Time
                        </td>
                        {['i', 'ii', 'iii', 'iv', 'v'].map(key => {
                          const total = carouselOpcData.reduce((sum, r) => sum + r[key], 0);
                          return (
                            <td key={key} className="p-3 text-center font-bold text-navy-dark border-r border-yellow-300 last:border-r-0">
                              {total.toFixed(1)}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-bold text-navy-dark border-l-2 border-yellow-300 bg-yellow-100">
                          {carouselOpcData.reduce((sum, r) => sum + r.L, 0).toFixed(1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ========================================== */}

              {/* ========================================== */}
              {/* MATRIKS SHORT BLOCK                       */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                {/* Header judul formal */}
                <div className="p-5 border-b border-gray-200">
                  <p className="font-black text-navy-dark text-sm uppercase underline tracking-wide">MATRIKS SHORT BLOCK</p>
                  <p className="text-red-600 font-bold text-xs uppercase mt-0.5">CAROUSEL MACHINE AREA</p>
                  <p className="text-gray-600 text-xs font-semibold mt-2">
                    UPDATE &nbsp;&nbsp; : <span className="font-black text-gray-800">29 JULI 2026</span>
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      {/* Baris header 1 */}
                      <tr className="bg-white text-gray-800 uppercase border border-gray-300 font-bold text-[9px]">
                        <th className="p-2 border border-gray-300 align-middle" rowSpan={2}>VARIANS</th>
                        <th className="p-2 border border-gray-300 align-middle" rowSpan={2}>SHORT BLOCK<br />BASED</th>
                        <th className="p-2 border border-gray-300 align-middle" colSpan={maxCarouselProducts}>EQUIVALENT SHORT BLOCK PRODUCT</th>
                        <th className="p-2 border border-gray-300 align-middle" rowSpan={2}>DUMMY</th>
                        <th className="p-2 border border-gray-300 align-middle bg-yellow-300 text-gray-900" colSpan={5}>TOTAL CYCLE TIME (MENIT)</th>
                      </tr>
                      {/* Baris header 2 — nomor urut + sub-kolom CT */}
                      <tr className="bg-white text-gray-700 uppercase border border-gray-300 font-bold text-[9px]">
                        {[...Array(maxCarouselProducts)].map((_, i) => (
                          <th key={i} className="p-1 border border-gray-200 text-gray-400 font-semibold">{i + 1}</th>
                        ))}
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">C1</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">C2</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">PTU</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">PMA</th>
                        <th className="p-2 border border-gray-300 bg-yellow-200 font-black text-gray-900">C3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriksCarousel.map((row, idx) => (
                        <tr key={idx} className="border border-gray-200 bg-white hover:bg-gray-50">
                          {/* Varians — biru */}
                          <td className="p-2 font-black border border-gray-300 text-blue-600">{row.varians}</td>
                          {/* Short Block Based */}
                          <td className="p-2 font-bold border border-gray-300 text-gray-800 whitespace-nowrap">{row.base}</td>
                          {/* Kolom produk ekuivalen */}
                          {[...Array(maxCarouselProducts)].map((_, i) => {
                            const val = row.products[i];
                            return val
                              ? <td key={i} className="p-1 border border-gray-200 whitespace-nowrap min-w-[38px] text-gray-700 font-semibold">{val}</td>
                              : <td key={i} className="p-1 border border-gray-200 bg-gray-400 min-w-[38px]"></td>;
                          })}
                          {/* Dummy — biru */}
                          <td className="p-2 font-black border border-gray-300 text-blue-600">{row.dummy}</td>
                          {/* Kolom CT — latar kuning */}
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.c1.toFixed(1)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.c2}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.ptu.toFixed(2)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.pma.toFixed(1)}</td>
                          <td className="p-2 border border-yellow-300 bg-yellow-100 font-bold text-gray-800">{row.c3.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ========================================== */}
              {/* OPERATION PROCESS CHART (OPC) — CAROUSEL  */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
                  <GitMerge size={18} className="text-purple-500" />
                  <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
                </div>

                <div className="p-6 bg-white flex justify-center">
                  {/* ── Kertas OPC format dokumen resmi ── */}
                  <div className="w-full max-w-[420px] border border-gray-300 font-sans text-xs shadow-sm">

                    {/* ── HEADER: Logo | Judul ── */}
                    <div className="flex border-b border-gray-300">
                      {/* Logo kiri */}
                      <div className="flex items-center justify-center border-r border-gray-300 px-4 py-3 w-28 shrink-0">
                        <img
                          src={royalCorpLogo}
                          alt="Royal Corp"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      {/* Judul tengah */}
                      <div className="flex-1 flex items-center justify-center py-3 px-2">
                        <div className="text-center">
                          <p className="font-black text-[13px] text-gray-900 tracking-widest uppercase leading-tight">
                            OPERATIONS PROCESS
                          </p>
                          <p className="font-black text-[13px] text-gray-900 tracking-widest uppercase leading-tight">
                            CHART
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── INFO BARIS ── */}
                    <div className="border-b border-gray-300 px-4 py-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-[3px]">
                      <span className="font-bold text-gray-700 uppercase text-[10px]">MACHINE</span>
                      <span className="text-red-600 font-black text-[10px] uppercase">
                        : CAROUSEL MACHINE
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">PLANT AREA</span>
                      <span className="font-semibold text-blue-700 text-[10px] uppercase">
                        : FOAM CONVERTION
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">PLANT LOCATION</span>
                      <span className="font-semibold text-gray-800 text-[10px] uppercase">
                        : ROYAL-1
                      </span>
                      <span className="font-bold text-gray-700 uppercase text-[10px]">UPDATE</span>
                      <span className="font-black text-gray-800 text-[10px] uppercase">
                        : 29 JULI 2026
                      </span>
                    </div>

                    {/* ── DIAGRAM OPC ── */}
                    <div className="py-6 flex flex-col items-center bg-white">

                      {/* Label BAGIAN ATAS */}
                      <div className="mb-1 text-center">
                        <p className="font-black text-red-600 text-[11px] uppercase tracking-wider leading-tight">
                          BAGIAN
                        </p>
                        <p className="font-black text-red-600 text-[11px] uppercase tracking-wider leading-tight">
                          ATAS
                        </p>
                      </div>

                      {/* Garis horizontal atas */}
                      <div className="w-32 h-[2px] bg-gray-900"></div>
                      {/* Garis vertikal turun ke node pertama */}
                      <div className="w-[2px] h-5 bg-gray-900"></div>

                      {opcCarouselData.map((row, idx) => (
                        <React.Fragment key={idx}>
                          {/* ── Node operasi ── */}
                          <div className="w-full flex items-center justify-center">
                            {/* Kiri: waktu */}
                            <div className="flex-1 text-right pr-3">
                              <span className="text-[9px] font-mono text-[#c8860a] font-semibold leading-none">
                                {row.totalCT}
                              </span>
                            </div>

                            {/* Lingkaran */}
                            <div className="w-[68px] h-[68px] rounded-full border-[3px] border-gray-900 bg-white flex items-center justify-center shrink-0 z-10">
                              <span className="font-black text-gray-900 text-[11px] text-center leading-tight">
                                {row.kode}
                              </span>
                            </div>

                            {/* Kanan: nama operasi + mesin */}
                            <div className="flex-1 pl-3 flex flex-col gap-[2px]">
                              <span className="text-[9px] font-bold text-[#c8860a] uppercase leading-tight tracking-wide">
                                {row.nama}
                              </span>
                              <span className="text-[8px] font-semibold text-gray-500 uppercase">
                                {row.mesin}
                              </span>
                            </div>
                          </div>

                          {/* Konektor antar node */}
                          {idx < opcCarouselData.length - 1 && (
                            <div className="flex flex-col items-center">
                              <div className="w-[2px] h-7 bg-gray-900"></div>
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="#111827" className="-mt-[1px]">
                                <polygon points="0,0 10,0 5,8" />
                              </svg>
                            </div>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Konektor akhir ke simbol output */}
                      <div className="flex flex-col items-center">
                        <div className="w-[2px] h-7 bg-gray-900"></div>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="#111827" className="-mt-[1px]">
                          <polygon points="0,0 10,0 5,8" />
                        </svg>
                      </div>

                      {/* Simbol segitiga output */}
                      <div className="mt-1">
                        <svg width="52" height="42" viewBox="0 0 52 42" fill="white" stroke="#111827" strokeWidth="2.5">
                          <polygon points="2,2 50,2 26,40" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* MATRIKS SHORT BLOCK — PACKING              */}
          {/* ========================================== */}
          {activeMachine === 'packing' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-accent-blue" />
                  <h3 className="font-bold text-navy-dark">Matriks Short Block</h3>
                  <span className="text-xs text-gray-400 font-medium ml-1">— Packing Area</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 uppercase border-b border-gray-200 font-bold tracking-wider">
                      <th className="p-3 border-r border-gray-200">Varians</th>
                      <th className="p-3 border-r border-gray-200">Type Packing</th>
                      <th className="p-3 border-r border-gray-200">Equivalent Short Block Product</th>
                      <th className="p-3 border-r border-gray-200">Dummy</th>
                      <th className="p-3 bg-yellow-300 border-l border-yellow-400 text-navy-dark">Total Cycle<br />Time (Menit)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriksPacking.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 bg-white hover:bg-gray-50">
                        <td className="p-3 font-bold border-r border-gray-200">{row.varians}</td>
                        <td className="p-3 font-semibold border-r border-gray-200 text-navy-dark">{row.typePacking}</td>
                        <td className="p-3 font-medium text-gray-700 border-r border-gray-200">{row.equivalent}</td>
                        <td className="p-3 font-bold border-r border-gray-200">{row.dummy}</td>
                        <td className="p-3 font-black bg-yellow-200 border-l border-yellow-300 text-navy-dark">{row.ct.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DatabaseCycle;
