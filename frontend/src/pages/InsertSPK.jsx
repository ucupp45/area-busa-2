import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Lock, Clock, Calendar, Loader, Download, Activity, Layers, Trash2, Edit2, Check, X, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const InsertSPK = () => {
  const navigate = useNavigate();

  // Helper untuk load dari sessionStorage
  const loadSession = (key, fallback) => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch { return fallback; }
  };

  const [fileUploaded, setFileUploaded] = useState(() => loadSession('spk_fileUploaded', false));
  const [isLocked, setIsLocked] = useState(false);
  const [activeShift, setActiveShift] = useState(() => loadSession('spk_activeShift', 'Shift 1'));
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [spkSummary, setSpkSummary] = useState(() => loadSession('spk_summary', null));
  const [parsedData, setParsedData] = useState(() => loadSession('spk_parsedData', []));

  // State untuk menyimpan data history dari Database
  const [historyData, setHistoryData] = useState([]);

  // State untuk mode edit nama file
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  // State untuk mode edit Qty Bahan Baku (Inline CRUD)
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editQtyValue, setEditQtyValue] = useState('');
  const [editCtValue, setEditCtValue] = useState('');
  const [editMesinValue, setEditMesinValue] = useState('');
  const [editPrediksiSbValue, setEditPrediksiSbValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk Paste dari Excel
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // State untuk sorting tabel preview
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // State untuk tambah baris manual
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    noWo: '',
    spkCutting: '',
    customer: '',
    item: '',
    ukuranP: '',
    ukuranL: '',
    ukuranT: '',
    qtyCut: '',
    bahanBakuP: '',
    bahanBakuL: '',
    bahanBakuT: '',
    qty: '',
    keterangan: '',
    ct: ''
  });

  // State untuk nama kustom SPK (Gabungan)
  const [combinedSpkName, setCombinedSpkName] = useState(() => loadSession('spk_combinedName', ''));

  // State untuk menyimpan snapshot data sebelum penggabungan SPK (untuk fitur Undo per-file)
  const [dataSnapshots, setDataSnapshots] = useState(() => loadSession('spk_snapshots', []));

  // Persist data preview ke sessionStorage agar tidak hilang saat pindah halaman
  useEffect(() => {
    sessionStorage.setItem('spk_parsedData', JSON.stringify(parsedData));
    sessionStorage.setItem('spk_fileUploaded', JSON.stringify(fileUploaded));
    sessionStorage.setItem('spk_summary', JSON.stringify(spkSummary));
    sessionStorage.setItem('spk_combinedName', JSON.stringify(combinedSpkName));
    sessionStorage.setItem('spk_activeShift', JSON.stringify(activeShift));
    sessionStorage.setItem('spk_snapshots', JSON.stringify(dataSnapshots));
  }, [parsedData, fileUploaded, spkSummary, combinedSpkName, activeShift, dataSnapshots]);

  // State untuk custom Notification & Confirmation Modal
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm', // 'confirm', 'success', 'warning', 'error'
    onConfirm: null,
  });

  // State untuk SummaryCalculationModal
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryModalData, setSummaryModalData] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('Vertikal');

  const showModal = (title, message, type = 'confirm', onConfirm = null) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modalConfig.isOpen && e.key === 'Enter') {
        e.preventDefault();
        if (modalConfig.onConfirm) {
          modalConfig.onConfirm();
        }
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalConfig]);

  const fileInputRef = useRef(null);

  // Mengambil user aktif
  const currentUser = JSON.parse(localStorage.getItem('user')) || { name: 'PPC Admin', role: 'PPC' };

  // State filter tanggal History
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fungsi mengambil history dari backend
  const fetchHistory = async () => {
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const response = await axios.get('http://localhost:5000/api/spk/history', { params });
      setHistoryData(response.data);
    } catch (error) {
      console.error("Gagal mengambil history:", error);
    }
  };

  // Panggil fetchHistory saat komponen pertama kali dimuat atau filter berubah
  useEffect(() => {
    fetchHistory();
  }, [dateFrom, dateTo]);

  // Auto kalkulasi (Mesin, Prediksi SB, CT) saat menginput data manual
  useEffect(() => {
    if (!newRowData.item || !newRowData.qty) return;

    const fetchCalculation = async () => {
      try {
        let finalItem = newRowData.item.trim();
        if (newRowData.bahanBakuP || newRowData.bahanBakuL || newRowData.bahanBakuT) {
          const p = parseFloat(newRowData.bahanBakuP) || 0;
          const l = parseFloat(newRowData.bahanBakuL) || 0;
          const t = parseFloat(newRowData.bahanBakuT) || 0;
          finalItem = `${finalItem} (${p}x${l}x${t})`;
        }

        const payload = {
          item: finalItem,
          qty: newRowData.qty,
          bahanBakuP: newRowData.bahanBakuP,
          bahanBakuL: newRowData.bahanBakuL,
          bahanBakuT: newRowData.bahanBakuT
        };

        const response = await axios.post('http://localhost:5000/api/spk/calculate-single', payload);

        if (response.data) {
          setNewRowData(prev => ({
            ...prev,
            ct: response.data.ct || prev.ct,
            mesinTujuan: response.data.mesinTujuan || '-',
            prediksi_sb: response.data.prediksi_sb !== null ? response.data.prediksi_sb : '',
            tinggi_balokan: response.data.tinggi_balokan || '',
            match: response.data.match || false
          }));
        }
      } catch (error) {
        console.error("Gagal melakukan kalkulasi otomatis:", error);
      }
    };

    const timer = setTimeout(fetchCalculation, 500);
    return () => clearTimeout(timer);
  }, [newRowData.item, newRowData.qty, newRowData.bahanBakuP, newRowData.bahanBakuL, newRowData.bahanBakuT]);

  // Auto refresh data ketika window kembali fokus (mengakomodasi update tinggi balokan dari tab lain)
  useEffect(() => {
    const handleFocus = async () => {
      if (parsedData && parsedData.length > 0 && !isLocked) {
        try {
          // Ambil data tinggi balokan dari localStorage
          const tinggiRaw = localStorage.getItem('tinggi_short_block_data');
          const tinggiData = tinggiRaw ? JSON.parse(tinggiRaw) : [];

          const response = await axios.post('http://localhost:5000/api/spk/refresh-preview', { parsedData, tinggiData });
          if (response.data && response.data.updatedParsedData) {
            // Urutkan kembali agar anomali di bawah
            const sortedData = response.data.updatedParsedData.sort((a, b) => {
              if (a.match === b.match) return 0;
              return a.match ? -1 : 1;
            });
            setParsedData(sortedData);
            recalculateSummary(sortedData);
          }
        } catch (error) {
          console.error("Gagal merefresh preview:", error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [parsedData, isLocked]);

  const handleAreaClick = () => fileInputRef.current.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('spk_file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/spk/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const isAddingMultiple = parsedData.length > 0;
      let newParsedData = response.data.parsedData;

      if (isAddingMultiple) {
        // Simpan snapshot parsedData saat ini sebelum ditambah file baru
        setDataSnapshots(prev => [...prev, parsedData]);
        newParsedData = [...parsedData, ...response.data.parsedData];
      } else {
        setDataSnapshots([]);
      }

      // Urutkan parsedData agar anomali (match === false) berada di bawah
      const sortedParsedData = newParsedData.sort((a, b) => {
        if (a.match === b.match) return 0;
        return a.match ? -1 : 1;
      });

      setParsedData(sortedParsedData);

      if (!isAddingMultiple) {
        setCombinedSpkName(response.data.fileName);
        setSpkSummary({
          fileName: response.data.fileName,
          fileUnik: response.data.savedFileName,
          fileType: response.data.fileType,
          totalWaktu: response.data.totalEstimasiWaktu,
          mesin: response.data.mesinDibutuhkan,
          manpower: response.data.manpowerDibutuhkan,
          status: response.data.utilisasiStatus,
          mesinTerpilih: response.data.mesinTerpilih || [],
          totalAvailable: response.data.totalMesinAvailable || 3,
          existingWaktu: response.data.existingWaktu || 0,
          mesinAvailable: response.data.mesinAvailable || [],
          shift: response.data.shift || 1,
          summaryPerMesin: response.data.summaryPerMesin
        });
        setActiveShift(`Shift ${response.data.shift || 1}`);
      } else {
        // Jika multiple SPK, update nama gabungan jika belum dinamai gabungan
        if (!combinedSpkName.startsWith("Gabungan_")) {
          setCombinedSpkName(`Gabungan_SPK_${Date.now()}`);
        }
        recalculateSummary(sortedParsedData);
      }

      setFileUploaded(true);
      setIsLocked(false);

      // Langsung refresh dengan tinggiData dari localStorage untuk mengisi kebutuhan SB
      try {
        const tinggiRaw = localStorage.getItem('tinggi_short_block_data');
        const tinggiData = tinggiRaw ? JSON.parse(tinggiRaw) : [];
        if (tinggiData.length > 0) {
          const refreshRes = await axios.post('http://localhost:5000/api/spk/refresh-preview', {
            parsedData: sortedParsedData,
            tinggiData
          });
          if (refreshRes.data && refreshRes.data.updatedParsedData) {
            const refreshedSorted = refreshRes.data.updatedParsedData.sort((a, b) => {
              if (a.match === b.match) return 0;
              return a.match ? -1 : 1;
            });
            setParsedData(refreshedSorted);
            recalculateSummary(refreshedSorted);
          }
        }
      } catch (refreshErr) {
        console.error("Auto-refresh setelah upload gagal:", refreshErr);
      }

    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Gagal mengupload dan memproses file.');
    } finally {
      setLoading(false);
    }
  };

  // ── Helper: hitung waktu satu baris sesuai logika fisika mesin ──────────────
  const calcRowWaktu = (row) => {
    const mesin = row.mesinTujuan || 'Vertikal';
    const ct = Number(row.ct) || 0;
    const qty = Number(row.qty) || 0;
    const sb = row.prediksi_sb !== null && row.prediksi_sb !== undefined ? Number(row.prediksi_sb) : null;
    const bypass = row.bypass_vertikal === true;

    let waktuVertikal = 0;
    // Semua yang punya ct_vertikal akan kena proses Vertikal dulu (kecuali bypass)
    if (!bypass && Number(row.ct_vertikal) > 0) {
      const sbMultiplier = sb !== null ? sb : qty;
      waktuVertikal = sbMultiplier * Number(row.ct_vertikal);
    } else if (mesin === 'Vertikal' && !bypass) {
      const multiplier = sb !== null ? sb : qty;
      waktuVertikal = multiplier * ct;
    }

    let waktuMesinTujuan = 0;
    const t = Number(row.ukuranT) || Number(row.bahanBakuT) || 0;
    const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    const kebutuhanSB = round2(sb !== null ? sb : qty);

    if (mesin === 'Horizontal') {
      const c1 = round2((Number(row.ct_c1) || 0) * kebutuhanSB);
      const c2 = round2((Number(row.ct_c2) || 0) * kebutuhanSB);
      const ptu = round2((Number(row.ct_ptu) || 0) * t * qty);
      const pma = round2((Number(row.ct_pma) || 0) * qty);
      const pmu = round2((Number(row.ct_pmu) || 0) * qty);
      const c3 = round2((Number(row.ct_c3) || 0) * kebutuhanSB);
      waktuMesinTujuan = round2(c1 + c2 + ptu + pma + pmu + c3);
    } else if (mesin === 'Carousel') {
      const c1 = Number(row.ct_c1) || 0;
      const c2 = (Number(row.ct_c2) || 0) * kebutuhanSB;
      const ptu = Number(row.ct_ptu) || 0;
      const pma = Number(row.ct_pma) || 0;
      const c3 = (Number(row.ct_c3) || 0) * kebutuhanSB;
      const faktorBagi = qty / 6;
      waktuMesinTujuan = c1 + c2 + (ptu * t * faktorBagi) + (pma * faktorBagi) + c3;
    } else if (mesin === 'Vertikal') {
      // Waktu utamanya sudah terhitung di waktuVertikal
      waktuMesinTujuan = 0;
    } else {
      // Fallback untuk CNC / Perforasi
      waktuMesinTujuan = qty * ct;
    }

    // --- PACKING CALCULATION ---
    const cust = row.customer ? row.customer.toLowerCase() : '';
    const packingVarians = cust.includes('ras') ? 'III' : 'I';
    const packingCt = packingVarians === 'III' ? 0.15 : 0.47;

    let packingFrekuensi = 0;
    if (t > 0 && qty > 0) {
      if (row.originalQty !== undefined && qty === Number(row.originalQty) && t === Number(row.originalT) && row.packing_frekuensi_awal !== undefined) {
        packingFrekuensi = row.packing_frekuensi_awal;
      } else {
        packingFrekuensi = Math.ceil((t * qty) / 20);
      }
    }
    const packingSummary = Number((packingCt * packingFrekuensi).toFixed(2));

    return {
      waktuVertikal: Number(waktuVertikal.toFixed(2)),
      waktuMesinTujuan: Number(waktuMesinTujuan.toFixed(2)),
      totalWaktu: Number((waktuVertikal + waktuMesinTujuan).toFixed(2)),
      packingFrekuensi,
      packingVarians,
      packingCt,
      packingSummary
    };
  };

  const recalculateSummary = (newData, overrideExistingWaktu = null) => {
    let newTotalWaktu = 0;
    const summaryPerMesin = {
      'Vertikal': { totalWaktu: 0, totalQty: 0 },
      'Horizontal': { totalWaktu: 0, totalQty: 0 },
      'Carousel': { totalWaktu: 0, totalQty: 0 },
      'CNC': { totalWaktu: 0, totalQty: 0 },
      'Perforasi': { totalWaktu: 0, totalQty: 0 },
      'Packing': { totalWaktu: 0, totalQty: 0 },
    };

    newData.forEach(row => {
      // Hitung ulang waktu per baris berdasarkan logic mesin terkini
      const times = calcRowWaktu(row);
      // Update field waktu di row agar konsisten
      row.waktu = times.totalWaktu;
      row.packing_frekuensi = times.packingFrekuensi;
      row.packing_varians = times.packingVarians;
      row.packing_ct = times.packingCt;
      row.packing_summary = times.packingSummary;
      newTotalWaktu += times.totalWaktu;

      if (times.waktuVertikal > 0) {
        summaryPerMesin['Vertikal'].totalWaktu += times.waktuVertikal;
        const sb = row.prediksi_sb !== null && row.prediksi_sb !== undefined && row.prediksi_sb !== '' ? Number(row.prediksi_sb) : null;
        const kebutuhanSB = sb !== null ? sb : (Number(row.qty) || 0);
        summaryPerMesin['Vertikal'].totalQty += Math.round((kebutuhanSB + Number.EPSILON) * 100) / 100;
      }

      if (row.mesinTujuan && row.mesinTujuan !== 'Vertikal' && times.waktuMesinTujuan > 0) {
        if (summaryPerMesin[row.mesinTujuan]) {
          summaryPerMesin[row.mesinTujuan].totalWaktu += times.waktuMesinTujuan;
          summaryPerMesin[row.mesinTujuan].totalQty += Number(row.qty) || 0;
        }
      }

      summaryPerMesin['Packing'].totalWaktu += times.packingSummary;
      summaryPerMesin['Packing'].totalQty += Number(row.qty) || 0;
    });

    newTotalWaktu = Number(newTotalWaktu.toFixed(2));
    const kapasitasPerMesin = 420; // 7 jam

    let totalMesin = 0;
    let totalManpower = 0;

    for (const [machineType, data] of Object.entries(summaryPerMesin)) {
      let maxCapacity = 1;
      let manpowerPerMachine = 1;

      if (machineType === 'Vertikal') {
        maxCapacity = 3;
        manpowerPerMachine = 3;
      } else if (machineType === 'Horizontal') {
        maxCapacity = 3;
        manpowerPerMachine = 1;
      } else if (machineType === 'Carousel') {
        maxCapacity = 2;
        manpowerPerMachine = 1;
      } else if (machineType === 'CNC') {
        maxCapacity = 1;
        manpowerPerMachine = 2;
      } else if (machineType === 'Perforasi') {
        maxCapacity = 1;
        manpowerPerMachine = 2;
      } else if (machineType === 'Packing') {
        maxCapacity = 1;
        manpowerPerMachine = 7;
      }

      let reqMachines = Math.ceil(data.totalWaktu / kapasitasPerMesin);
      if (reqMachines > maxCapacity) reqMachines = maxCapacity;

      if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
        reqMachines = 1;
      }

      let reqManpower = reqMachines * manpowerPerMachine;

      if (machineType === 'Packing') {
        reqMachines = 1; // It's just an area
        reqManpower = 7; // Fixed 7 manpower
      }

      const utilisasi = reqMachines > 0
        ? (data.totalWaktu / (reqMachines * kapasitasPerMesin)) * 100
        : 0;

      let status = 'Efisien';
      if (utilisasi < 50) status = 'Tidak Efisien';
      else if (utilisasi < 80) status = 'Cukup';

      if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
        status = 'Menunggu CT';
      }

      // Preserve existing manual edits if they exist in spkSummary
      const existingManual = spkSummary?.summaryPerMesin?.[machineType] || {};

      summaryPerMesin[machineType] = {
        ...data,
        mesinDibutuhkan: existingManual.manualMesin !== undefined ? existingManual.manualMesin : reqMachines,
        manpowerDibutuhkan: existingManual.manualManpower !== undefined ? existingManual.manualManpower : reqManpower,
        persentaseUtilisasi: Number(utilisasi.toFixed(2)),
        utilisasiStatus: status,
        manualMesin: existingManual.manualMesin,
        manualManpower: existingManual.manualManpower
      };

      totalMesin += summaryPerMesin[machineType].mesinDibutuhkan;
      totalManpower += summaryPerMesin[machineType].manpowerDibutuhkan;
    }

    const existingWaktu = overrideExistingWaktu !== null ? overrideExistingWaktu : (spkSummary?.existingWaktu || 0);

    setSpkSummary(prev => ({
      ...prev,
      totalWaktu: newTotalWaktu,
      mesin: totalMesin,
      manpower: totalManpower,
      summaryPerMesin,
      existingWaktu
    }));
  };



  const saveInlineEdit = (idx) => {
    const val = parseFloat(editQtyValue);
    const ctVal = parseFloat(editCtValue);
    if (isNaN(val) || val <= 0) {
      showModal("Peringatan", "Masukkan angka desimal Qty yang valid.", "warning");
      return;
    }
    if (isNaN(ctVal) || ctVal < 0) {
      showModal("Peringatan", "Masukkan angka desimal CT yang valid (minimal 0).", "warning");
      return;
    }

    const newData = [...parsedData];
    newData[idx].qty = val;
    newData[idx].qtyBB = val;
    newData[idx].ct = ctVal;
    if (editMesinValue) {
      newData[idx].mesinTujuan = editMesinValue;
    }
    if (editPrediksiSbValue !== '') {
      newData[idx].prediksi_sb = parseFloat(editPrediksiSbValue) || null;
    }
    newData[idx].match = true;
    // Hitung ulang waktu berdasarkan logic mesin yang benar (SB × CT untuk Vertikal)
    newData[idx].waktu = calcRowWaktu(newData[idx]).totalWaktu;

    setParsedData(newData);
    setEditingRowIndex(null);
    recalculateSummary(newData);
  };

  const handleDeletePreviewRow = (idx) => {
    showModal("Hapus Item", "Yakin ingin menghapus item ini dari SPK?", "warning", () => {
      const newData = parsedData.filter((_, index) => index !== idx);
      setParsedData(newData);

      recalculateSummary(newData);

      if (newData.length === 0) {
        setFileUploaded(false);
        setSpkSummary(null);
      }
    });
  };

  const handleProcessPaste = async () => {
    if (!pasteText.trim()) return;
    try {
      setIsRefreshing(true);
      const rows = pasteText.trim().split('\n');
      const newRows = rows.map(r => {
        const cols = r.split('\t').map(c => c.trim());
        const t = parseFloat(cols[5]) || 0;
        const qty = parseFloat(cols[6]) || 0;
        const p = parseFloat(cols[3]) || 0;
        const l = parseFloat(cols[4]) || 0;
        return {
          noWo: cols[0] || '-',
          item: cols[1] || '',
          customer: cols[2] || '-',
          ukuranP: p,
          ukuranL: l,
          ukuranT: t,
          bahanBakuP: p,
          bahanBakuL: l,
          bahanBakuT: t,
          qty: qty,
          qtyBB: qty,
          qtyCut: qty,
          match: false,
          ct: 0,
          mesinTujuan: '-',
          waktu: 0,
          prediksi_sb: null
        };
      });

      // Kirim newRows ke backend untuk di-grouping (seperti upload Excel)
      const response = await axios.post('http://localhost:5000/api/spk/preview-raw', { rawRows: newRows });
      
      if (response.data && response.data.parsedData) {
        const groupedNewRows = response.data.parsedData;
        const updatedData = [...parsedData, ...groupedNewRows];
        
        const sortedData = updatedData.sort((a, b) => {
          if (a.match === b.match) return 0;
          return a.match ? -1 : 1;
        });
        setParsedData(sortedData);
        recalculateSummary(sortedData);
      }
      setIsPasteModalOpen(false);
      setPasteText('');
      showModal("Sukses", "Data berhasil di-paste dan dikalkulasi!", "info");
    } catch (err) {
      console.error("Gagal paste:", err);
      showModal("Error", "Gagal memproses data paste.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveNewRow = () => {
    if (!newRowData.item || !newRowData.qty) {
      showModal("Peringatan", "Nama Item dan Qty harus diisi!", "warning");
      return;
    }

    const qtyVal = parseFloat(newRowData.qty) || 0;
    const qtyCutVal = parseInt(newRowData.qtyCut) || 0;
    const ctVal = parseFloat(newRowData.ct) || 0;

    if (qtyVal <= 0) {
      showModal("Peringatan", "Nilai Qty harus lebih dari 0!", "warning");
      return;
    }

    // Bangun Nama Item lengkap dengan dimensinya jika ada (P x L x T)
    let finalItem = newRowData.item.trim();
    if (newRowData.bahanBakuP || newRowData.bahanBakuL || newRowData.bahanBakuT) {
      const p = parseFloat(newRowData.bahanBakuP) || 0;
      const l = parseFloat(newRowData.bahanBakuL) || 0;
      const t = parseFloat(newRowData.bahanBakuT) || 0;
      finalItem = `${finalItem} (${p}x${l}x${t})`;
    }

    const newItem = {
      noWo: newRowData.noWo || '-',
      spkCutting: newRowData.spkCutting || '',
      customer: newRowData.customer || '-',
      item: finalItem,
      ukuranP: parseFloat(newRowData.ukuranP) || 0,
      ukuranL: parseFloat(newRowData.ukuranL) || 0,
      ukuranT: parseFloat(newRowData.ukuranT) || 0,
      qty: qtyVal,
      qtyBB: qtyVal,
      qtyCut: qtyCutVal,
      bahanBakuP: parseFloat(newRowData.bahanBakuP) || 0,
      bahanBakuL: parseFloat(newRowData.bahanBakuL) || 0,
      bahanBakuT: parseFloat(newRowData.bahanBakuT) || 0,
      keterangan: newRowData.keterangan || '',
      ct: ctVal,
      waktu: Number((qtyVal * ctVal).toFixed(2)),
      mesinTujuan: newRowData.mesinTujuan || '-',
      prediksi_sb: newRowData.prediksi_sb !== '' ? parseFloat(newRowData.prediksi_sb) : null,
      tinggi_balokan: newRowData.tinggi_balokan || null,
      match: newRowData.match || false,
    };

    const newData = [...parsedData, newItem];
    setParsedData(newData);
    recalculateSummary(newData);

    setIsAddingRow(false);
    setNewRowData({
      noWo: '', spkCutting: '', customer: '', item: '',
      ukuranP: '', ukuranL: '', ukuranT: '', qtyCut: '',
      bahanBakuP: '', bahanBakuL: '', bahanBakuT: '', qty: '',
      keterangan: '', ct: '', prediksi_sb: '', mesinTujuan: '', tinggi_balokan: '', match: false
    });
  };

  const handleLock = () => {
    // Cek apakah ada data anomali (match === false)
    const hasAnomaly = parsedData.some(row => !row.match);
    if (hasAnomaly) {
      showModal(
        "Peringatan Anomali",
        "Terdapat data anomali (Perlu Input Manual) pada tabel. Silakan lengkapi atau hapus data tersebut (berada di urutan paling bawah) sebelum mengunci SPK.",
        "warning"
      );
      return;
    }

    showModal(
      "PERHATIAN!",
      "Apakah Anda yakin ingin MENGUNCI dan MEMPROSES SPK ini?\n\nMohon crosscheck kembali data kuantitas bahan baku, cycle time, dan ukuran P L T untuk menghindari human error.\n\nKlik Oke jika data sudah benar.",
      'confirm',
      executeLock
    );
  };

  const executeLock = async () => {
    try {
      const finalFileName = combinedSpkName || spkSummary.fileName;
      // Gunakan file unik asli dari file pertama agar link download tetap berfungsi dan tidak error 404
      const finalFileUnik = spkSummary.fileUnik;

      await axios.post('http://localhost:5000/api/spk/save', {
        fileName: finalFileName,
        fileUnik: finalFileUnik,
        fileType: combinedSpkName.startsWith("Gabungan") ? "Multiple" : spkSummary.fileType,
        user: 'PPC',
        parsedData: parsedData,
        mesinTerpilih: spkSummary.summaryPerMesin,
        shift: spkSummary.shift
      });

      setIsLocked(true);
      showModal("Sukses", "SPK Berhasil Dikunci dan Disimpan ke Database MySQL!", 'success');

      // Refresh tabel history setelah berhasil mengunci
      fetchHistory();

      // Reset state agar kembali ke tampilan awal pemilihan file
      setFileUploaded(false);
      setIsLocked(false);
      setSpkSummary(null);
      setParsedData([]);
      setDataSnapshots([]);
      setCombinedSpkName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error("Gagal mengunci SPK:", error);
      showModal("Gagal", "Terjadi kesalahan saat menyimpan ke database.", 'error');
    }
  };

  // --- SINKRONISASI EXISTING WAKTU SETELAH DELETE HISTORY ---
  const syncExistingWaktu = async () => {
    if (!spkSummary) return; // hanya dijalankan kalau ada SPK yang sedang diedit di tabel
    try {
      const response = await axios.get('http://localhost:5000/api/spk/existing-waktu');
      const newExistingWaktu = response.data.existingWaktu || 0;
      // Gunakan parsedData saat ini, tapi existingWaktu yang baru!
      recalculateSummary(parsedData, newExistingWaktu);
    } catch (e) {
      console.error(e);
    }
  };

  // --- FUNGSI DELETE HISTORY ---
  const handleDeleteHistory = (id) => {
    showModal("Hapus Riwayat", "Yakin ingin menghapus riwayat SPK ini secara permanen?", "warning", async () => {
      try {
        await axios.delete(`http://localhost:5000/api/spk/history/${id}`);
        fetchHistory(); // Refresh tabel
        syncExistingWaktu(); // Sinkronisasi otomatis ke SPK yang sedang aktif!
        showModal("Sukses", "Riwayat berhasil dihapus.", "success");
      } catch (error) {
        console.error("Gagal menghapus riwayat:", error);
        showModal("Gagal", "Terjadi kesalahan saat menghapus data.", "error");
      }
    });
  };

  // --- FUNGSI UPDATE HISTORY (GANTI NAMA) ---
  const startEdit = (id, currentName) => {
    setEditId(id);
    setEditName(currentName);
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return showModal("Peringatan", "Nama file tidak boleh kosong!", "warning");
    try {
      await axios.put(`http://localhost:5000/api/spk/history/${id}`, { nama_file: editName });
      setEditId(null);
      fetchHistory(); // Refresh tabel
    } catch (error) {
      console.error("Gagal mengupdate nama:", error);
      showModal("Gagal", "Terjadi kesalahan saat menyimpan perubahan.", "error");
    }
  };

  // Helper untuk format tanggal dari MySQL
  const formatTanggal = (dateString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const renderMachineBreakdown = () => {
    if (!spkSummary) return null;
    if (!spkSummary?.summaryPerMesin) return null;
    const { summaryPerMesin } = spkSummary;
    const mesinLabels = Object.keys(summaryPerMesin);

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6 mb-6">
        <h3 className="font-bold text-navy-dark mb-4 flex items-center gap-2">
          <Activity size={18} className="text-accent-blue" />
          Saran Mesin & Manpower (Kapasitas: 420 Mnt/Mesin)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {mesinLabels.map(key => {
            const m = summaryPerMesin[key];
            if (m.totalQty === 0) return null;
            if (key === 'CNC' || key === 'Perforasi') return null;

            // Hitung utilisasi per mesin dengan spill over ke shift selanjutnya
            const machineUtilizations = [];
            let remainingTime = m.totalWaktu;
            const kapasitas = 420;
            let maxMesin = 1;

            if (key === 'Vertikal') maxMesin = 3;
            if (key === 'Horizontal') maxMesin = 3;
            if (key === 'Carousel') maxMesin = 2;

            let baseShift = 1;
            if (spkSummary?.shift) {
              const shiftStr = String(spkSummary.shift);
              const match = shiftStr.match(/\d+/);
              if (match) baseShift = parseInt(match[0], 10);
            }

            let currentShift = baseShift;
            let currentIdx = 1;

            if (m.totalQty > 0 && m.totalWaktu > 0) {
              while (remainingTime > 0) {
                let timeForThisMachine = Math.min(remainingTime, kapasitas);

                machineUtilizations.push({
                  shift: currentShift,
                  mesinIdx: currentIdx,
                  util: (timeForThisMachine / kapasitas) * 100
                });

                remainingTime -= timeForThisMachine;
                currentIdx++;
                if (currentIdx > maxMesin) {
                  currentIdx = 1;
                  currentShift++;
                }
              }
            } else {
              if (m.totalWaktu > 0) {
                machineUtilizations.push({
                  shift: 1, mesinIdx: 1, util: (m.totalWaktu / kapasitas) * 100
                });
              }
            }

            return (
              <div key={key} className="border border-gray-200 p-4 rounded-lg bg-gray-50 flex flex-col gap-2">
                <div className="font-bold text-navy-dark border-b pb-2 mb-2">{key}</div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Waktu:</span>
                  <span className="font-bold">{m.totalWaktu.toFixed(1)} mnt</span>
                </div>

                {key !== 'Packing' && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-500">Mesin:</span>
                    <span className="w-12 px-1 py-0.5 border border-transparent rounded text-right font-bold text-blue-600">
                      {m.mesinDibutuhkan}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500">Manpower:</span>
                  <span className="w-12 px-1 py-0.5 border border-transparent rounded text-right font-bold text-purple-600">
                    {m.manpowerDibutuhkan}
                  </span>
                </div>

                {key !== 'Packing' && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 font-semibold mb-2">Utilisasi per Mesin:</div>
                    {machineUtilizations.length > 0 ? machineUtilizations.map((mu, idx) => {
                      const util = mu.util;
                      const statusTBD = m.utilisasiStatus === 'Menunggu CT';
                      const isGood = util >= 80 && util <= 100;
                      const isWarn = util >= 50 && util < 80;
                      const bgColor = isGood ? 'bg-green-500' : isWarn ? 'bg-yellow-500' : 'bg-gray-400';
                      const badgeBg = isGood ? 'bg-green-100 text-green-700' : isWarn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
                      const shiftLabel = mu.shift > baseShift ? ` (Shift ${mu.shift})` : '';

                      return (
                        <div key={idx} className="mb-2 last:mb-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 font-medium">Mesin {mu.mesinIdx}<span className="text-accent-blue">{shiftLabel}</span></span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeBg}`}>
                              {statusTBD ? 'TBD' : `${util.toFixed(1)}%`}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${bgColor}`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-xs text-gray-400 italic">0 Mesin</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">

      {/* HIDDEN FILE INPUT (Berlaku untuk awal upload maupun multiple upload) */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.pdf"
        onChange={handleFileChange}
      />

      {/* AREA UPLOAD & SUMMARY KALKULASI */}
      {!fileUploaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opsi 1: Upload SPK */}
          <div
            className="bg-white p-8 rounded-xl border-2 border-dashed border-accent-blue shadow-sm flex flex-col items-center justify-center text-center h-64 bg-blue-50/20 transition-all hover:bg-blue-50/40 cursor-pointer relative"
            onClick={handleAreaClick}
          >
            {loading ? (
              <div className="flex flex-col items-center text-accent-blue">
                <Loader size={36} className="animate-spin mb-4" />
                <h3 className="text-lg font-bold text-navy-dark">Memproses SPK...</h3>
                <p className="text-sm text-gray-500">Sistem sedang mencocokkan data ke database cycle time</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-lg font-bold text-navy-dark mb-1">Upload Surat Perintah Kerja (SPK)</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Pilih atau Drag & Drop file
                  <span className="font-bold text-green-600"> PDF (.pdf)</span> atau
                  <span className="font-bold text-blue-600"> Excel (.xlsx)</span>
                </p>
                <button className="bg-accent-blue text-navy-dark px-6 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-300 transition-colors">
                  Pilih File SPK
                </button>
                {errorMsg && <p className="mt-4 text-red-500 text-sm font-semibold">{errorMsg}</p>}
              </>
            )}
          </div>

          {/* Opsi 2: Input Manual / Copas Tabel Polosan */}
          <div
            className="bg-white p-8 rounded-xl border-2 border-dashed border-purple-400 shadow-sm flex flex-col items-center justify-center text-center h-64 bg-purple-50/10 transition-all hover:bg-purple-50/30 cursor-pointer relative"
            onClick={(e) => {
              e.stopPropagation();
              setFileUploaded(true);
              setCombinedSpkName(`SPK_Manual_${new Date().toISOString().slice(0,10)}`);
              setParsedData([]);
              setSpkSummary({
                totalWaktu: 0,
                mesin: 0,
                manpower: 0,
                existingWaktu: 0,
                summaryPerMesin: { 
                  Vertikal: { totalWaktu: 0, totalQty: 0, mesinDibutuhkan: 0, manpowerDibutuhkan: 0 }, 
                  Horizontal: { totalWaktu: 0, totalQty: 0, mesinDibutuhkan: 0, manpowerDibutuhkan: 0 }, 
                  Carousel: { totalWaktu: 0, totalQty: 0, mesinDibutuhkan: 0, manpowerDibutuhkan: 0 } 
                }
              });
            }}
          >
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-navy-dark mb-1">Buat SPK Manual (Tabel Polosan)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Buka tabel kosong untuk <span className="font-bold text-purple-600">Copas data dari Excel</span> atau input satu per satu.
            </p>
            <button className="bg-purple-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-purple-600 transition-colors">
              Mulai Input Manual
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-navy-dark text-white rounded-xl shadow-lg p-6 border border-white/10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden gap-6 md:gap-0">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent-blue/10 rounded-full blur-2xl"></div>

            {/* 1. INFO SPK */}
            <div className="flex items-center gap-4 z-10 w-full md:flex-1 md:pr-4">
              <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center text-accent-blue shrink-0">
                <FileText size={28} />
              </div>
              <div className="flex flex-col w-full">
                <input
                  type="text"
                  value={combinedSpkName}
                  onChange={(e) => setCombinedSpkName(e.target.value)}
                  className="font-bold text-lg bg-transparent border-b border-dashed border-gray-400 focus:border-white focus:outline-none text-white w-full pb-1"
                  placeholder="Nama SPK..."
                  title="Edit Nama SPK Gabungan"
                  disabled={isLocked}
                />
                <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                  <CheckCircle size={14} className="text-green-400" /> Kalkulasi Otomatis Selesai
                </p>
              </div>
            </div>

            {/* 2. KEBUTUHAN MESIN */}
            <div className="z-10 w-full md:flex-1 flex md:justify-center border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:px-8">
              <div>
                <div className="text-gray-400 text-xs uppercase font-semibold mb-2">Kebutuhan Mesin</div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(spkSummary.summaryPerMesin || {}).map(([mesin, data]) => {
                    if (data.mesinDibutuhkan > 0 || data.totalQty > 0) {
                      return (
                        <div key={mesin} className="flex items-center gap-3 text-sm">
                          <span className="font-bold text-accent-blue w-20">{mesin}</span>
                          <span className="text-white font-semibold">: {data.mesinDibutuhkan} Unit</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            {/* 3. TOTAL MANPOWER */}
            <div className="z-10 w-full md:flex-1 flex md:justify-center border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8">
              <div>
                <div className="text-gray-400 text-xs uppercase font-semibold mb-2">Total Manpower</div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(spkSummary.summaryPerMesin || {}).map(([mesin, data]) => {
                    if (data.mesinDibutuhkan > 0 || data.totalQty > 0) {
                      return (
                        <div key={mesin} className="flex items-center gap-3 text-sm">
                          <span className="font-bold text-accent-blue w-20">{mesin}</span>
                          <span className="text-white font-semibold">: {data.manpowerDibutuhkan} Orang</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            {/* 4. TOTAL KEBUTUHAN SB */}
            <div className="z-10 w-full md:flex-1 flex md:justify-center border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8">
              <div>
                <div className="text-gray-400 text-xs uppercase font-semibold mb-2">Total Kebutuhan SB</div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-accent-blue w-20">Short Block</span>
                    <span className="text-white font-semibold">: {
                      parsedData.reduce((sum, row) => {
                        const sb = row.prediksi_sb !== null && row.prediksi_sb !== undefined ? Number(row.prediksi_sb) : Number(row.qty);
                        return sum + (isNaN(sb) ? 0 : sb);
                      }, 0).toFixed(2).replace(/\.00$/, '')
                    } Pcs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {renderMachineBreakdown()}
        </>
      )}

      {/* PREVIEW TABEL & KUNCI SPK */}
      {fileUploaded && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold uppercase">SPK untuk:</span>
              {isLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold bg-navy-dark text-white">
                  <Clock size={13} />
                  {spkSummary?.shift || 'Shift 1'}
                </span>
              ) : (
                <div className="relative inline-flex items-center bg-navy-dark rounded-md text-white overflow-hidden">
                  <div className="pl-3 pointer-events-none flex items-center justify-center">
                    <Clock size={13} />
                  </div>
                  <select
                    className="pl-2 pr-6 py-1.5 text-sm font-bold bg-navy-dark text-white outline-none cursor-pointer hover:bg-opacity-90 appearance-none"
                    value={spkSummary?.shift || 'Shift 1'}
                    onChange={(e) => setSpkSummary({ ...spkSummary, shift: e.target.value })}
                  >
                    <option value="Shift 1">Shift 1</option>
                    <option value="Shift 2">Shift 2</option>
                    <option value="Shift 3">Shift 3</option>
                  </select>
                  {/* Custom Arrow for select */}
                  <div className="pointer-events-none absolute right-2 flex items-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              )}
              <span className="text-xs text-gray-400 italic">(1 SPK = 1 Shift)</span>
            </div>

            <div className="w-full md:w-auto relative max-w-sm flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari SPK atau WO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
              />
            </div>

            {isLocked ? (
              <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg font-bold text-sm border border-gray-200">
                <Lock size={16} /> Locked by PPC
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => {
                  // Fungsi Undo per-file
                  if (dataSnapshots.length > 0) {
                    const prevData = dataSnapshots[dataSnapshots.length - 1];
                    setParsedData(prevData);
                    setDataSnapshots(prev => prev.slice(0, -1));
                    recalculateSummary(prevData);
                  } else {
                    // Reset total ke awal jika tidak ada snapshot
                    setFileUploaded(false);
                    setSpkSummary(null);
                    setParsedData([]);
                    setDataSnapshots([]);
                    setCombinedSpkName('');
                  }
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors shadow-sm" title="Undo SPK terakhir yang dimasukkan">
                  <X size={16} /> Undo
                </button>
                <button onClick={() => setIsAddingRow(true)} className="flex items-center gap-2 bg-purple-100 text-purple-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-purple-200 transition-colors shadow-sm">
                  <span className="text-lg leading-none">+</span> Tambah Manual
                </button>
                <button onClick={() => setIsPasteModalOpen(true)} className="flex items-center gap-2 bg-green-100 text-green-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-green-200 transition-colors shadow-sm">
                  <FileText size={16} /> Copas dari Excel
                </button>
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      const tinggiRaw = localStorage.getItem('tinggi_short_block_data');
                      const tinggiData = tinggiRaw ? JSON.parse(tinggiRaw) : [];
                      const response = await axios.post('http://localhost:5000/api/spk/refresh-preview', { parsedData, tinggiData });
                      if (response.data && response.data.updatedParsedData) {
                        const sortedData = response.data.updatedParsedData.sort((a, b) => {
                          if (a.match === b.match) return 0;
                          return a.match ? -1 : 1;
                        });
                        setParsedData(sortedData);
                        recalculateSummary(sortedData);
                      }
                    } catch (err) {
                      console.error("Gagal refresh:", err);
                    } finally {
                      setTimeout(() => setIsRefreshing(false), 500); // 500ms delay to ensure animation is visible
                    }
                  }}
                  disabled={isRefreshing}
                  className={`flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm ${isRefreshing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-200'}`}
                  title="Refresh data preview (sinkronkan dengan matriks ketinggian terbaru)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? 'animate-spin' : ''}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-200 transition-colors shadow-sm">
                  <UploadCloud size={16} /> Tambah SPK Lain
                </button>
                <button onClick={async () => {
                  const hasAnomaly = parsedData.some(row => !row.match);
                  if (hasAnomaly) {
                    showModal(
                      "Peringatan Anomali",
                      "Terdapat data anomali (Perlu Input Manual) pada tabel. Silakan lengkapi atau hapus data tersebut (berada di urutan paling bawah) sebelum memproses SPK.",
                      "warning"
                    );
                    return;
                  }

                  try {
                    const response = await axios.post('http://localhost:5000/api/spk/calculate-summary', { parsedData });
                    if (response.data) {
                      setSummaryModalData(response.data);
                      setIsSummaryModalOpen(true);
                    }
                  } catch (error) {
                    console.error("Gagal melakukan kalkulasi:", error);
                    showModal("Error", "Gagal memproses kalkulasi SPK.", "error");
                  }
                }} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors shadow-sm">
                  <Lock size={16} /> Proses SPK
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-200 shadow-sm">
                  <th className="p-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('noWo')}>
                    <div className="flex items-center gap-1">
                      No WO / Cust
                      {sortConfig.key === 'noWo' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('item')}>
                    <div className="flex items-center gap-1">
                      Description
                      {sortConfig.key === 'item' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('qty')}>
                    <div className="flex items-center justify-center gap-1">
                      Qty Ordered
                      {sortConfig.key === 'qty' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('prediksi_sb')}>
                    <div className="flex items-center justify-center gap-1">
                      <div>Kebutuhan SB</div>
                      {sortConfig.key === 'prediksi_sb' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                    <div className="text-[9px] font-normal text-gray-400 normal-case mt-0.5">Σ(T×Qty) ÷ T.Balokan</div>
                  </th>
                  <th className="p-4 font-semibold text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('match')}>
                    <div className="flex items-center justify-center gap-1">
                      Match DB
                      {sortConfig.key === 'match' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  {!isLocked && <th className="p-4 font-semibold text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {parsedData.map((r, i) => ({ ...r, originalIndex: i })).filter(row => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  const wo = row.noWo ? String(row.noWo).toLowerCase() : '';
                  const item = row.item ? String(row.item).toLowerCase() : '';
                  return wo.includes(search) || item.includes(search);
                }).sort((a, b) => {
                  if (!sortConfig.key) return 0;
                  
                  let aVal = a[sortConfig.key];
                  let bVal = b[sortConfig.key];
                  
                  if (sortConfig.key === 'qty' || sortConfig.key === 'prediksi_sb') {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                  } else if (sortConfig.key === 'match') {
                    aVal = aVal ? 1 : 0;
                    bVal = bVal ? 1 : 0;
                  } else {
                    aVal = String(aVal || '').toLowerCase();
                    bVal = String(bVal || '').toLowerCase();
                  }
                  
                  if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                  if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
                }).map((row) => {
                  const idx = row.originalIndex;
                  return (
                    <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!row.match ? 'bg-yellow-50/50' : ''}`}>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-3">
                          {row.noWo && typeof row.noWo === 'string'
                            ? row.noWo.split(',').map((wo, i) => {
                              const customers = row.customer && typeof row.customer === 'string' ? row.customer.split(',') : [];
                              const cust = customers[i] || '-';
                              return (
                                <div key={i} className="flex flex-col">
                                  <span className="font-bold text-navy-dark whitespace-nowrap">{wo.trim()}</span>
                                  <span className="text-[11px] text-gray-500 leading-tight mt-0.5">{cust.trim()}</span>
                                </div>
                              );
                            })
                            : (
                              <div className="flex flex-col">
                                <span className="font-bold text-navy-dark">{row.noWo}</span>
                                <span className="text-[11px] text-gray-500 leading-tight mt-0.5">{row.customer}</span>
                              </div>
                            )
                          }
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">
                          {row.match ? row.item : row.item.replace(/\s*\([\d.x\s]+\)\s*$/, '')}
                        </div>
                        {row.tinggi_balokan && row.match && (
                          <div className="text-[10px] font-bold text-gray-400 mt-0.5">T. Balokan: {row.tinggi_balokan} cm</div>
                        )}
                        {editingRowIndex === idx ? (
                          <div className="mt-1">
                            <select
                              value={editMesinValue}
                              onChange={(e) => setEditMesinValue(e.target.value)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-navy-dark border border-blue-400 outline-none focus:ring-1 focus:ring-accent-blue"
                            >
                              <option value="Vertikal">Vertikal</option>
                              <option value="Horizontal">Horizontal</option>
                              <option value="Carousel">Carousel</option>
                            </select>
                          </div>
                        ) : (
                          row.mesinTujuan && row.match && (
                            <div className="mt-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-accent-blue border border-blue-100">
                                Mesin: {row.mesinTujuan}
                              </span>
                            </div>
                          )
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-blue-600">
                        {editingRowIndex === idx ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 px-2 py-1 border border-blue-400 rounded text-center text-sm font-bold text-navy-dark focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={editQtyValue}
                            onChange={(e) => setEditQtyValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(idx);
                              if (e.key === 'Escape') setEditingRowIndex(null);
                            }}
                          />
                        ) : (
                          <>
                            {row.qty} SH
                          </>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-purple-600">
                        {editingRowIndex === idx ? (
                          // Input override SB aktif untuk SEMUA mesin
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="SB"
                            className="w-20 px-2 py-1 border border-purple-400 rounded text-center text-sm font-bold text-navy-dark focus:outline-none focus:ring-2 focus:ring-purple-200"
                            value={editPrediksiSbValue}
                            onChange={(e) => setEditPrediksiSbValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(idx);
                              if (e.key === 'Escape') setEditingRowIndex(null);
                            }}
                          />
                        ) : (
                          row.prediksi_sb !== null && row.prediksi_sb !== undefined ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-purple-600 font-black text-sm">
                                {Number(row.prediksi_sb).toFixed(2)}
                              </span>
                              <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wide">SB</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.match ? (
                          <span className="inline-flex items-center justify-center bg-green-100 text-green-700 p-1.5 rounded-md"><CheckCircle size={16} /></span>
                        ) : (
                          <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-700 p-1.5 rounded-md" title="Perlu dicek manual!"><AlertTriangle size={16} /></span>
                        )}
                      </td>
                      {!isLocked && (
                        <td className="p-4 text-center">
                          {editingRowIndex === idx ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => saveInlineEdit(idx)} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" title="Simpan">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingRowIndex(null)} className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors" title="Batal">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => {
                                setEditingRowIndex(idx);
                                setEditQtyValue(row.qty);
                                setEditCtValue(row.ct || '');
                                setEditMesinValue(row.mesinTujuan || 'Vertikal');
                                setEditPrediksiSbValue(row.prediksi_sb || '');
                              }} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Edit Item">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeletePreviewRow(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Hapus Item">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH BARIS MANUAL */}
      {isAddingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-popup">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-xl">
              <h3 className="font-bold text-lg text-navy-dark">Tambah SPK Manual</h3>
              <button onClick={() => setIsAddingRow(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">No WO</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-accent-blue" value={newRowData.noWo} onChange={e => setNewRowData({ ...newRowData, noWo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Customer</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-accent-blue" value={newRowData.customer} onChange={e => setNewRowData({ ...newRowData, customer: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Description (Nama Item) <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 font-bold outline-none focus:border-accent-blue" value={newRowData.item} onChange={e => setNewRowData({ ...newRowData, item: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Ukuran (P x L x T)</label>
                  </div>
                  <input type="number" step="any" placeholder="Panjang" className="w-full border border-gray-300 rounded-lg px-2 py-1 outline-none focus:border-accent-blue" value={newRowData.bahanBakuP} onChange={e => setNewRowData({ ...newRowData, bahanBakuP: e.target.value })} />
                  <input type="number" step="any" placeholder="Lebar" className="w-full border border-gray-300 rounded-lg px-2 py-1 outline-none focus:border-accent-blue" value={newRowData.bahanBakuL} onChange={e => setNewRowData({ ...newRowData, bahanBakuL: e.target.value })} />
                  <input type="number" step="any" placeholder="Tinggi" className="w-full border border-gray-300 rounded-lg px-2 py-1 outline-none focus:border-accent-blue" value={newRowData.bahanBakuT} onChange={e => setNewRowData({ ...newRowData, bahanBakuT: e.target.value })} />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Qty Ordered (SH) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-accent-blue font-bold text-blue-600" value={newRowData.qty} onChange={e => setNewRowData({ ...newRowData, qty: e.target.value })} />
                </div>

                {/* Auto Calculated Fields Container */}
                <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Auto-Kalkulasi Sistem (Preview SPK)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold mb-1">Kebutuhan SB</div>
                      {newRowData.prediksi_sb ? (
                        <div className="flex flex-col items-start">
                          <span className="text-purple-600 font-black text-lg leading-none">
                            {Number(newRowData.prediksi_sb).toFixed(2)} <span className="text-[10px] text-purple-400 uppercase tracking-wide">SB</span>
                          </span>
                          {newRowData.tinggi_balokan && (
                            <span className="text-[9px] text-gray-400 font-medium mt-1">Tinggi Balokan: {newRowData.tinggi_balokan} cm</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium italic">Belum dikalkulasi</span>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold mb-1">Target Mesin</div>
                      {newRowData.mesinTujuan ? (
                        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          {newRowData.mesinTujuan}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium italic">Belum dikalkulasi</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] text-gray-500 font-semibold">CT (Cycle Time): </span>
                    {newRowData.ct > 0 ? (
                      <span className="text-xs font-bold text-green-600">{newRowData.ct} Mnt/SH</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium italic">-</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-semibold">Status Data:</span>
                    {newRowData.match ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200"><CheckCircle size={12} /> Cocok dengan Database</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200"><AlertTriangle size={12} /> Tidak Ditemukan / Manual</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setIsAddingRow(false)} className="px-6 py-2 rounded-lg font-bold text-sm text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button onClick={handleSaveNewRow} className="px-6 py-2 rounded-lg font-bold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                <Check size={16} /> Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PASTE EXCEL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-navy-dark flex items-center gap-2">
                <FileText className="text-green-500" /> Copas Data dari Excel
              </h2>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Paste (Ctrl+V) data baris dari Excel ke dalam kotak di bawah ini. Pastikan urutan kolom sesuai standar: <br/>
                <strong>No WO | Item (Description) | Customer | P | L | T | Qty</strong>
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste data TSV Excel di sini..."
                className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              ></textarea>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsPasteModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-sm text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button onClick={handleProcessPaste} disabled={isRefreshing || !pasteText.trim()} className="px-6 py-2 rounded-lg font-bold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
                {isRefreshing ? <Loader size={16} className="animate-spin" /> : <Check size={16} />} 
                Proses Data Paste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY UPLOAD DARI DATABASE (Real-time) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-navy-dark flex items-center gap-2"><Clock size={18} /> History Upload SPK</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 font-semibold flex items-center gap-1"><Filter size={14} /> Filter:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-gray-700 outline-none focus:border-accent-blue"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-gray-700 outline-none focus:border-accent-blue"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                title="Hapus Filter"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-400 text-xs uppercase border-b border-gray-100">
                <th className="p-4 font-semibold">Nama File</th>
                <th className="p-4 font-semibold">Tanggal Upload</th>
                <th className="p-4 font-semibold">Diupload Oleh</th>
                <th className="p-4 font-semibold text-center">Item Terbaca</th>
                <th className="p-4 font-semibold text-center">Shift</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {historyData.length > 0 ? historyData.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4">
                    {editId === row.id ? (
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          className="border border-accent-blue/50 px-2 py-1 rounded text-sm w-full outline-none focus:ring-1 focus:ring-accent-blue"
                        />
                      </div>
                    ) : (
                      <a
                        href={`http://localhost:5000/uploads/${row.file_unik}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-navy-dark flex items-center gap-2 hover:text-accent-blue transition-colors group w-max"
                        title="Klik untuk mengunduh dokumen asli"
                      >
                        <FileText size={16} className="text-blue-400" />
                        {row.nama_file}
                        <Download size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent-blue" />
                      </a>
                    )}
                  </td>
                  <td className="p-4 flex items-center gap-2 text-gray-500">
                    <Calendar size={14} className="text-gray-400" /> {formatTanggal(row.tanggal_upload)}
                  </td>
                  <td className="p-4 font-semibold">{row.diupload_oleh}</td>
                  <td className="p-4 text-center font-bold">{row.total_item}</td>
                  <td className="p-4 text-center font-bold text-gray-600">Shift {row.shift || 1}</td>
                  <td className="p-4">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 flex items-center gap-1 w-max">
                      <Lock size={12} /> {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editId === row.id ? (
                        <>
                          <button onClick={() => saveEdit(row.id)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors" title="Simpan Perubahan">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors" title="Batal">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => navigate(`/dashboard-terakhir?history_id=${row.id}`)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors" title="Lihat Dashboard SPK">
                            <Activity size={16} />
                          </button>
                          <button onClick={() => startEdit(row.id, row.nama_file)} className="p-1.5 bg-blue-50 text-blue-500 rounded hover:bg-blue-100 transition-colors" title="Ganti Nama File">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteHistory(row.id)} className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors" title="Hapus SPK">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-semibold">Belum ada history SPK yang terkunci.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM MODAL OVERLAY */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-popup">
            <div className={`p-6 border-b ${modalConfig.type === 'error' ? 'bg-red-50 border-red-100' :
              modalConfig.type === 'success' ? 'bg-green-50 border-green-100' :
                modalConfig.type === 'warning' ? 'bg-yellow-50 border-yellow-100' :
                  'bg-blue-50 border-blue-100'
              }`}>
              <div className="flex items-center gap-3">
                {modalConfig.type === 'error' && <AlertTriangle className="text-red-500 w-8 h-8" />}
                {modalConfig.type === 'success' && <CheckCircle className="text-green-500 w-8 h-8" />}
                {modalConfig.type === 'warning' && <AlertTriangle className="text-yellow-500 w-8 h-8" />}
                {modalConfig.type === 'confirm' && <Activity className="text-blue-500 w-8 h-8" />}
                <h3 className={`text-lg font-bold ${modalConfig.type === 'error' ? 'text-red-700' :
                  modalConfig.type === 'success' ? 'text-green-700' :
                    modalConfig.type === 'warning' ? 'text-yellow-700' :
                      'text-blue-700'
                  }`}>
                  {modalConfig.title}
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed text-center">
                {modalConfig.message}
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              {(modalConfig.type === 'confirm' || modalConfig.type === 'warning') ? (
                <>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      closeModal();
                    }}
                    className={`px-5 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-colors ${modalConfig.type === 'warning' ? 'bg-red-500 hover:bg-red-600' : 'bg-accent-blue hover:bg-blue-600'
                      }`}
                  >
                    Oke
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-accent-blue hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY CALCULATION MODAL */}
      {isSummaryModalOpen && summaryModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-popup">

            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-navy-dark">Hasil Kalkulasi SPK</h2>
                <p className="text-sm text-gray-500 mt-1">Rincian estimasi waktu dan utilisasi per mesin</p>
              </div>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Tabbed UI */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">

              {/* Tab Navigation */}
              <div className="flex gap-4 mb-6 border-b border-gray-200 sticky top-0 bg-white z-20 pt-6 -mt-6 px-6 -mx-6">
                {['Vertikal', 'Horizontal', 'Carousel', 'Packing'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveModalTab(tab)}
                    className={`pb-3 px-4 font-bold text-sm transition-colors relative ${activeModalTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    {tab === 'Packing' ? 'Area Packing' : `Mesin ${tab}`}
                  </button>
                ))}
              </div>

              {/* Tab Content: Vertikal */}
              {activeModalTab === 'Vertikal' && summaryModalData.vertikal && (
                <div className="mb-6 animate-fade-in">
                  {/* Summary Card Vertikal */}
                  {summaryModalData.vertikal.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Shortblock</span>
                        <span className="text-xl font-black text-orange-500">
                          {Math.ceil(summaryModalData.vertikal.data?.reduce((sum, r) => sum + (Number(r.kebutuhanSB) || 0), 0) || 0)} <span className="text-sm font-normal">SB</span>
                        </span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          Asli: {(summaryModalData.vertikal.data?.reduce((sum, r) => sum + (Number(r.kebutuhanSB) || 0), 0) || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Waktu</span>
                        <span className="text-xl font-black text-navy-dark">{summaryModalData.vertikal.summary.totalWaktu} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Kapasitas 1 Shift</span>
                        <span className="text-xl font-black text-gray-700">{summaryModalData.vertikal.summary.kapasitas1Shift} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Bukaan Mesin</span>
                        <span className="text-xl font-black text-blue-600">
                          {summaryModalData.vertikal.summary.estimasiBukaanMesin} <span className="text-gray-400 text-lg">/ {summaryModalData.vertikal.summary.mesinTersedia}</span>
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Operator</span>
                        <span className="text-xl font-black text-purple-600">{summaryModalData.vertikal.summary.estimasiOperator} <span className="text-sm font-normal">Orang</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Utilisasi Mesin</span>
                        <span className="text-xl font-black text-green-600">{summaryModalData.vertikal.summary.utilisasiMesin}%</span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto max-h-[50vh] border border-gray-200 rounded-lg mb-6 relative">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
                        <tr>
                          <th className="p-3 font-semibold border-b">Description / Nama Kualitas</th>
                          <th className="p-3 font-semibold text-center border-b">SH (Qty)</th>
                          <th className="p-3 font-semibold text-center border-b">Kebutuhan SB</th>
                          <th className="p-3 font-semibold text-center border-b">Varians</th>
                          <th className="p-3 font-semibold text-center border-b">CT (Menit)</th>
                          <th className="p-3 font-semibold text-center border-b">Calculate CT (Menit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryModalData.vertikal.data && summaryModalData.vertikal.data.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-navy-dark">{row.description}</td>
                            <td className="p-3 text-center text-gray-700">{row.qty}</td>
                            <td className="p-3 text-center text-purple-600 font-bold">{row.kebutuhanSB}</td>
                            <td className="p-3 text-center text-gray-700 font-semibold">{row.varians}</td>
                            <td className="p-3 text-center text-gray-600">{row.ctVertikal}</td>
                            <td className="p-3 text-center font-bold text-blue-600">{row.subtotalWaktu}</td>
                          </tr>
                        ))}
                        {(!summaryModalData.vertikal.data || summaryModalData.vertikal.data.length === 0) && (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-gray-500 italic">Tidak ada data untuk Mesin Vertikal</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-blue-50/50">
                        <tr>
                          <td colSpan="5" className="p-3 text-right font-bold text-navy-dark">TOTAL SUBTOTAL WAKTU:</td>
                          <td className="p-3 text-center font-black text-blue-700">
                            {summaryModalData.vertikal.summary?.totalWaktu || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>


                </div>
              )}

              {/* Tab Content: Horizontal */}
              {activeModalTab === 'Horizontal' && summaryModalData.horizontal && (
                <div className="mb-6 animate-fade-in">
                  {/* Summary Card Horizontal */}
                  {summaryModalData.horizontal.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Kebutuhan Sheet</span>
                        <span className="text-xl font-black text-blue-600">
                          {(summaryModalData.horizontal.summary.totalQty || 0).toLocaleString('id-ID')} <span className="text-sm font-normal">Sheet</span>
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Waktu</span>
                        <span className="text-xl font-black text-navy-dark">{summaryModalData.horizontal.summary.totalWaktu} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Kapasitas 1 Shift</span>
                        <span className="text-xl font-black text-gray-700">{summaryModalData.horizontal.summary.kapasitas1Shift} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Bukaan Mesin</span>
                        <span className="text-xl font-black text-blue-600">
                          {summaryModalData.horizontal.summary.estimasiBukaanMesin} <span className="text-gray-400 text-lg">/ {summaryModalData.horizontal.summary.mesinTersedia}</span>
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Operator</span>
                        <span className="text-xl font-black text-purple-600">{summaryModalData.horizontal.summary.estimasiOperator} <span className="text-sm font-normal">Orang</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Utilisasi Mesin</span>
                        <span className="text-xl font-black text-green-600">{summaryModalData.horizontal.summary.utilisasiMesin}%</span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto max-h-[50vh] border border-gray-200 rounded-lg mb-6 relative">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
                        <tr>
                          <th className="p-3 font-semibold border-b">Description / Nama Kualitas</th>
                          <th className="p-3 font-semibold text-center border-b">SH (Qty)</th>
                          <th className="p-3 font-semibold text-center border-b">Kebutuhan SB</th>
                          <th className="p-3 font-semibold text-center border-b">Varians</th>
                          <th className="p-3 font-semibold text-center border-b">C1</th>
                          <th className="p-3 font-semibold text-center border-b">C2</th>
                          <th className="p-3 font-semibold text-center border-b">Calc PTU</th>
                          <th className="p-3 font-semibold text-center border-b">Calc PMA</th>
                          <th className="p-3 font-semibold text-center border-b">Calc PMU</th>
                          <th className="p-3 font-semibold text-center border-b">C3</th>
                          <th className="p-3 font-semibold text-center border-b">Total CT (Menit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryModalData.horizontal.data && summaryModalData.horizontal.data.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-navy-dark">{row.description}</td>
                            <td className="p-3 text-center text-gray-700">{row.qty}</td>
                            <td className="p-3 text-center text-purple-600 font-bold">{row.kebutuhanSB}</td>
                            <td className="p-3 text-center text-blue-600 font-bold">{row.varians}</td>
                            <td className="p-3 text-center text-gray-600">{row.c1}</td>
                            <td className="p-3 text-center text-gray-600">{row.c2}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcPtu}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcPma}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcPmu}</td>
                            <td className="p-3 text-center text-gray-600">{row.c3}</td>
                            <td className="p-3 text-center font-bold text-blue-600">{row.subtotalWaktu}</td>
                          </tr>
                        ))}
                        {(!summaryModalData.horizontal.data || summaryModalData.horizontal.data.length === 0) && (
                          <tr>
                            <td colSpan="11" className="p-4 text-center text-gray-500 italic">Tidak ada data untuk Mesin Horizontal</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-blue-50/50">
                        <tr>
                          <td colSpan="10" className="p-3 text-right font-bold text-navy-dark">TOTAL KESELURUHAN CT:</td>
                          <td className="p-3 text-center font-black text-blue-700">
                            {summaryModalData.horizontal.summary?.totalWaktu || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>


                </div>
              )}

              {/* Tab Content: Carousel */}
              {activeModalTab === 'Carousel' && summaryModalData.carousel && (
                <div className="mb-6 animate-fade-in">
                  {/* Summary Card Carousel */}
                  {summaryModalData.carousel.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100 mb-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Kebutuhan Sheet</span>
                        <span className="text-xl font-black text-blue-600">
                          {(summaryModalData.carousel.summary.totalQty || 0).toLocaleString('id-ID')} <span className="text-sm font-normal">Sheet</span>
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Waktu</span>
                        <span className="text-xl font-black text-navy-dark">{summaryModalData.carousel.summary.totalWaktu} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Kapasitas 1 Shift</span>
                        <span className="text-xl font-black text-gray-700">{summaryModalData.carousel.summary.kapasitas1Shift} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Bukaan Mesin</span>
                        <span className="text-xl font-black text-blue-600">
                          {summaryModalData.carousel.summary.estimasiBukaanMesin} <span className="text-gray-400 text-lg">/ {summaryModalData.carousel.summary.mesinTersedia}</span>
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Operator</span>
                        <span className="text-xl font-black text-purple-600">{summaryModalData.carousel.summary.estimasiOperator} <span className="text-sm font-normal">Orang</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Utilisasi Mesin</span>
                        <span className="text-xl font-black text-green-600">{summaryModalData.carousel.summary.utilisasiMesin}%</span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto max-h-[50vh] border border-gray-200 rounded-lg mb-6 relative">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
                        <tr>
                          <th className="p-3 font-semibold border-b">Description / Nama Kualitas</th>
                          <th className="p-3 font-semibold text-center border-b">SH (Qty)</th>
                          <th className="p-3 font-semibold text-center border-b">Kebutuhan SB</th>
                          <th className="p-3 font-semibold text-center border-b">Varians</th>
                          <th className="p-3 font-semibold text-center border-b">C1</th>
                          <th className="p-3 font-semibold text-center border-b">Calc C2</th>
                          <th className="p-3 font-semibold text-center border-b">Calc PTU</th>
                          <th className="p-3 font-semibold text-center border-b">Calc PMA</th>
                          <th className="p-3 font-semibold text-center border-b">Calc C3</th>
                          <th className="p-3 font-semibold text-center border-b">Total CT (Menit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryModalData.carousel.data && summaryModalData.carousel.data.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-navy-dark">{row.description}</td>
                            <td className="p-3 text-center text-gray-700">{row.qty}</td>
                            <td className="p-3 text-center text-purple-600 font-bold">{row.kebutuhanSB}</td>
                            <td className="p-3 text-center text-blue-600 font-bold">{row.varians}</td>
                            <td className="p-3 text-center text-gray-600">{row.c1}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcC2}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcPtu}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcPma}</td>
                            <td className="p-3 text-center text-orange-600 font-semibold">{row.calcC3}</td>
                            <td className="p-3 text-center font-bold text-blue-600">{row.subtotalWaktu}</td>
                          </tr>
                        ))}
                        {(!summaryModalData.carousel.data || summaryModalData.carousel.data.length === 0) && (
                          <tr>
                            <td colSpan="10" className="p-4 text-center text-gray-500 italic">Tidak ada data untuk Mesin Carousel</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-blue-50/50">
                        <tr>
                          <td colSpan="9" className="p-3 text-right font-bold text-navy-dark">TOTAL KESELURUHAN CT:</td>
                          <td className="p-3 text-center font-black text-blue-700">
                            {summaryModalData.carousel.summary?.totalWaktu || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>


                </div>
              )}

              {/* Tab Content: Packing */}
              {activeModalTab === 'Packing' && summaryModalData.packing && (
                <div className="mb-6 animate-fade-in">
                  {/* Summary Card Packing */}
                  {summaryModalData.packing.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Freq Packing</span>
                        <span className="text-xl font-black text-purple-600">
                          {(summaryModalData.packing.data?.reduce((sum, r) => sum + (Number(r.frekuensi) || 0), 0) || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Total Waktu</span>
                        <span className="text-xl font-black text-navy-dark">{summaryModalData.packing.summary.totalWaktu} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Kapasitas 1 Shift</span>
                        <span className="text-xl font-black text-gray-700">{summaryModalData.packing.summary.kapasitas1Shift} <span className="text-sm font-normal">Mnt</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Manpower Packing</span>
                        <span className="text-xl font-black text-purple-600">{summaryModalData.packing.summary.estimasiOperator} <span className="text-sm font-normal">Orang</span></span>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                        <span className="text-xs text-gray-500 font-semibold mb-1">Utilisasi Area</span>
                        <span className="text-xl font-black text-green-600">{summaryModalData.packing.summary.utilisasiMesin}%</span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto max-h-[50vh] border border-gray-200 rounded-lg mb-6 relative">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
                        <tr>
                          <th className="p-3 font-semibold border-b">Description / Nama Kualitas</th>
                          <th className="p-3 font-semibold text-center border-b">SH (Qty)</th>
                          <th className="p-3 font-semibold text-center border-b">Freq Packing</th>
                          <th className="p-3 font-semibold text-center border-b">Varians</th>
                          <th className="p-3 font-semibold text-center border-b">CT Packing</th>
                          <th className="p-3 font-semibold text-center border-b text-blue-600">Total Waktu (Menit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryModalData.packing.data && summaryModalData.packing.data.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-navy-dark">{row.description}</td>
                            <td className="p-3 text-center text-gray-700">{row.qty}</td>
                            <td className="p-3 text-center text-purple-600 font-bold">{row.frekuensi}</td>
                            <td className="p-3 text-center text-gray-700 font-semibold">{row.varians}</td>
                            <td className="p-3 text-center text-gray-600">{row.ctPacking}</td>
                            <td className="p-3 text-center font-bold text-blue-600">{row.subtotalWaktu}</td>
                          </tr>
                        ))}
                        {(!summaryModalData.packing.data || summaryModalData.packing.data.length === 0) && (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-gray-500 italic">Tidak ada data untuk Packing</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-blue-50/50">
                        <tr>
                          <td colSpan="5" className="p-3 text-right font-bold text-navy-dark">TOTAL WAKTU PACKING:</td>
                          <td className="p-3 text-center font-black text-blue-700">
                            {summaryModalData.packing.summary?.totalWaktu || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>


                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsSummaryModalOpen(false);
                  handleLock();
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle size={16} /> Kunci & Simpan SPK
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default InsertSPK;