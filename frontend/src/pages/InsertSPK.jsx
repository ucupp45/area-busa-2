import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Lock, Clock, Calendar, Loader, Download, Activity, Layers, Trash2, Edit2, Check, X, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';

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
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [spkSummary, setSpkSummary] = useState(() => loadSession('spk_summary', null));
  const [parsedData, setParsedData] = useState(() => loadSession('spk_parsedData', []));
  const [editingHistoryId, setEditingHistoryId] = useState(() => loadSession('spk_editingHistoryId', null));

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

  // State untuk Modal Validasi Duplikasi WO
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const [manualWoWarning, setManualWoWarning] = useState(null);
  const [checkingWo, setCheckingWo] = useState(false);

  // Fungsi pengecekan WO manual terhadap editor saat ini dan database
  const checkManualWo = async (wo) => {
    if (!wo || !wo.trim() || wo.trim() === '-') {
      setManualWoWarning(null);
      return;
    }
    const cleanWo = wo.trim();
    // 1. Cek di editor preview saat ini
    const existsInPreview = parsedData.some(row => {
      if (!row.noWo) return false;
      return String(row.noWo).split(',').map(s => s.trim()).includes(cleanWo);
    });
    if (existsInPreview) {
      setManualWoWarning({
        noWo: cleanWo,
        fileName: 'Editor Preview Saat Ini',
        tanggalUpload: new Date().toISOString()
      });
      return;
    }

    // 2. Cek di database
    try {
      setCheckingWo(true);
      const url = `http://localhost:5000/api/spk/check-wo?noWo=${encodeURIComponent(cleanWo)}${editingHistoryId ? `&excludeHistoryId=${editingHistoryId}` : ''}`;
      const res = await axios.get(url);
      if (res.data && res.data.isDuplicate) {
        setManualWoWarning(res.data.existing);
      } else {
        setManualWoWarning(null);
      }
    } catch (err) {
      console.error('Failed to check WO:', err);
    } finally {
      setCheckingWo(false);
    }
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
    sessionStorage.setItem('spk_editingHistoryId', JSON.stringify(editingHistoryId));
  }, [parsedData, fileUploaded, spkSummary, combinedSpkName, activeShift, dataSnapshots, editingHistoryId]);

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

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validasi hanya file Excel (.xlsx atau .xls)
    const fileName = (file.name || '').toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.type === 'application/vnd.ms-excel';

    if (!isExcel) {
      setErrorMsg('Format file tidak didukung! Data Demand hanya menerima file Excel (.xlsx atau .xls).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('spk_file', file);
    if (editingHistoryId) {
      formData.append('editingHistoryId', editingHistoryId);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/spk/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const isAddingMultiple = parsedData.length > 0;
      const incomingData = response.data.parsedData || [];

      // Cek duplikasi dari respon backend dan dari editor preview saat ini
      const backendDuplicates = response.data.duplicateWOs || [];
      const currentWoSet = new Set();
      if (isAddingMultiple) {
        parsedData.forEach(row => {
          if (row.noWo) {
            String(row.noWo).split(',').map(s => s.trim()).forEach(w => {
              if (w && w !== '-') currentWoSet.add(w);
            });
          }
        });
      }

      const editorDuplicates = [];
      if (isAddingMultiple) {
        incomingData.forEach(row => {
          if (row.noWo) {
            String(row.noWo).split(',').map(s => s.trim()).forEach(w => {
              if (w && w !== '-' && currentWoSet.has(w)) {
                editorDuplicates.push({
                  noWo: w,
                  item: row.item,
                  customer: row.customer,
                  qty: row.qty,
                  existing: {
                    fileName: 'Editor Preview Saat Ini',
                    tanggalUpload: new Date().toISOString()
                  }
                });
              }
            });
          }
        });
      }

      // Gabungkan semua duplikat unik
      const allDuplicatesMap = new Map();
      [...backendDuplicates, ...editorDuplicates].forEach(d => {
        if (!allDuplicatesMap.has(d.noWo)) {
          allDuplicatesMap.set(d.noWo, d);
        }
      });
      const allDuplicates = Array.from(allDuplicatesMap.values());
      const duplicateWoSet = new Set(allDuplicates.map(d => d.noWo));

      const cleanIncomingRows = incomingData.filter(row => {
        if (!row.noWo) return true;
        const wos = String(row.noWo).split(',').map(s => s.trim()).filter(Boolean);
        return !wos.some(w => duplicateWoSet.has(w));
      });

      if (allDuplicates.length > 0) {
        setDuplicateModalData({
          duplicateWOs: allDuplicates,
          fileName: response.data.fileName,
          allDuplicate: cleanIncomingRows.length === 0,
          cleanCount: cleanIncomingRows.length,
          onConfirmSkip: () => {
            applyLoadedData(cleanIncomingRows, response.data, isAddingMultiple);
            setDuplicateModalData(null);
            showModal("Sukses", `Berhasil memuat ${cleanIncomingRows.length} item baru (melewati ${allDuplicates.length} WO duplikat).`, "info");
          },
          onCancel: () => {
            setDuplicateModalData(null);
          }
        });
        return;
      }

      await applyLoadedData(incomingData, response.data, isAddingMultiple);

    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Gagal mengupload dan memproses file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyLoadedData = async (incomingRows, responseData, isAddingMultiple) => {
    let newParsedData = incomingRows;

    if (isAddingMultiple) {
      setDataSnapshots(prev => [...prev, parsedData]);
      newParsedData = [...parsedData, ...incomingRows];
    } else {
      setDataSnapshots([]);
    }

    const sortedParsedData = newParsedData.sort((a, b) => {
      if (a.match === b.match) return 0;
      return a.match ? -1 : 1;
    });

    setParsedData(sortedParsedData);

    if (!isAddingMultiple) {
      setCombinedSpkName(responseData.fileName);
      setSpkSummary({
        fileName: responseData.fileName,
        fileUnik: responseData.savedFileName,
        fileType: responseData.fileType,
        totalWaktu: responseData.totalEstimasiWaktu,
        mesin: responseData.mesinDibutuhkan,
        manpower: responseData.manpowerDibutuhkan,
        status: responseData.utilisasiStatus,
        mesinTerpilih: responseData.mesinTerpilih || [],
        totalAvailable: responseData.totalMesinAvailable || 3,
        existingWaktu: responseData.existingWaktu || 0,
        mesinAvailable: responseData.mesinAvailable || [],
        shift: responseData.shift || 1,
        summaryPerMesin: responseData.summaryPerMesin
      });
      setActiveShift(`Shift ${responseData.shift || 1}`);
    } else {
      if (!editingHistoryId && !combinedSpkName.startsWith("Gabungan_")) {
        setCombinedSpkName(`Gabungan_SPK_${Date.now()}`);
      }
      recalculateSummary(sortedParsedData);
    }

    setFileUploaded(true);
    setIsLocked(false);

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
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
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
      const reqShifts = reqMachines || 1;
      if (reqMachines > maxCapacity) reqMachines = maxCapacity;

      if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
        reqMachines = 1;
      }

      let reqManpower = reqMachines * manpowerPerMachine;

      if (machineType === 'Packing') {
        reqMachines = 1; // It's just an area
        reqManpower = 7; // Fixed 7 manpower
      }

      const effectiveCapacity = (machineType === 'Packing' ? reqShifts : reqMachines) * kapasitasPerMesin;
      const utilisasi = effectiveCapacity > 0
        ? (data.totalWaktu / effectiveCapacity) * 100
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
        kebutuhanShift: reqShifts,
        persentaseUtilisasi: Number(Math.min(utilisasi, 100).toFixed(2)),
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
        setEditingHistoryId(null);
        sessionStorage.removeItem('spk_editingHistoryId');
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
      const response = await axios.post('http://localhost:5000/api/spk/preview-raw', { 
        rawRows: newRows,
        editingHistoryId: editingHistoryId || null
      });
      
      if (response.data && response.data.parsedData) {
        const groupedNewRows = response.data.parsedData;
        const backendDuplicates = response.data.duplicateWOs || [];
        
        // Cek juga terhadap editor preview saat ini
        const currentWoSet = new Set();
        parsedData.forEach(row => {
          if (row.noWo) {
            String(row.noWo).split(',').map(s => s.trim()).forEach(w => {
              if (w && w !== '-') currentWoSet.add(w);
            });
          }
        });

        const editorDuplicates = [];
        groupedNewRows.forEach(row => {
          if (row.noWo) {
            String(row.noWo).split(',').map(s => s.trim()).forEach(w => {
              if (w && w !== '-' && currentWoSet.has(w)) {
                editorDuplicates.push({
                  noWo: w,
                  item: row.item,
                  customer: row.customer,
                  qty: row.qty,
                  existing: {
                    fileName: 'Editor Preview Saat Ini',
                    tanggalUpload: new Date().toISOString()
                  }
                });
              }
            });
          }
        });

        const allDuplicatesMap = new Map();
        [...backendDuplicates, ...editorDuplicates].forEach(d => {
          if (!allDuplicatesMap.has(d.noWo)) {
            allDuplicatesMap.set(d.noWo, d);
          }
        });
        const allDuplicates = Array.from(allDuplicatesMap.values());
        const duplicateWoSet = new Set(allDuplicates.map(d => d.noWo));

        const cleanIncomingRows = groupedNewRows.filter(row => {
          if (!row.noWo) return true;
          const wos = String(row.noWo).split(',').map(s => s.trim()).filter(Boolean);
          return !wos.some(w => duplicateWoSet.has(w));
        });

        if (allDuplicates.length > 0) {
          setIsPasteModalOpen(false);
          setPasteText('');
          setDuplicateModalData({
            duplicateWOs: allDuplicates,
            fileName: 'Data Paste Excel',
            allDuplicate: cleanIncomingRows.length === 0,
            cleanCount: cleanIncomingRows.length,
            onConfirmSkip: () => {
              const updatedData = [...parsedData, ...cleanIncomingRows];
              const sortedData = updatedData.sort((a, b) => {
                if (a.match === b.match) return 0;
                return a.match ? -1 : 1;
              });
              setParsedData(sortedData);
              recalculateSummary(sortedData);
              setDuplicateModalData(null);
              showModal("Sukses", `Berhasil memuat ${cleanIncomingRows.length} item baru (melewati ${allDuplicates.length} WO duplikat).`, "info");
            },
            onCancel: () => {
              setDuplicateModalData(null);
            }
          });
          return;
        }

        const updatedData = [...parsedData, ...groupedNewRows];
        const sortedData = updatedData.sort((a, b) => {
          if (a.match === b.match) return 0;
          return a.match ? -1 : 1;
        });
        setParsedData(sortedData);
        recalculateSummary(sortedData);
        setIsPasteModalOpen(false);
        setPasteText('');
        showModal("Sukses", "Data berhasil di-paste dan dikalkulasi!", "info");
      }
    } catch (err) {
      console.error("Gagal paste:", err);
      showModal("Error", "Gagal memproses data paste.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveNewRow = async () => {
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

    const cleanWo = (newRowData.noWo || '').trim();
    if (cleanWo && cleanWo !== '-') {
      // 1. Cek duplikasi di editor preview saat ini
      const existsInPreview = parsedData.some(row => {
        if (!row.noWo) return false;
        return String(row.noWo).split(',').map(s => s.trim()).includes(cleanWo);
      });
      if (existsInPreview) {
        showModal(
          "Duplikasi Nomor WO",
          `Nomor WO "${cleanWo}" sudah ada di editor preview saat ini. Mohon gunakan nomor WO yang berbeda.`,
          "warning"
        );
        return;
      }

      // 2. Cek duplikasi di database
      try {
        const url = `http://localhost:5000/api/spk/check-wo?noWo=${encodeURIComponent(cleanWo)}${editingHistoryId ? `&excludeHistoryId=${editingHistoryId}` : ''}`;
        const checkRes = await axios.get(url);
        if (checkRes.data && checkRes.data.isDuplicate) {
          const ex = checkRes.data.existing;
          showModal(
            "Duplikasi Nomor WO",
            `Nomor WO "${cleanWo}" sudah pernah diunggah sebelumnya pada file "${ex.fileName}" (${new Date(ex.tanggalUpload).toLocaleDateString('id-ID')}). Mohon gunakan nomor WO yang berbeda untuk mencegah overproduksi.`,
            "warning"
          );
          setManualWoWarning(ex);
          return;
        }
      } catch (e) {
        console.error("Gagal verifikasi WO:", e);
      }
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
    setManualWoWarning(null);
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

    // Cek apakah ada baris yang bertanda duplikat
    const duplicateRows = parsedData.filter(row => row.isDuplicate);
    if (duplicateRows.length > 0) {
      showModal(
        "Peringatan Duplikasi WO",
        `Terdapat ${duplicateRows.length} baris yang memiliki nomor WO yang sudah pernah diunggah sebelumnya. Silakan hapus baris bertanda duplikat terlebih dahulu sebelum mengunci SPK.`,
        "warning"
      );
      return;
    }

    if (editingHistoryId) {
      showModal(
        "PERHATIAN! SIMPAN PERUBAHAN DEMAND",
        `Apakah Anda yakin ingin MENYIMPAN PERUBAHAN data demand pada "${combinedSpkName}"?\n\nData susulan / dadakan yang ditambahkan akan memperbarui isi SPK ini di database.\n\nKlik Oke jika data sudah sesuai.`,
        'confirm',
        executeLock
      );
    } else {
      showModal(
        "PERHATIAN!",
        "Apakah Anda yakin ingin MENGUNCI dan MEMPROSES SPK ini?\n\nMohon crosscheck kembali data kuantitas bahan baku, cycle time, dan ukuran P L T untuk menghindari human error.\n\nKlik Oke jika data sudah benar.",
        'confirm',
        executeLock
      );
    }
  };

  const executeLock = async () => {
    try {
      const finalFileName = combinedSpkName || spkSummary?.fileName || 'SPK_Demand.xlsx';
      // Gunakan file unik asli dari file pertama agar link download tetap berfungsi dan tidak error 404
      const finalFileUnik = spkSummary?.fileUnik || '';

      if (editingHistoryId) {
        await axios.put(`http://localhost:5000/api/spk/history/${editingHistoryId}`, {
          nama_file: finalFileName,
          fileName: finalFileName,
          user: 'PPC',
          parsedData: parsedData,
          mesinTerpilih: spkSummary?.summaryPerMesin,
          shift: spkSummary?.shift || activeShift
        });

        setIsLocked(true);
        showModal("Sukses", `Data Demand untuk "${finalFileName}" berhasil diperbarui dengan data susulan/perubahan!`, 'success');
      } else {
        await axios.post('http://localhost:5000/api/spk/save', {
          fileName: finalFileName,
          fileUnik: finalFileUnik,
          fileType: combinedSpkName.startsWith("Gabungan") ? "Multiple" : (spkSummary?.fileType || 'Excel'),
          user: 'PPC',
          parsedData: parsedData,
          mesinTerpilih: spkSummary?.summaryPerMesin,
          shift: spkSummary?.shift || activeShift
        });

        setIsLocked(true);
        showModal("Sukses", "SPK Berhasil Dikunci dan Disimpan ke Database MySQL!", 'success');
      }

      setEditingHistoryId(null);
      sessionStorage.removeItem('spk_editingHistoryId');

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
      console.error("Gagal mengunci / menyimpan SPK:", error);
      showModal("Gagal Mengunci SPK", error.response?.data?.message || "Terjadi kesalahan saat menyimpan data ke database.", 'error');
    }
  };

  // --- FUNGSI LOAD & EDIT DATA DEMAND (DARI HISTORY KE PREVIEW EDITOR) ---
  const loadDemandDetail = async (row) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/spk/history/${row.id}`);
      const { history, parsedData: loadedParsedData } = response.data;

      // Auto-refresh loaded data dengan matriks ketinggian terbaru jika tersedia
      let finalParsedData = loadedParsedData || [];
      try {
        const tinggiRaw = localStorage.getItem('tinggi_short_block_data');
        const tinggiData = tinggiRaw ? JSON.parse(tinggiRaw) : [];
        if (tinggiData.length > 0 && finalParsedData.length > 0) {
          const refreshRes = await axios.post('http://localhost:5000/api/spk/refresh-preview', {
            parsedData: finalParsedData,
            tinggiData
          });
          if (refreshRes.data && refreshRes.data.updatedParsedData) {
            finalParsedData = refreshRes.data.updatedParsedData;
          }
        }
      } catch (refErr) {
        console.warn("Refresh preview on edit loaded fallback:", refErr);
      }

      const sortedData = finalParsedData.sort((a, b) => {
        if (a.match === b.match) return 0;
        return a.match ? -1 : 1;
      });

      const spkShift = history?.shift ? `Shift ${history.shift}` : (row.shift ? `Shift ${row.shift}` : 'Shift 1');
      let parsedSummaryPerMesin = null;
      if (history?.mesin_digunakan) {
        try {
          parsedSummaryPerMesin = typeof history.mesin_digunakan === 'string'
            ? JSON.parse(history.mesin_digunakan)
            : history.mesin_digunakan;
        } catch (e) {}
      }

      setEditingHistoryId(row.id);
      setCombinedSpkName(history?.nama_file || row.nama_file);
      setActiveShift(spkShift);
      setParsedData(sortedData);
      setFileUploaded(true);
      setIsLocked(false);
      setDataSnapshots([]);

      setSpkSummary({
        fileName: history?.nama_file || row.nama_file,
        fileUnik: history?.file_unik || row.file_unik,
        fileType: history?.file_type || 'Excel',
        shift: spkShift,
        summaryPerMesin: parsedSummaryPerMesin,
        existingWaktu: 0
      });

      recalculateSummary(sortedData);

      window.scrollTo({ top: 0, behavior: 'smooth' });
      showModal(
        "Mode Edit Data Demand Aktif",
        `Data SPK "${row.nama_file}" (${sortedData.length} item) telah dimuat ke editor preview.\n\nAnda dapat menambahkan data susulan / dadakan lewat tombol "+ Tambah Manual", "Copas dari Excel", atau "Tambah SPK Lain", serta mengedit / menghapus item yang ada.\n\nSetelah selesai, klik tombol "Proses & Simpan Perubahan".`,
        "info"
      );
    } catch (err) {
      console.error("Gagal memuat detail SPK untuk edit:", err);
      showModal("Error", "Gagal memuat data SPK untuk diedit.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditDemand = (row) => {
    if (fileUploaded && parsedData.length > 0 && editingHistoryId !== row.id) {
      showModal(
        "Konfirmasi Ganti SPK",
        `Saat ini ada data demand "${combinedSpkName || 'SPK Aktif'}" di editor preview.\n\nApakah Anda ingin beralih dan mengedit data demand "${row.nama_file}"? (Perubahan yang belum disimpan pada SPK aktif akan dibatalkan)`,
        "confirm",
        () => loadDemandDetail(row)
      );
    } else {
      loadDemandDetail(row);
    }
  };

  const handleCancelEditDemand = () => {
    showModal(
      "Batalkan Edit Data Demand",
      "Yakin ingin keluar dari mode edit data demand? Perubahan yang belum disimpan akan hilang.",
      "warning",
      () => {
        setEditingHistoryId(null);
        sessionStorage.removeItem('spk_editingHistoryId');
        setFileUploaded(false);
        setIsLocked(false);
        setSpkSummary(null);
        setParsedData([]);
        setDataSnapshots([]);
        setCombinedSpkName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    );
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

  // --- FUNGSI UPDATE HISTORY (GANTI NAMA FILE SAJA) ---
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

                {key === 'Packing' ? (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-500">Estimasi Shift:</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-xs">
                      {m.kebutuhanShift || 1} Shift
                    </span>
                  </div>
                ) : (
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

                {key === 'Packing' ? (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 font-semibold mb-2">Utilisasi Area Packing:</div>
                    {(() => {
                      const util = m.persentaseUtilisasi || 0;
                      const isGood = util >= 80 && util <= 100;
                      const isWarn = util >= 50 && util < 80;
                      const bgColor = isGood ? 'bg-green-500' : isWarn ? 'bg-yellow-500' : 'bg-gray-400';
                      const badgeBg = isGood ? 'bg-green-100 text-green-700' : isWarn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
                      const shifts = m.kebutuhanShift || 1;
                      return (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 font-medium">1 Area ({shifts} Shift)</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeBg}`}>
                              {util.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${bgColor}`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
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

      {/* HIDDEN FILE INPUT (Hanya menerima Excel .xlsx, .xls) */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
      />

      {/* AREA UPLOAD & SUMMARY KALKULASI */}
      {!fileUploaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opsi 1: Upload Data Demand */}
          <div
            className={`bg-white p-8 rounded-xl border-2 border-dashed shadow-sm flex flex-col items-center justify-center text-center h-64 transition-all cursor-pointer relative ${
              isDragging
                ? 'border-accent-blue bg-blue-100/50 scale-[1.01]'
                : 'border-accent-blue bg-blue-50/20 hover:bg-blue-50/40'
            }`}
            onClick={handleAreaClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {loading ? (
              <div className="flex flex-col items-center text-accent-blue">
                <Loader size={36} className="animate-spin mb-4" />
                <h3 className="text-lg font-bold text-navy-dark">Memproses Data Demand...</h3>
                <p className="text-sm text-gray-500">Sistem sedang mencocokkan data ke database cycle time</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-lg font-bold text-navy-dark mb-1">Upload Data Demand</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Pilih atau Drag & Drop file <span className="font-bold text-blue-600">Excel (.xlsx, .xls)</span>
                </p>
                <button className="bg-accent-blue text-navy-dark px-6 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-300 transition-colors">
                  Pilih File Data Demand
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
          {editingHistoryId && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Edit2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-900 text-xs tracking-wider uppercase bg-amber-200/80 px-2 py-0.5 rounded">
                      Mode Edit Data Demand
                    </span>
                    <span className="text-xs text-amber-800 font-bold">
                      ID #{editingHistoryId}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-1">
                    Sedang mengedit <strong>{combinedSpkName}</strong>. Anda dapat menambahkan data susulan / dadakan lewat tombol <strong>+ Tambah Manual</strong>, <strong>Copas dari Excel</strong>, atau <strong>Tambah SPK Lain</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={handleCancelEditDemand}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 hover:text-red-600 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <X size={14} /> Batalkan Edit
                </button>
              </div>
            </div>
          )}

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
          <div className="p-3.5 sm:p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/70">
            {/* Sisi Kiri: Shift Selector & Search Input */}
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">SPK untuk:</span>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-navy-dark text-white shadow-xs">
                    <Clock size={13} />
                    {spkSummary?.shift || 'Shift 1'}
                  </span>
                ) : (
                  <div className="relative inline-flex items-center bg-navy-dark rounded-lg text-white overflow-hidden shadow-xs hover:bg-slate-800 transition-colors">
                    <div className="pl-2.5 pointer-events-none flex items-center justify-center text-blue-300">
                      <Clock size={13} />
                    </div>
                    <select
                      className="pl-2 pr-6 py-1.5 text-xs font-bold bg-transparent text-white outline-none cursor-pointer appearance-none"
                      value={spkSummary?.shift || 'Shift 1'}
                      onChange={(e) => setSpkSummary({ ...spkSummary, shift: e.target.value })}
                    >
                      <option value="Shift 1" className="bg-slate-900 text-white">Shift 1</option>
                      <option value="Shift 2" className="bg-slate-900 text-white">Shift 2</option>
                      <option value="Shift 3" className="bg-slate-900 text-white">Shift 3</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 flex items-center">
                      <svg className="w-3 h-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                )}
                <span className="text-[11px] text-gray-400 italic hidden sm:inline">(1 SPK = 1 Shift)</span>
              </div>

              {/* Kolom Search yang Jelas & Proporsional */}
              <div className="relative w-56 sm:w-64 md:w-72 min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Cari No WO / Description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 transition-all shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hapus pencarian"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Action Buttons */}
            {isLocked ? (
              <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg font-bold text-xs border border-gray-200">
                <Lock size={15} /> Locked by PPC
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* 1. Undo */}
                <button
                  onClick={() => {
                    if (dataSnapshots.length > 0) {
                      const prevData = dataSnapshots[dataSnapshots.length - 1];
                      setParsedData(prevData);
                      setDataSnapshots(prev => prev.slice(0, -1));
                      recalculateSummary(prevData);
                    } else {
                      setFileUploaded(false);
                      setSpkSummary(null);
                      setParsedData([]);
                      setDataSnapshots([]);
                      setCombinedSpkName('');
                      setEditingHistoryId(null);
                      sessionStorage.removeItem('spk_editingHistoryId');
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all active:scale-95 shadow-xs"
                  title="Undo SPK terakhir yang dimasukkan"
                >
                  <X size={14} />
                  <span>Undo</span>
                </button>

                {/* 2. Tambah Manual */}
                <button
                  onClick={() => setIsAddingRow(true)}
                  className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-all active:scale-95 shadow-xs"
                >
                  <Plus size={14} />
                  <span>Tambah Manual</span>
                </button>

                {/* 3. Copas dari Excel */}
                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-95 shadow-xs"
                >
                  <FileText size={14} />
                  <span>Copas dari Excel</span>
                </button>

                {/* 4. Refresh */}
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
                      setTimeout(() => setIsRefreshing(false), 500);
                    }
                  }}
                  disabled={isRefreshing}
                  className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200 transition-all active:scale-95 shadow-xs ${isRefreshing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-100 hover:border-amber-300'}`}
                  title="Refresh data preview (sinkronkan dengan matriks ketinggian terbaru)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? 'animate-spin' : ''}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>

                {/* 5. Tambah SPK Lain */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95 shadow-xs"
                >
                  <UploadCloud size={14} />
                  <span>Tambah SPK Lain</span>
                </button>

                {/* 6. Proses SPK */}
                <button
                  onClick={async () => {
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
                  }}
                  className="whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                >
                  <Lock size={14} />
                  <span>{editingHistoryId ? 'Proses & Simpan Perubahan' : 'Proses SPK'}</span>
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
                    <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${row.isDuplicate ? 'bg-red-50/70 border-red-200' : !row.match ? 'bg-yellow-50/50' : ''}`}>
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
                                  {row.isDuplicate && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded w-fit" title={`Duplikat dari: ${row.duplicateInfo?.fileName || 'SPK sebelumnya'}`}>
                                      <AlertTriangle size={10} /> Sudah Diunggah
                                    </span>
                                  )}
                                </div>
                              );
                            })
                            : (
                              <div className="flex flex-col">
                                <span className="font-bold text-navy-dark">{row.noWo}</span>
                                <span className="text-[11px] text-gray-500 leading-tight mt-0.5">{row.customer}</span>
                                {row.isDuplicate && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded w-fit" title={`Duplikat dari: ${row.duplicateInfo?.fileName || 'SPK sebelumnya'}`}>
                                    <AlertTriangle size={10} /> Sudah Diunggah
                                  </span>
                                )}
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-500">No WO</label>
                    {checkingWo && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Loader size={10} className="animate-spin" /> Memeriksa...</span>}
                  </div>
                  <input 
                    type="text" 
                    className={`w-full border rounded-lg px-3 py-2 outline-none transition-colors ${manualWoWarning ? 'border-red-400 bg-red-50/30' : 'border-gray-300 focus:border-accent-blue'}`} 
                    value={newRowData.noWo} 
                    onChange={e => {
                      setNewRowData({ ...newRowData, noWo: e.target.value });
                      if (manualWoWarning) setManualWoWarning(null);
                    }}
                    onBlur={e => checkManualWo(e.target.value)}
                    placeholder="Contoh: 4143297"
                  />
                  {manualWoWarning && (
                    <div className="mt-1.5 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-fade-in">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <div className="font-bold text-red-800">Nomor WO sudah pernah diunggah!</div>
                        <div className="text-[11px] text-red-600 mt-0.5">
                          Tercatat pada file <strong>{manualWoWarning.fileName}</strong> ({manualWoWarning.tanggalUpload ? new Date(manualWoWarning.tanggalUpload).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}). 
                          Mohon gunakan nomor WO lain untuk mencegah risiko overproduksi.
                        </div>
                      </div>
                    </div>
                  )}
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

      {/* MODAL PERINGATAN DUPLIKASI NOMOR WO (LOCKING VALIDATION) */}
      {duplicateModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-red-100 animate-popup">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg">
                    {duplicateModalData.allDuplicate ? "Seluruh Nomor WO Sudah Pernah Diunggah" : "Duplikasi Nomor WO Terdeteksi"}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Validasi Duplikasi Nomor WO (Pencegahan Double Upload & Overproduksi)
                  </p>
                </div>
              </div>
              <button 
                onClick={duplicateModalData.onCancel} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-4 text-sm text-gray-700">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs leading-relaxed">
                {duplicateModalData.allDuplicate ? (
                  <span>
                    Semua nomor WO pada file <strong>{duplicateModalData.fileName}</strong> ({duplicateModalData.duplicateWOs.length} item) sudah pernah diunggah ke sistem sebelumnya. Untuk mencegah risiko nomor WO terproses ganda, seluruh data file ini tidak dapat dimuat ke sistem.
                  </span>
                ) : (
                  <span>
                    Ditemukan <strong>{duplicateModalData.duplicateWOs.length} nomor WO</strong> yang sudah pernah diunggah sebelumnya pada file lain. Anda dapat memilih <strong>Lewati WO Duplikat</strong> agar sistem hanya memuat <strong>{duplicateModalData.cleanCount} item baru</strong> yang belum pernah diproses.
                  </span>
                )}
              </div>

              {/* Table of Duplicates */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 flex justify-between items-center">
                  <span>Daftar Nomor WO yang Sudah Ada di Sistem:</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">
                    {duplicateModalData.duplicateWOs.length} Duplikat
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-[0_1px_0_#e5e7eb]">
                      <tr>
                        <th className="p-2.5 font-bold">No WO</th>
                        <th className="p-2.5 font-bold">Nama Item</th>
                        <th className="p-2.5 font-bold">Pernah Diunggah Pada</th>
                        <th className="p-2.5 font-bold text-center">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {duplicateModalData.duplicateWOs.map((dup, idx) => (
                        <tr key={idx} className="hover:bg-red-50/50 transition-colors">
                          <td className="p-2.5 font-black text-red-600 font-mono">{dup.noWo}</td>
                          <td className="p-2.5 text-gray-800 max-w-[200px] truncate" title={dup.item}>{dup.item}</td>
                          <td className="p-2.5 font-semibold text-gray-600">{dup.existing?.fileName || '-'}</td>
                          <td className="p-2.5 text-center text-gray-500 whitespace-nowrap">
                            {dup.existing?.tanggalUpload 
                              ? new Date(dup.existing.tanggalUpload).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-3">
              <button
                onClick={duplicateModalData.onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition-all active:scale-95 shadow-xs"
              >
                {duplicateModalData.allDuplicate ? "Tutup" : "Batalkan Upload"}
              </button>
              {!duplicateModalData.allDuplicate && duplicateModalData.onConfirmSkip && (
                <button
                  onClick={duplicateModalData.onConfirmSkip}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-all active:scale-95 shadow-sm flex items-center gap-2"
                >
                  <Check size={14} />
                  <span>Lewati WO Duplikat & Muat ({duplicateModalData.cleanCount} Item Baru)</span>
                </button>
              )}
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
                <tr key={row.id} className={`border-b border-gray-50 transition-colors ${editingHistoryId === row.id ? 'bg-amber-50/70 hover:bg-amber-100/50' : 'hover:bg-gray-50/50'}`}>
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
                      <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => startEdit(row.id, row.nama_file)}
                          className="text-gray-300 hover:text-blue-600 p-1 transition-colors rounded hover:bg-blue-50"
                          title="Rename nama file saja"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 flex items-center gap-2 text-gray-500">
                    <Calendar size={14} className="text-gray-400" /> {formatTanggal(row.tanggal_upload)}
                  </td>
                  <td className="p-4 font-semibold">{row.diupload_oleh}</td>
                  <td className="p-4 text-center font-bold">{row.total_item}</td>
                  <td className="p-4 text-center font-bold text-gray-600">Shift {row.shift || 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 flex items-center gap-1 w-max">
                        <Lock size={12} /> {row.status}
                      </span>
                      {editingHistoryId === row.id && (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-300 animate-pulse flex items-center gap-1">
                          <Edit2 size={11} /> Sedang Diedit
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editId === row.id ? (
                        <>
                          <button onClick={() => saveEdit(row.id)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors" title="Simpan Perubahan Nama File">
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
                          <button
                            onClick={() => handleStartEditDemand(row)}
                            className={`p-1.5 rounded transition-colors ${editingHistoryId === row.id ? 'bg-amber-500 text-white shadow-xs' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`}
                            title="Edit Data Demand (Tambah Data Susulan / Dadakan)"
                          >
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
                <h2 className="text-xl font-bold text-navy-dark">
                  {editingHistoryId ? 'Hasil Kalkulasi Perubahan Data Demand' : 'Hasil Kalkulasi SPK'}
                </h2>
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
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
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
                        <span className="text-xs text-gray-500 font-semibold mb-1">Estimasi Kebutuhan Shift</span>
                        <span className="text-xl font-black text-blue-600">
                          {summaryModalData.packing.summary.kebutuhanShift || summaryModalData.packing.summary.estimasiBukaanMesin || 1} <span className="text-sm font-normal">Shift</span>
                        </span>
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
                <CheckCircle size={16} /> {editingHistoryId ? 'Simpan Perubahan Data Demand' : 'Kunci & Simpan SPK'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default InsertSPK;