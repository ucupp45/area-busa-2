import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardCheck, List, PlusCircle, Save, Loader, Eye, X, ArrowUpDown, ArrowUp, ArrowDown, Download, Trash2, Plus, Edit, Camera, ScanLine, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSettings } from '../context/SettingsContext';
import DocumentScannerModal from '../components/DocumentScannerModal';

const downtimeOptions = [
  { value: "A", label: "A: Tidak ada input material" },
  { value: "B", label: "B: Menunggu busa diangkat" },
  { value: "C", label: "C: Ganti Pisau" },
  { value: "D", label: "D: Ganti Gerinda" },
  { value: "E", label: "E: Setting Mesin" },
  { value: "F", label: "F: Kerusakan Mesin Mekanikal" },
  { value: "G", label: "G: Kerusakan Mesin Kelistrikan" },
  { value: "H", label: "H: Perawatan rutin" },
  { value: "I", label: "I: Mati Listrik dr Pabrik" },
  { value: "J", label: "J: Mati Listrik dr PLN" },
  { value: "K", label: "K: Meeting" },
  { value: "L", label: "L: Ganti Shift" },
  { value: "M", label: "M: Training" },
  { value: "N", label: "N: No Operator" },
  { value: "O", label: "O: DLL" }
];

const operatorOptions = [
  "Bambang Komala", "Iyan", "Andrian Surya Lesmana", "Dedi Wahyudin",
  "Muhammad Ridwan", "Andi Rian", "Yanto Irianto", "Henry Gunawan",
  "Saprijal Rinaldi", "Wahyu Anggara", "Sopandi", "Asep Mulyana B",
  "Tahyudin", "Edward Syarif Maulana"
].sort();

const emptyCarouselItem = {
  no_mesin: 'H1',
  tipe_mesin: 'Horizontal',
  no_disk: '',
  tanggal_wo: '',
  no_wo: '',
  keterangan: '',
  hasil2_p: '', hasil2_l: '', hasil2_t: '', hasil2_qty: '',
  status: 'OK', alasan_reject: '',
  waste_kulit_p: '', waste_kulit_l: '', waste_kulit_t: '', waste_kulit_qty: '',
  sispot_p: '', sispot_l: '', sispot_t: '', sispot_qty: '', sispot_keterangan: '',
  waste_potong_p: '', waste_potong_l: '', waste_potong_t: '', waste_potong_qty: '',
  waste_produksi_p: '', waste_produksi_l: '', waste_produksi_t: '', waste_produksi_qty: '', waste_produksi_keterangan: '',
  dt_kode: '', dt_jam_awal: '', dt_jam_akhir: '', dt_keterangan: ''
};

const getInitialFormState = () => ({
  // Identitas
  kualitas: '', barcode_status: 'Normal', no_barcode: '', no_barcode_extra: '', tanggal: '', no_spk: '', nama_operator: '', shift: 'Shift 1', grup: 'Grup A',
  asal_p: '', asal_l: '', asal_t: '', asal_qty: '', keterangan_kondisi: '',
  // Vertical
  no_mesin: 'V1',
  hasil_p: '', hasil_l: '', hasil_t: '', hasil_qty: '',
  waste_samping_p: '', waste_samping_l: '', waste_samping_t: '', waste_samping_qty: '',
  waste_dpn_blk_p: '', waste_dpn_blk_l: '', waste_dpn_blk_t: '', waste_dpn_blk_qty: '',
  waste_produksi_p: '', waste_produksi_l: '', waste_produksi_t: '', waste_produksi_qty: '',
  sisa_p: '', sisa_l: '', sisa_t: '', sisa_qty: '', sisa_keterangan: '',
  dt_kode: '', dt_jam_awal: '', dt_jam_akhir: '', dt_keterangan: '',
  sisa_potong_id_used: null,

  // Carousel Multiple ItemsArray
  carousel_items: [{ ...emptyCarouselItem }]
});

const Realisasi = () => {
  const { prefs } = useSettings();
  const [activeTab, setActiveTab] = useState('input');
  const [formData, setFormData] = useState(getInitialFormState());
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [alertModal, setAlertModal] = useState({ show: false, message: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (confirmModal.show && e.key === 'Enter') {
        e.preventDefault();
        if (confirmModal.onConfirm) confirmModal.onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal]);

  const [realisasiData, setRealisasiData] = useState([]);
  const [activeWOs, setActiveWOs] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState(null);

  // --- SISA POTONG LOGIC ---
  const [availableSispots, setAvailableSispots] = useState([]);
  const [showSispotModal, setShowSispotModal] = useState(false);

  useEffect(() => {
    const fetchSispots = async () => {
      if (formData.no_barcode && formData.no_barcode.length >= 8 && !editId && !formData.sisa_potong_id_used) {
        try {
          const res = await axios.get(`http://localhost:5000/api/realisasi/sisa-potong/${formData.no_barcode}`);
          if (res.data.success && res.data.data.length > 0) {
            const sispots = res.data.data;
            if (sispots.length === 1) {
              const sp = sispots[0];
              setFormData(prev => ({
                ...prev,
                asal_p: sp.p,
                asal_l: sp.l,
                asal_t: sp.t,
                asal_qty: sp.qty,
                kualitas: sp.kualitas || prev.kualitas,
                sisa_potong_id_used: sp.id
              }));
              setShowSispotModal(false);
            } else {
              setAvailableSispots(sispots);
              setShowSispotModal(true);
            }
          }
        } catch (error) {
          console.error("Gagal mengambil Sisa Potong:", error);
        }
      }
    };
    
    const timeoutId = setTimeout(fetchSispots, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.no_barcode, editId, formData.sisa_potong_id_used]);

  const calculateAging = (dateString) => {
    const createdDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hari ini";
    return `Sudah ${diffDays} hari mengendap`;
  };

  const handleSelectSispot = (sispot) => {
    setFormData(prev => ({
      ...prev,
      asal_p: sispot ? sispot.p : '',
      asal_l: sispot ? sispot.l : '',
      asal_t: sispot ? sispot.t : '',
      asal_qty: sispot ? sispot.qty : '',
      kualitas: sispot ? sispot.kualitas : prev.kualitas,
      sisa_potong_id_used: sispot ? sispot.id : null
    }));
    setShowSispotModal(false);
  };
  // -------------------------

  const calculateDurationMinutes = (start, end) => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // Handle over-midnight case
    return diff + ' mnt';
  };

  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'SUBMITTED', 'DRAFT'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showScanner, setShowScanner] = useState(false);
  const [focusedWoIndex, setFocusedWoIndex] = useState(null);

  useEffect(() => {
    if (activeTab === 'table') {
      fetchData();
    } else {
      fetchActiveWOs();
    }
  }, [activeTab]);

  const [wosByDate, setWosByDate] = useState({});

  const fetchActiveWOs = async (date = '', force = false) => {
    if (date && wosByDate[date] && wosByDate[date].length > 0 && !force) return; // cache hit only if not empty
    try {
      const dateParam = date ? `?tanggal=${date}` : '';
      const res = await axios.get(`http://localhost:5000/api/spk/wo/active${dateParam}`);
      if (date) {
        setWosByDate(prev => ({ ...prev, [date]: res.data }));
      } else {
        setActiveWOs(res.data);
      }
    } catch (error) {
      console.error('Error fetching active WOs:', error);
    }
  };

  const getAvailableWOs = (currentIndex) => {
    const itemDate = formData.carousel_items[currentIndex].tanggal_wo;
    const list = itemDate && wosByDate[itemDate] ? wosByDate[itemDate] : activeWOs;

    const selectedWOs = formData.carousel_items
      .map((item, idx) => idx !== currentIndex ? item.no_wo : null)
      .filter(Boolean);
    return list.filter(wo => !selectedWOs.includes(wo.no_wo));
  };

  const handleTanggalWoChange = (index, value) => {
    handleCarouselChange(index, { target: { name: 'tanggal_wo', value } });
    if (value) {
      fetchActiveWOs(value, true); // preload fresh data
    }
  };

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const res = await axios.get('http://localhost:5000/api/realisasi');
      setRealisasiData(res.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Gagal mengambil data realisasi', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getProcessedData = () => {
    return [...realisasiData].filter(row => {
      const currentStatus = row.identitas_status || 'SUBMITTED';
      if (filterStatus === 'DRAFT' && currentStatus !== 'DRAFT') return false;
      if (filterStatus === 'SUBMITTED' && currentStatus === 'DRAFT') return false;
      
      const getTodayDateString = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };
      
      const activeDateFilter = filterDate || getTodayDateString();
      const rowDate = new Date(row.tanggal).setHours(0, 0, 0, 0);
      const targetDate = new Date(activeDateFilter).setHours(0, 0, 0, 0);

      // Jika data adalah draft, selalu tampilkan terlepas dari filter tanggal (khusus di tab Draft atau Semua)
      if (currentStatus === 'DRAFT') {
        return true;
      }

      return rowDate === targetDate;
    }).sort((a, b) => {
      if (!sortConfig.key) return 0;
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      if (sortConfig.key === 'tanggal') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const processedData = getProcessedData();

  const handleExportExcel = () => {
    if (processedData.length === 0) {
      showNotification('Tidak ada data untuk diexport', 'error');
      return;
    }

    let exportData = [];
    processedData.forEach(row => {
      if (row.carousel_items && row.carousel_items.length > 0) {
        row.carousel_items.forEach(item => {
          exportData.push({
            'Tanggal': new Date(row.tanggal).toLocaleDateString('id-ID'),
            'Barcode': row.no_barcode,
            'SPK': row.no_spk,
            'Kualitas': row.kualitas,
            'Operator': row.nama_operator,
            'Shift': row.shift,
            'Grup': row.grup,
            'Lv1 Mesin': row.v_no_mesin,
            'Lv1 Hasil P': row.v_hasil_p,
            'Lv1 Hasil L': row.v_hasil_l,
            'Lv1 Hasil T': row.v_hasil_t,
            'Lv1 Hasil Qty': row.v_hasil_qty,
            'Mesin (Lv2)': item.tipe_mesin,
            'No Mesin (Lv2)': item.no_mesin,
            'No Disk (Lv2)': item.no_disk,
            'No WO (Lv2)': item.no_wo,
            'Status WO': item.status,
            'Alasan Reject': item.alasan_reject,
            'Lv2 Hasil P': item.hasil2_p,
            'Lv2 Hasil L': item.hasil2_l,
            'Lv2 Hasil T': item.hasil2_t,
            'Lv2 Hasil Qty': item.hasil2_qty,
            'Lv2 Waste Kulit T': item.waste_kulit_t,
            'Lv2 Waste Kulit Qty': item.waste_kulit_qty,
            'Lv2 Sispot P': item.sispot_p,
            'Lv2 Sispot L': item.sispot_l,
            'Lv2 Sispot T': item.sispot_t,
            'Lv2 Sispot Qty': item.sispot_qty,
            'Lv2 Sispot Ket': item.sispot_keterangan,
            'Lv2 Waste Potong T': item.waste_potong_t,
            'Lv2 Waste Potong Qty': item.waste_potong_qty,
            'Lv2 Waste Produksi T': item.waste_produksi_t,
            'Lv2 Waste Produksi Qty': item.waste_produksi_qty,
            'Lv2 DT Kode': item.dt_kode,
            'Lv2 DT Jam Awal': item.dt_jam_awal,
            'Lv2 DT Jam Akhir': item.dt_jam_akhir,
            'Lv2 DT Keterangan': item.dt_keterangan
          });
        });
      } else {
        exportData.push({
          'Tanggal': new Date(row.tanggal).toLocaleDateString('id-ID'),
          'Barcode': row.no_barcode,
          'SPK': row.no_spk,
          'Kualitas': row.kualitas,
          'Operator': row.nama_operator,
          'Shift': row.shift,
          'Grup': row.grup
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Realisasi Produksi");
    XLSX.writeFile(workbook, "Data_Realisasi_Produksi.xlsx");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // If barcode changes, reset sispot autofill
      if (name === 'no_barcode' && prev.sisa_potong_id_used) {
        updated.sisa_potong_id_used = null;
        updated.asal_p = '';
        updated.asal_l = '';
        updated.asal_t = '';
        updated.asal_qty = '';
        updated.kualitas = '';
      }

      // Auto-fill logic for Horizontal (Carousel)
      if (name === 'hasil_p') {
        updated.carousel_items = updated.carousel_items.map(item => ({
          ...item,
          hasil2_p: value,
          waste_kulit_p: value,
          waste_potong_p: value,
          waste_produksi_p: value,
          sispot_p: value
        }));
      }
      if (name === 'hasil_l') {
        updated.carousel_items = updated.carousel_items.map(item => ({
          ...item,
          hasil2_l: value,
          waste_kulit_l: value,
          waste_potong_l: value,
          waste_produksi_l: value,
          sispot_l: value
        }));
      }

      // Auto-fill logic for Waste Vertical Dimensions
      if (['asal_p', 'asal_l', 'asal_t'].includes(name)) {
        if (name === 'asal_p') updated.waste_samping_p = value;
        if (name === 'asal_t') {
          updated.waste_samping_l = value;
          updated.waste_dpn_blk_l = value;
        }
        if (name === 'asal_l') updated.waste_dpn_blk_p = value;
      }

      // Auto-fill logic for Waste Thickness & Qty (Kelipatan 1.5 atau Standar Kulit)
      if (['asal_p', 'hasil_p', 'asal_l', 'hasil_l', 'hasil_qty'].includes(name)) {
        const pAsalRaw = Number(updated.asal_p || 0);
        const pCutRaw = Number(updated.hasil_p || 0);
        const lAsalRaw = Number(updated.asal_l || 0);
        const lCutRaw = Number(updated.hasil_l || 0);
        const qtyCutRaw = Number(updated.hasil_qty || 1);

        // Deteksi arah tumpukan (stacking) Qty
        let pMultiplier = 1;
        let lMultiplier = 1;

        if (qtyCutRaw > 1) {
          if (lCutRaw * qtyCutRaw <= lAsalRaw + 2 && pCutRaw * qtyCutRaw > pAsalRaw + 2) {
            lMultiplier = qtyCutRaw; // Ditumpuk ke arah Lebar
          } else if (pCutRaw * qtyCutRaw <= pAsalRaw + 2 && lCutRaw * qtyCutRaw > lAsalRaw + 2) {
            pMultiplier = qtyCutRaw; // Ditumpuk ke arah Panjang
          } else {
            lMultiplier = qtyCutRaw; // Default prioritas ke Lebar jika muat di keduanya
          }
        }

        const diffP_raw = Math.round((pAsalRaw - (pCutRaw * pMultiplier)) * 10) / 10;

        if (diffP_raw > 0) {
          updated.waste_dpn_blk_t = 1.5;
          if ((diffP_raw * 10) % 15 === 0 && diffP_raw <= 3) {
            updated.waste_dpn_blk_qty = (diffP_raw / 1.5) * lMultiplier;
          } else {
            // Jika ada sisa potong balok besar (> 3cm), asumsikan maksimal 2 kulit dibuang
            updated.waste_dpn_blk_qty = (diffP_raw >= 3 ? 2 : 1) * lMultiplier;
          }
        } else if (pAsalRaw === 0 && pCutRaw === 0) {
          updated.waste_dpn_blk_t = '';
          updated.waste_dpn_blk_qty = '';
        } else {
          updated.waste_dpn_blk_t = 0;
          updated.waste_dpn_blk_qty = 0;
        }

        const diffL_raw = Math.round((lAsalRaw - (lCutRaw * lMultiplier)) * 10) / 10;

        if (diffL_raw > 0) {
          updated.waste_samping_t = 1.5;
          if ((diffL_raw * 10) % 15 === 0 && diffL_raw <= 3) {
            updated.waste_samping_qty = (diffL_raw / 1.5) * pMultiplier;
          } else {
            // Jika ada sisa potong balok besar (> 3cm), asumsikan maksimal 2 kulit dibuang
            updated.waste_samping_qty = (diffL_raw >= 3 ? 2 : 1) * pMultiplier;
          }
        } else if (lAsalRaw === 0 && lCutRaw === 0) {
          updated.waste_samping_t = '';
          updated.waste_samping_qty = '';
        } else {
          updated.waste_samping_t = 0;
          updated.waste_samping_qty = 0;
        }
      }

      // SISPOT Rule Engine
      const triggerFields = [
        'asal_p', 'asal_l', 'asal_t',
        'hasil_p', 'hasil_l', 'hasil_t', 'hasil_qty',
        'waste_samping_t', 'waste_samping_qty',
        'waste_dpn_blk_t', 'waste_dpn_blk_qty'
      ];

      if (triggerFields.includes(name)) {
        const pAsal = Number(updated.asal_p || 0);
        const lAsal = Number(updated.asal_l || 0);
        const tAsal = Number(updated.asal_t || 0);

        const pCut = Number(updated.hasil_p || 0);
        const lCut = Number(updated.hasil_l || 0);
        const tCut = Number(updated.hasil_t || 0);
        const qtyCut = Number(updated.hasil_qty || 1);

        const tWastePanjang = Number(updated.waste_samping_t || 0);
        const qtyWastePanjang = Number(updated.waste_samping_qty || 0);

        const tWasteLebar = Number(updated.waste_dpn_blk_t || 0);
        const qtyWasteLebar = Number(updated.waste_dpn_blk_qty || 0);

        // Deteksi arah tumpukan (stacking) Qty untuk perhitungan fisik
        let pMultiplier = 1;
        let lMultiplier = 1;

        if (qtyCut > 1) {
          if (lCut * qtyCut <= lAsal + 2 && pCut * qtyCut > pAsal + 2) {
            lMultiplier = qtyCut; // Ditumpuk ke arah Lebar
          } else if (pCut * qtyCut <= pAsal + 2 && lCut * qtyCut > lAsal + 2) {
            pMultiplier = qtyCut; // Ditumpuk ke arah Panjang
          } else {
            lMultiplier = qtyCut; // Default prioritas ke Lebar jika muat di keduanya
          }
        }

        // Panjang terpakai = (Panjang potongan * jumlah di sumbu P) + (Tebal waste depan/blk * jumlah waste per baris L)
        let totalPTerpakai = (pCut * pMultiplier) + (tWasteLebar * (qtyWasteLebar / lMultiplier));
        // Lebar terpakai = (Lebar potongan * jumlah di sumbu L) + (Tebal waste samping * jumlah waste per baris P)
        let totalLTerpakai = (lCut * lMultiplier) + (tWastePanjang * (qtyWastePanjang / pMultiplier));
        const totalTTerpakai = tCut;

        // Perhitungan Selisih (Delta), dibulatkan 2 desimal untuk mencegah JS float issues
        const round2 = (num) => Math.round(num * 10) / 10;
        const selisihP = round2(pAsal - totalPTerpakai);
        const selisihL = round2(lAsal - totalLTerpakai);
        const selisihT = round2(tAsal - totalTTerpakai);

        // Aturan Logika Sisa Potong
        // Kondisi A: Tidak Ada Sisa
        if (selisihP === 0 && selisihL === 0 && selisihT === 0) {
          if (pAsal === 0 && lAsal === 0 && tAsal === 0) {
            updated.sisa_p = '';
            updated.sisa_l = '';
            updated.sisa_t = '';
            updated.sisa_qty = '';
          } else {
            updated.sisa_p = 0;
            updated.sisa_l = 0;
            updated.sisa_t = 0;
            updated.sisa_qty = 0;
          }
        }
        // Kondisi B: Sisa pada sisi Lebar
        else if (selisihL > 0 && selisihP === 0) {
          updated.sisa_p = pCut > 0 ? pCut : (pAsal > 0 ? pAsal : '');
          updated.sisa_l = Number.isInteger(selisihL) ? selisihL : selisihL.toFixed(1);
          updated.sisa_t = tAsal > 0 ? tAsal : '';
          updated.sisa_qty = 1;
        }
        // Kondisi C: Sisa pada sisi Panjang
        else if (selisihP > 0 && selisihL === 0) {
          updated.sisa_p = Number.isInteger(selisihP) ? selisihP : selisihP.toFixed(1);
          updated.sisa_l = lAsal > 0 ? lAsal : '';
          updated.sisa_t = tAsal > 0 ? tAsal : '';
          updated.sisa_qty = 1;
        }
        // Kondisi Error / Form Dikosongkan: Reset nilai
        else {
          updated.sisa_p = '';
          updated.sisa_l = '';
          updated.sisa_t = '';
          updated.sisa_qty = '';
        }
      }

      return updated;
    });
  };

  const handleCarouselChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.carousel_items];
    newItems[index] = { ...newItems[index], [name]: value };

    // Auto-fill down to waste items
    if (name === 'hasil2_p') {
      newItems[index].waste_kulit_p = value;
      newItems[index].waste_potong_p = value;
      newItems[index].waste_produksi_p = value;
      newItems[index].sispot_p = value;
    }
    if (name === 'hasil2_l') {
      newItems[index].waste_kulit_l = value;
      newItems[index].waste_potong_l = value;
      newItems[index].waste_produksi_l = value;
      newItems[index].sispot_l = value;
    }

    // Auto clear no_disk and set default no_mesin if tipe_mesin changes
    if (name === 'tipe_mesin') {
      if (value === 'Carousel') {
        newItems[index].no_mesin = 'C1';
      } else {
        newItems[index].no_mesin = 'H1';
        newItems[index].no_disk = '';
      }
    }

    // Auto-calculate logic removed to prevent incorrect Sispot autofill

    setFormData(prev => ({ ...prev, carousel_items: newItems }));
  };

  const handleWoSelect = (index, value) => {
    const newItems = [...formData.carousel_items];
    newItems[index] = { ...newItems[index], no_wo: value };

    // Auto fill: Cari di daftar WO yang sesuai dengan tanggal aktif maupun activeWOs global
    const itemDate = newItems[index].tanggal_wo;
    const woList = (itemDate && wosByDate[itemDate] && wosByDate[itemDate].length > 0)
      ? wosByDate[itemDate]
      : activeWOs;

    const woData = woList.find(w => w.no_wo === value) 
      || activeWOs.find(w => w.no_wo === value)
      || (wosByDate[itemDate] || []).find(w => w.no_wo === value);

    if (woData) {
      if (woData.ukuran_p) {
        newItems[index].hasil2_p = Number(woData.ukuran_p);
        newItems[index].waste_kulit_p = Number(woData.ukuran_p);
        newItems[index].waste_potong_p = Number(woData.ukuran_p);
        newItems[index].waste_produksi_p = Number(woData.ukuran_p);
        newItems[index].sispot_p = Number(woData.ukuran_p);
      }
      if (woData.ukuran_l) {
        newItems[index].hasil2_l = Number(woData.ukuran_l);
        newItems[index].waste_kulit_l = Number(woData.ukuran_l);
        newItems[index].waste_potong_l = Number(woData.ukuran_l);
        newItems[index].waste_produksi_l = Number(woData.ukuran_l);
        newItems[index].sispot_l = Number(woData.ukuran_l);
      }
      if (woData.ukuran_t) {
        newItems[index].hasil2_t = Number(woData.ukuran_t);
      }
      const sisaQty = Number(woData.qty_cutting) - Number(woData.qty_terpenuhi);
      newItems[index].hasil2_qty = sisaQty > 0 ? sisaQty : (Number(woData.qty_cutting) || 0);
    }

    setFormData(prev => ({ ...prev, carousel_items: newItems }));
  };

  const addWO = () => {
    setFormData(prev => {
      const newItems = [...prev.carousel_items];
      const lastIndex = newItems.length - 1;
      const lastItem = newItems[lastIndex];
      const newItem = { ...emptyCarouselItem };

      if (lastItem) {
        // Autofill P dari Sispot (karena Tambah WO hanya bisa diklik saat Hasil Utama habis)
        // Lebar (L) dikosongkan karena sispot bisa ditidurkan jika L > sisa_l
        newItem.hasil2_p = formData.sisa_p;
        newItem.waste_kulit_p = formData.sisa_p;
        newItem.waste_potong_p = formData.sisa_p;
        newItem.waste_produksi_p = formData.sisa_p;
        newItem.sispot_p = formData.sisa_p;

        // Mentor logic: Sispot hanya boleh ada di WO terakhir. Hapus Sispot di WO sebelumnya.
        newItems[lastIndex] = {
          ...lastItem,
          sispot_t: '',
          sispot_qty: '',
          sispot_keterangan: ''
        };
      }

      return {
        ...prev,
        carousel_items: [...newItems, newItem]
      };
    });
  };

  const removeWO = (index) => {
    const newItems = [...formData.carousel_items];
    newItems.splice(index, 1);
    setFormData(prev => ({ ...prev, carousel_items: newItems }));
  };

  const parseOCRText = (text) => {
    const updates = {};
    const lines = text.split('\n');
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      // Standard OCR parsing logic
      if (lowerLine.includes('kualitas') || lowerLine.includes('kwalitas')) {
        const match = line.match(/(?:kualitas|kwalitas)\s*[:=-]?\s*(.*)/i);
        if (match && match[1]) updates.kualitas = match[1].trim();
      }
      if (lowerLine.includes('barcode')) {
        const match = line.match(/barcode\s*[:=-]?\s*([a-zA-Z0-9\-]+)/i);
        if (match && match[1]) updates.no_barcode = match[1].trim();
      }
      if (lowerLine.includes('spk')) {
        const match = line.match(/spk\s*[:=-]?\s*([a-zA-Z0-9\-]+)/i);
        if (match && match[1]) updates.no_spk = match[1].trim();
      }
    });

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
    setShowScanner(false);
  };

  const handleSubmit = async (e, isDraft = false) => {
    if (e) e.preventDefault();

    const currentStatus = isDraft ? 'DRAFT' : 'SUBMITTED';
    const submissionData = { ...formData, status: currentStatus };

    const errors = [];
    const criticalErrors = []; // Errors that block even drafts

    // Validasi Wajib Isi (Bagian 1) KHUSUS saat Submit
    if (!isDraft) {
      if (!formData.kualitas) errors.push("Bagian 1: Kualitas Busa wajib diisi.");
      if (!formData.tanggal) errors.push("Bagian 1: Tanggal wajib diisi.");
      if (!formData.no_spk) errors.push("Bagian 1: No SPK wajib diisi.");
      if (!formData.nama_operator) errors.push("Bagian 1: Nama Operator wajib diisi.");
      if (!formData.shift) errors.push("Bagian 1: Shift wajib diisi.");
      if (!formData.grup) errors.push("Bagian 1: Grup wajib diisi.");
      if (!formData.asal_p || !formData.asal_l || !formData.asal_t || !formData.asal_qty) {
        errors.push("Bagian 1: Dimensi Balokan Asal (P, L, T, Qty) wajib diisi lengkap.");
      }
    }

    // Format Validation
    if (formData.no_barcode) {
      let finalBarcode = String(formData.no_barcode).trim();
      if (formData.barcode_status === 'Abnormal' && formData.no_barcode_extra) {
        finalBarcode += ` | ${String(formData.no_barcode_extra).trim()}`;
      }
      submissionData.no_barcode = finalBarcode;
      
      if (formData.barcode_status === 'Normal') {
        const trimmedBarcode = String(formData.no_barcode).trim();
        if (trimmedBarcode.length !== 10) {
          criticalErrors.push(`Panjang Barcode harus tepat 10 karakter (terdeteksi ${trimmedBarcode.length} karakter).`);
        } else if (!/^\d{6}/.test(trimmedBarcode)) {
          criticalErrors.push('Barcode tidak boleh memiliki huruf pada 6 karakter pertama (karakter 1-6 harus angka).');
        }
      }
    }

    formData.carousel_items.forEach((item, idx) => {
      if (!item.no_wo && !item.keterangan) {
        errors.push(`Item WO #${idx + 1}: Harus mengisi salah satu antara No WO atau Keterangan.`);
      }
      if (item.no_wo) {
        if (/[a-zA-Z]/.test(item.no_wo)) {
          criticalErrors.push(`Item WO #${idx + 1}: Jika huruf harus di isi ke keterangan bukan di No WO.`);
        } else if (!/^\d{7}$/.test(item.no_wo)) {
          errors.push(`Item WO #${idx + 1}: No WO harus berisi tepat 7 digit angka.`);
        }
      }
    });

    // Validation: Total Volume (Kubikasi) Produksi tidak boleh melebihi Volume Balokan Asal

    const getVol = (prefix) => {
      const p = Number(formData[`${prefix}_p`] || 0);
      const l = Number(formData[`${prefix}_l`] || 0);
      const t = Number(formData[`${prefix}_t`] || 0);
      const qty = Number(formData[`${prefix}_qty`] || 0);
      return p * l * t * qty;
    };

    const volAsal = getVol('asal');
    if (volAsal > 0) {
      const volHasil = getVol('hasil');
      const volWasteSamping = getVol('waste_samping');
      const volWasteDepan = getVol('waste_dpn_blk');
      const volSisa = getVol('sisa');

      const totalVolProduksi = volHasil + volWasteSamping + volWasteDepan + volSisa;

      // Allow a 2% margin of error (tolerance) for foam elasticity and physical measurement rounding
      const tolerance = volAsal * 0.02;
      if (totalVolProduksi > volAsal + tolerance) {
        errors.push(`Total Volume Produksi (Hasil + Waste + Sisa) = ${totalVolProduksi.toFixed(1)} melebihi Volume Balok Asal = ${volAsal.toFixed(1)} (Batas toleransi pemuaian busa 2% terlampaui).`);
      }
    }

    if (criticalErrors.length > 0) {
      setAlertModal({
        show: true,
        message: `Terdapat kesalahan format data yang harus diperbaiki sebelum disimpan (bahkan sebagai draft):\n\n- ` + criticalErrors.join('\n- ')
      });
      return;
    }

    if (!isDraft && errors.length > 0) {
      setAlertModal({
        show: true,
        message: `Terdapat ketidaksesuaian data yang harus dilengkapi sebelum disubmit (Namun masih bisa disimpan sebagai draft):\n\n- ` + errors.join('\n- ') + `\n\n(Catatan: Sistem kini menggunakan validasi Volume/Kubikasi total, bukan penjumlahan panjang linear karena metode potong bisa bervariasi.)`
      });
      return;
    }

    // Front-end Kubikasi Validation
    const buckets = getBucketsStatus();

    if (!isDraft) {
      if (buckets.isError) {
        setAlertModal({ show: true, message: buckets.errorMessage });
        return;
      }
      // Note: We intentionally allow leftovers (Utama & Sispot) to be saved for future use
    }

    // Attach source_block to each item before submission
    submissionData.carousel_items = submissionData.carousel_items.map((item, idx) => ({
      ...item,
      source_block: buckets.itemSources[idx]?.source || 'Utama'
    }));

    setIsSubmitting(true);
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/realisasi/${editId}`, submissionData);
        showNotification(isDraft ? 'Draft berhasil diperbarui!' : 'Data realisasi berhasil diperbarui!', 'success');
      } else {
        await axios.post('http://localhost:5000/api/realisasi', submissionData);
        showNotification(isDraft ? 'Draft berhasil disimpan!' : 'Data realisasi berhasil disimpan!', 'success');
      }
      setFormData(getInitialFormState());
      setEditId(null);
      setWosByDate({}); // Clear WO cache so that the fulfilled WO disappears
      fetchActiveWOs(); // Refresh WO quantities
      if (editId) setActiveTab('table'); // Go back to table after edit
    } catch (error) {
      console.error('Error submit realisasi:', error);
      showNotification(error.response?.data?.message || 'Gagal menyimpan data', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNum = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    return Number.isInteger(num) ? num : Number(num.toFixed(1));
  };

  const renderDim = (p, l, t, qty, ket = null) => {
    if (!p && !l && !t) return '-';
    const np = Number(p), nl = Number(l), nt = Number(t), nq = Number(qty);
    if (np === 0 && nl === 0 && nt === 0) return '-';
    return (
      <span className="font-bold">
        {Number(np.toFixed(2))}x{Number(nl.toFixed(2))}x{Number(nt.toFixed(2))} ({nq})
        {ket ? <><br /><span className="text-gray-400 italic text-xs">{ket}</span></> : null}
      </span>
    );
  };

  const handleEdit = (row) => {
    let barcode_status = 'Normal';
    let parsed_no_barcode = row.no_barcode || '';
    let no_barcode_extra = '';
    if (parsed_no_barcode.includes(' | ')) {
      barcode_status = 'Abnormal';
      const parts = parsed_no_barcode.split(' | ');
      parsed_no_barcode = parts[0];
      no_barcode_extra = parts[1] || '';
    }

    const formatDateLocal = (dateString) => {
      if (!dateString) return '';
      const d = new Date(dateString);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const editedForm = {
      kualitas: row.kualitas || '', barcode_status, no_barcode: parsed_no_barcode, no_barcode_extra,
      tanggal: formatDateLocal(row.tanggal),
      no_spk: row.no_spk || '', nama_operator: row.nama_operator || '',
      shift: row.shift || 'Shift 1', grup: row.grup || 'Grup A',
      asal_p: formatNum(row.asal_p), asal_l: formatNum(row.asal_l), asal_t: formatNum(row.asal_t), asal_qty: row.asal_qty || '', keterangan_kondisi: row.keterangan_kondisi || '',
      sisa_potong_id_used: row.sisa_potong_id_used || null,

      no_mesin: row.v_no_mesin || 'V1',
      hasil_p: formatNum(row.v_hasil_p), hasil_l: formatNum(row.v_hasil_l), hasil_t: formatNum(row.v_hasil_t), hasil_qty: row.v_hasil_qty || '',
      waste_samping_p: formatNum(row.waste_samping_p), waste_samping_l: formatNum(row.waste_samping_l), waste_samping_t: formatNum(row.waste_samping_t), waste_samping_qty: row.waste_samping_qty || '',
      waste_dpn_blk_p: formatNum(row.waste_dpn_blk_p), waste_dpn_blk_l: formatNum(row.waste_dpn_blk_l), waste_dpn_blk_t: formatNum(row.waste_dpn_blk_t), waste_dpn_blk_qty: row.waste_dpn_blk_qty || '',
      waste_produksi_p: formatNum(row.waste_produksi_p), waste_produksi_l: formatNum(row.waste_produksi_l), waste_produksi_t: formatNum(row.waste_produksi_t), waste_produksi_qty: row.waste_produksi_qty || '',
      sisa_p: formatNum(row.sisa_p), sisa_l: formatNum(row.sisa_l), sisa_t: formatNum(row.sisa_t), sisa_qty: row.sisa_qty || '', sisa_keterangan: row.sisa_keterangan || '',
      dt_kode: row.dt_kode || '', dt_jam_awal: row.dt_jam_awal || '', dt_jam_akhir: row.dt_jam_akhir || '', dt_keterangan: row.dt_keterangan || '',

      carousel_items: row.carousel_items && row.carousel_items.length > 0 ? row.carousel_items.map(c => ({
        no_mesin: c.no_mesin || 'H1',
        tipe_mesin: c.tipe_mesin || 'Horizontal',
        no_disk: c.no_disk || '',
        tanggal_wo: formatDateLocal(c.tanggal_wo),
        no_wo: c.no_wo || '',
        keterangan: c.keterangan || '',
        hasil2_p: formatNum(c.hasil2_p), hasil2_l: formatNum(c.hasil2_l), hasil2_t: formatNum(c.hasil2_t), hasil2_qty: c.hasil2_qty || '',
        status: c.status || 'OK', alasan_reject: c.alasan_reject || '',
        waste_kulit_p: formatNum(c.waste_kulit_p), waste_kulit_l: formatNum(c.waste_kulit_l), waste_kulit_t: formatNum(c.waste_kulit_t), waste_kulit_qty: c.waste_kulit_qty || '',
        sispot_p: formatNum(c.sispot_p), sispot_l: formatNum(c.sispot_l), sispot_t: formatNum(c.sispot_t), sispot_qty: c.sispot_qty || '', sispot_keterangan: c.sispot_keterangan || '',
        waste_potong_p: formatNum(c.waste_potong_p), waste_potong_l: formatNum(c.waste_potong_l), waste_potong_t: formatNum(c.waste_potong_t), waste_potong_qty: c.waste_potong_qty || '',
        waste_produksi_p: formatNum(c.waste_produksi_p), waste_produksi_l: formatNum(c.waste_produksi_l), waste_produksi_t: formatNum(c.waste_produksi_t), waste_produksi_qty: c.waste_produksi_qty || '', waste_produksi_keterangan: c.waste_produksi_keterangan || '',
        dt_kode: c.dt_kode || '', dt_jam_awal: c.dt_jam_awal || '', dt_jam_akhir: c.dt_jam_akhir || '', dt_keterangan: c.dt_keterangan || ''
      })) : [{ ...emptyCarouselItem }]
    };

    setFormData(editedForm);
    setEditId(row.id);
    setActiveTab('input');
  };

  const handleDelete = (id) => {
    setConfirmModal({
      show: true,
      message: 'Apakah Anda yakin ingin menghapus data realisasi ini? Aksi ini tidak dapat dibatalkan.',
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:5000/api/realisasi/${id}`);
          showNotification('Data realisasi berhasil dihapus!', 'success');
          fetchData();
          setWosByDate({}); // Clear WO cache
          fetchActiveWOs();
        } catch (error) {
          console.error('Error deleting:', error);
          showNotification('Gagal menghapus data', 'error');
        }
        setConfirmModal({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const labelClass = `block text-xs font-semibold mb-1 ${prefs.darkMode ? 'text-gray-300' : 'text-gray-600'}`;
  const inputClass = `w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-accent-blue transition-all ${prefs.darkMode
      ? 'bg-[#1e293b] border-slate-600 text-white focus:border-accent-blue'
      : 'bg-white border-gray-300 text-gray-800 focus:border-accent-blue'
    }`;

  // Kalkulasi max Qty untuk mesin Vertical berdasarkan Kubikasi
  const pAsal = Number(formData.asal_p || 0);
  const lAsal = Number(formData.asal_l || 0);
  const tAsal = Number(formData.asal_t || 0);
  const volAsal = pAsal * lAsal * tAsal;

  const pHasil = Number(formData.hasil_p || 0);
  const lHasil = Number(formData.hasil_l || 0);
  const tHasil = Number(formData.hasil_t || 0);
  const volHasil = pHasil * lHasil * tHasil;

  const maxQtyVertical = volHasil > 0 ? Math.floor(volAsal / volHasil) : 0;
  const isQtyVerticalOver = volHasil > 0 && Number(formData.hasil_qty || 0) > maxQtyVertical;

  const getSisaInputClass = () => {
    const { sisa_p, sisa_l, sisa_t, sisa_qty, sisa_keterangan } = formData;
    if (sisa_p === '' && sisa_l === '' && sisa_t === '' && sisa_qty === '') return inputClass;

    if (Number(sisa_p) === 0 && Number(sisa_l) === 0 && Number(sisa_t) === 0 && Number(sisa_qty) === 0) {
      return `${inputClass} border-green-500 bg-green-50 text-green-700 font-bold focus:border-green-600 focus:ring-green-500 dark:bg-green-900/30 dark:border-green-500`;
    }

    const isSisaKeteranganEmpty = !sisa_keterangan || sisa_keterangan.trim() === '';
    if (!isSisaKeteranganEmpty) {
      return `${inputClass} border-green-500 bg-green-50 text-green-700 font-bold focus:border-green-600 focus:ring-green-500 dark:bg-green-900/30 dark:border-green-500`;
    }

    return `${inputClass} border-red-500 bg-red-50 text-red-700 font-bold focus:border-red-600 focus:ring-red-500 dark:bg-red-900/30 dark:border-red-500`;
  };
  const sisaColorClass = getSisaInputClass();

  const getBucketsStatus = () => {
    let bucketA = Number(formData.hasil_t || 0) * Number(formData.hasil_qty || 1);
    const initialBucketA = bucketA;
    
    let isSispotRotated = false;
    let sispotInitialized = false;
    let bucketB = 0;
    let maxL_B = 0;
    let initialBucketB = 0;

    const itemSources = [];
    let isError = false;
    let errorMessage = '';

    formData.carousel_items.forEach((item, idx) => {
      let t_needed = (Number(item.hasil2_t || 0) * Number(item.hasil2_qty || 0)) +
        (Number(item.waste_kulit_t || 0) * Number(item.waste_kulit_qty || 1)) +
        (Number(item.waste_potong_t || 0) * Number(item.waste_potong_qty || 1)) +
        (Number(item.waste_produksi_t || 0) * Number(item.waste_produksi_qty || 1)) +
        (Number(item.sispot_t || 0) * Number(item.sispot_qty || 1));

      let source = 'Utama';
      const isUtamaExhausted = initialBucketA > 0 && bucketA <= 0.001;
      
      if (!isUtamaExhausted) {
        source = 'Utama';
        bucketA -= t_needed;
        if (bucketA < -0.001 && initialBucketA > 0) {
          isError = true;
          errorMessage = `Item WO #${idx + 1}: Ketinggian melebihi sisa Hasil Utama (${(bucketA + t_needed).toFixed(1)} cm). Harap paskan (habiskan) sisa ini sebelum menambah Sispot.`;
        }
      } else {
        source = 'Sispot';
        
        if (!sispotInitialized) {
            sispotInitialized = true;
            if (Number(item.hasil2_l || 0) > Number(formData.sisa_l || 0)) {
                isSispotRotated = true;
                bucketB = Number(formData.sisa_l || 0) * Number(formData.sisa_qty || 1);
                maxL_B = Number(formData.sisa_t || 0);
            } else {
                isSispotRotated = false;
                bucketB = Number(formData.sisa_t || 0) * Number(formData.sisa_qty || 1);
                maxL_B = Number(formData.sisa_l || 0);
            }
            initialBucketB = bucketB;
        }

        bucketB -= t_needed;
        if (bucketB < -0.001) {
          isError = true;
          errorMessage = `Item WO #${idx + 1}: Ketinggian melebihi ketersediaan Sispot Vertikal.`;
        }
        if (Number(item.hasil2_l || 0) > maxL_B + 0.001) {
          isError = true;
          const statusRotated = isSispotRotated ? "yang ditidurkan" : "normal";
          errorMessage = `Item WO #${idx + 1}: Lebar demand (${item.hasil2_l}) melebihi max lebar Sispot (${maxL_B}) (${statusRotated}).`;
        }
      }
      itemSources.push({ source, sisaUtama: bucketA, sisaSispot: bucketB });
    });

    if (!sispotInitialized) {
        initialBucketB = Number(formData.sisa_t || 0) * Number(formData.sisa_qty || 1);
        bucketB = initialBucketB;
    }

    return { bucketA, bucketB, itemSources, isError, errorMessage, maxL_B, initialBucketA, initialBucketB, isSispotRotated };
  };
  const buckets = getBucketsStatus();
  const isSisaZero = buckets.bucketA <= 0.001 && buckets.bucketB <= 0.001;



  const getPLProps = (index, val, basePlaceholder, tVal) => {
    const isTValEmpty = tVal === '' || tVal === null || tVal === undefined || Number(tVal) === 0;
    const itemSourceInfo = buckets.itemSources[index];
    const isSourceExhausted = itemSourceInfo 
      ? (itemSourceInfo.source === 'Utama' 
          ? (buckets.initialBucketA > 0 && itemSourceInfo.sisaUtama <= 0.001) 
          : (buckets.initialBucketB > 0 && itemSourceInfo.sisaSispot <= 0.001))
      : false;
    const forceZero = isTValEmpty && isSourceExhausted;

    if (forceZero) {
      return {
        value: '',
        readOnly: true,
        className: `${inputClass} bg-emerald-100 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 font-bold placeholder-emerald-500`,
        placeholder: '0'
      };
    }

    return {
      className: inputClass,
      placeholder: basePlaceholder
    };
  };

  const getTProps = (index, val) => {
    const isValEmpty = val === '' || val === null || val === undefined || Number(val) === 0;
    const itemSourceInfo = buckets.itemSources[index];
    const isSourceExhausted = itemSourceInfo 
      ? (itemSourceInfo.source === 'Utama' 
          ? (buckets.initialBucketA > 0 && itemSourceInfo.sisaUtama <= 0.001) 
          : (buckets.initialBucketB > 0 && itemSourceInfo.sisaSispot <= 0.001))
      : false;
    const forceZero = isValEmpty && isSourceExhausted;

    if (forceZero) {
      return {
        value: '',
        readOnly: true,
        className: `${inputClass} bg-emerald-100 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 font-bold placeholder-emerald-500`,
        placeholder: '0'
      };
    }

    const availableMax = buckets.bucketA > 0.001 ? buckets.bucketA : buckets.bucketB;
    return {
      className: inputClass,
      placeholder: `Max: ${availableMax.toFixed(1)}`
    };
  };

  const getQtyProps = (index, tVal, qtyVal) => {
    const isQtyEmpty = qtyVal === '' || qtyVal === null || qtyVal === undefined || Number(qtyVal) === 0;
    const isTValEmpty = tVal === '' || tVal === null || tVal === undefined || Number(tVal) === 0;
    const itemSourceInfo = buckets.itemSources[index];
    const isSourceExhausted = itemSourceInfo 
      ? (itemSourceInfo.source === 'Utama' 
          ? (buckets.initialBucketA > 0 && itemSourceInfo.sisaUtama <= 0.001) 
          : (buckets.initialBucketB > 0 && itemSourceInfo.sisaSispot <= 0.001))
      : false;
    const forceZero = isTValEmpty && isSourceExhausted;

    if (forceZero) {
      return {
        value: '',
        readOnly: true,
        className: `${inputClass} bg-emerald-100 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 font-bold placeholder-emerald-500`,
        placeholder: '0'
      };
    }

    const tNum = Number(tVal || 0);
    const sisaBeforeThis = (buckets.bucketA + buckets.bucketB) + (tNum * 1);
    const suggestQty = tNum > 0 ? Math.floor(sisaBeforeThis / tNum) : 0;

    return {
      readOnly: false,
      className: inputClass,
      placeholder: isQtyEmpty && suggestQty > 0 ? `Saran: ${suggestQty}` : 'Qty'
    };
  };

  const hasSisaPotong = Number(formData.sisa_p || 0) > 0 || Number(formData.sisa_l || 0) > 0 || Number(formData.sisa_t || 0) > 0 || Number(formData.sisa_qty || 0) > 0;
  
  const isTambahWoDisabled = !hasSisaPotong || buckets.bucketA > 0.001 || isSisaZero;
  const getTambahWoTooltip = () => {
    if (!hasSisaPotong) return "Tidak bisa menambah WO karena tidak ada Sisa Potongan dari proses Vertikal.";
    if (buckets.bucketA > 0.001) return "Dimensi Hasil Utama Vertikal harus dipakai habis terlebih dahulu sebelum menambah WO.";
    if (isSisaZero) return "Semua ketersediaan dimensi tinggi (Utama & Sispot) sudah dipakai habis.";
    return "Tambah WO";
  };
  const hasUkuranAsal = Number(formData.asal_p || 0) > 0 || Number(formData.asal_l || 0) > 0 || Number(formData.asal_t || 0) > 0 || Number(formData.asal_qty || 0) > 0;
  const isSisaKeteranganEmpty = !formData.sisa_keterangan || formData.sisa_keterangan.trim() === '';
  const isKondisiBusaEmpty = !formData.keterangan_kondisi || formData.keterangan_kondisi.trim() === '';
  
  const isSampingBlocked = hasUkuranAsal && Number(formData.asal_l) > 0 && Number(formData.asal_l) === Number(formData.hasil_l);
  const isDepanBlocked = hasUkuranAsal && Number(formData.asal_p) > 0 && Number(formData.asal_p) === Number(formData.hasil_p);
  
  const isAnomalySamping = isSampingBlocked && (Number(formData.waste_samping_t || 0) > 0 || Number(formData.waste_samping_qty || 0) > 0);
  const isAnomalyDepan = isDepanBlocked && (Number(formData.waste_dpn_blk_t || 0) > 0 || Number(formData.waste_dpn_blk_qty || 0) > 0);
  const isAnomalyVertical = isAnomalySamping || isAnomalyDepan;

  const isBagianIILocked = hasUkuranAsal && isKondisiBusaEmpty;
  const isBagianIIILocked = (hasSisaPotong && isSisaKeteranganEmpty) || (hasUkuranAsal && isKondisiBusaEmpty) || isAnomalyVertical;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 relative">

      {showSispotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${prefs.darkMode ? 'bg-[#1e293b] text-white' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${prefs.darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className="font-bold text-lg flex items-center gap-2 text-accent-blue">
                <AlertCircle size={20} />
                Sisa Potong Tersedia
              </h3>
              <button onClick={() => setShowSispotModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-sm opacity-80 mb-2">Barcode ini memiliki sisa potong sebelumnya. Pilih kepingan yang ingin Anda gunakan:</p>
              
              {availableSispots.map(sp => (
                <button 
                  key={sp.id}
                  onClick={() => handleSelectSispot(sp)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:-translate-y-0.5 ${prefs.darkMode ? 'border-blue-900/50 hover:border-blue-500 bg-blue-900/20' : 'border-blue-100 hover:border-blue-400 bg-blue-50'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-accent-blue">Sisa {sp.sumber_potong}</span>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-md font-semibold">
                      {calculateAging(sp.created_at)}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-lg">
                    {sp.p} x {sp.l} x {sp.t} <span className="text-sm">({sp.qty} pcs)</span>
                  </div>
                  {sp.kualitas && <div className="text-xs mt-1 opacity-70">Kualitas: {sp.kualitas}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <DocumentScannerModal
          onScan={parseOCRText}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* HEADER & TABS */}
      <div className={`px-6 py-4 rounded-xl shadow flex flex-col md:flex-row justify-between items-center gap-4 ${prefs.darkMode ? 'bg-[#1e293b] text-white' : 'bg-navy-dark text-white'}`}>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck size={24} className="text-accent-blue" />
            {editId ? 'Edit Realisasi Produksi' : 'Realisasi Produksi'}
          </h2>
          <p className="text-accent-blue text-sm mt-1">
            {editId ? `Sedang mengedit data #${editId}` : 'Input Kartu Kontrol Produksi Cutting & Pantau Hasilnya'}
          </p>
        </div>
        <div className="flex gap-2 p-1 bg-white/10 rounded-lg">
          <button onClick={() => { setActiveTab('input'); if (activeTab !== 'input' && !editId) setFormData(getInitialFormState()); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'input' ? 'bg-accent-blue text-navy-dark shadow' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
            <PlusCircle size={16} /> Form Input
          </button>
          <button onClick={() => { setActiveTab('table'); setEditId(null); setFormData(getInitialFormState()); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'table' ? 'bg-accent-blue text-navy-dark shadow' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
            <List size={16} /> Data Tabel
          </button>
          {activeTab === 'table' && (
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-green-400 border border-green-500 hover:bg-green-500 hover:text-white transition-all ml-2">
              <Download size={16} /> Export Excel
            </button>
          )}
        </div>
      </div>

      {notification.show && (
        <div className={`fixed top-6 right-6 p-4 rounded-lg shadow-xl z-50 animate-in slide-in-from-top-2 text-white font-semibold flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}

      {/* TAB CONTENT: INPUT FORM */}
      {activeTab === 'input' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* SECTION 1: IDENTITAS */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b font-bold flex justify-between items-center gap-2 ${prefs.darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-gray-50 text-navy-dark'}`}>
              <div className="flex items-center gap-2">Bagian I: Identitas Material & Bahan Baku Induk (1 Blok)</div>
              <button type="button" onClick={() => setShowScanner(true)} className="hidden items-center gap-2 bg-accent-blue text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors shadow-sm">
                <ScanLine size={16} /> Scan Dokumen Fisik
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div>
                <label className={labelClass}>Kualitas</label>
                <input 
                  required 
                  type="text" 
                  name="kualitas" 
                  value={formData.kualitas} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="Contoh: LBR R 100" 
                  readOnly={!!formData.sisa_potong_id_used}
                />
              </div>
              <div>
                <label className={labelClass}>Status Barcode</label>
                <select 
                  name="barcode_status" 
                  value={formData.barcode_status} 
                  onChange={handleChange} 
                  className={inputClass}
                >
                  <option value="Normal">Normal</option>
                  <option value="Abnormal">Abnormal</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>No Barcode {formData.barcode_status === 'Abnormal' ? 'Utama' : ''}</label>
                <input 
                  required 
                  type="text" 
                  name="no_barcode" 
                  value={formData.no_barcode} 
                  onChange={handleChange} 
                  className={`${inputClass} ${formData.barcode_status === 'Normal' && formData.no_barcode && formData.no_barcode.length > 10 ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`} 
                />
                {formData.barcode_status === 'Normal' && formData.no_barcode && formData.no_barcode.length > 10 && (
                  <span className="text-red-500 text-xs mt-1 block font-medium">Warning: Barcode tidak boleh lebih dari 10 digit.</span>
                )}
              </div>
              {formData.barcode_status === 'Abnormal' && (
                <div>
                  <label className={labelClass}>No Barcode Ekstra</label>
                  <input 
                    required 
                    type="text" 
                    name="no_barcode_extra" 
                    value={formData.no_barcode_extra} 
                    onChange={handleChange} 
                    className={inputClass} 
                    placeholder="Barcode tambahan..."
                  />
                </div>
              )}
              <div><label className={labelClass}>Tanggal</label><input required type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>No SPK</label><input required type="text" name="no_spk" value={formData.no_spk} onChange={handleChange} className={inputClass} /></div>

              <div>
                <label className={labelClass}>Nama Operator</label>
                {(formData.nama_operator && !operatorOptions.includes(formData.nama_operator)) || formData.nama_operator === 'Lainnya' ? (
                  <div className="flex gap-2">
                    <input required type="text" name="nama_operator" value={formData.nama_operator === 'Lainnya' ? '' : formData.nama_operator} onChange={handleChange} className={inputClass} placeholder="Ketik nama manual..." autoFocus />
                    <button type="button" onClick={() => setFormData({ ...formData, nama_operator: '' })} className={`px-3 flex items-center justify-center rounded-lg border transition-colors ${prefs.darkMode ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`} title="Batal / Kembali Pilih">
                      <X size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <select required name="nama_operator" value={formData.nama_operator} onChange={handleChange} className={inputClass}>
                    <option value="" disabled>Pilih Operator...</option>
                    {operatorOptions.map(op => <option key={op} value={op}>{op}</option>)}
                    <option value="Lainnya">-- Lainnya (Ketik Manual) --</option>
                  </select>
                )}
              </div>
              <div>
                <label className={labelClass}>Grup</label>
                <select name="grup" value={formData.grup} onChange={handleChange} className={inputClass}>
                  <option value="Grup A">Grup A</option>
                  <option value="Grup B">Grup B</option>
                  <option value="Grup C">Grup C</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Shift</label>
                <select name="shift" value={formData.shift} onChange={handleChange} className={inputClass}>
                  <option value="Shift 1">Shift 1</option>
                  <option value="Shift 2">Shift 2</option>
                  <option value="Shift 3">Shift 3</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Ukuran Asal (P x L x T x Qty)</label>
                <div className="flex gap-2">
                  <input type="number" step="any" name="asal_p" value={formData.asal_p} onChange={handleChange} placeholder="P" className={inputClass} />
                  <input type="number" step="any" name="asal_l" value={formData.asal_l} onChange={handleChange} placeholder="L" className={inputClass} />
                  <input type="number" step="any" name="asal_t" value={formData.asal_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="asal_qty" value={formData.asal_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
              </div>

              <div className="md:col-span-2"><label className={labelClass}>Keterangan Kondisi Busa</label><textarea name="keterangan_kondisi" value={formData.keterangan_kondisi} onChange={handleChange} className={`${inputClass} h-10`} placeholder="Jebol/Sobek/dll" /></div>
            </div>
          </div>

          {/* SECTION 2: VERTICAL */}
          <div className={`rounded-xl shadow-sm border overflow-hidden relative ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
            {isBagianIILocked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-sm">
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-6 py-4 rounded-xl shadow-lg border border-red-200 dark:border-red-800 flex items-center gap-3 animate-in fade-in zoom-in max-w-lg text-center">
                  <AlertCircle size={24} className="flex-shrink-0" />
                  Mohon isi "Keterangan Kondisi Busa" di Bagian I terlebih dahulu untuk membuka kunci.
                </div>
              </div>
            )}
            <div className={`p-4 border-b font-bold flex items-center gap-2 ${prefs.darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-gray-50 text-navy-dark'}`}>
              Bagian II: Proses Level 1 - Mesin Vertical (Potongan Awal/Slab)
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              <div className="col-span-1">
                <label className={labelClass}>No Mesin</label>
                <select name="no_mesin" value={formData.no_mesin} onChange={handleChange} className={inputClass}>
                  <option value="V1">V1</option><option value="V2">V2</option><option value="V3">V3</option>
                </select>
              </div>

              <div className="col-span-1 lg:col-span-3">
                <label className={labelClass}>Hasil Cutting (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input required type="number" step="any" name="hasil_p" value={formData.hasil_p} onChange={handleChange} placeholder="P" className={inputClass} />
                  <input required type="number" step="any" name="hasil_l" value={formData.hasil_l} onChange={handleChange} placeholder="L" className={inputClass} />
                  <input required type="number" step="any" name="hasil_t" value={formData.hasil_t} onChange={handleChange} placeholder="T (SB)" title="Tinggi Short Block" className={`${inputClass} border-blue-500 font-bold`} />
                  <input required type="number" name="hasil_qty" value={formData.hasil_qty} onChange={handleChange} placeholder="Qty" className={`${inputClass} ${isQtyVerticalOver ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
                {isQtyVerticalOver && (
                  <p className="text-xs text-red-500 font-bold mt-1 text-right">⚠️ Maks Qty (Kubikasi): {maxQtyVertical}</p>
                )}
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Waste Samping Kiri Kanan (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="any" name="waste_samping_p" value={formData.waste_samping_p} onChange={handleChange} placeholder="P" title="Auto: = Panjang Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="any" name="waste_samping_l" value={formData.waste_samping_l} onChange={handleChange} placeholder="L" title="Auto: = Tinggi Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="any" name="waste_samping_t" value={formData.waste_samping_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="waste_samping_qty" value={formData.waste_samping_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
                {isAnomalySamping && <p className="text-xs text-red-500 font-bold mt-1">⚠️ Anomali (Lebar Asal & Hasil Sama = No Waste)</p>}
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Waste Depan Belakang (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="any" name="waste_dpn_blk_p" value={formData.waste_dpn_blk_p} onChange={handleChange} placeholder="P" title="Auto: = Lebar Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="any" name="waste_dpn_blk_l" value={formData.waste_dpn_blk_l} onChange={handleChange} placeholder="L" title="Auto: = Tinggi Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="any" name="waste_dpn_blk_t" value={formData.waste_dpn_blk_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="waste_dpn_blk_qty" value={formData.waste_dpn_blk_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
                {isAnomalyDepan && <p className="text-xs text-red-500 font-bold mt-1">⚠️ Anomali (Panjang Asal & Hasil Sama = No Waste)</p>}
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Waste Produksi (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="any" name="waste_produksi_p" value={formData.waste_produksi_p} onChange={handleChange} placeholder="P" className={inputClass} />
                  <input type="number" step="any" name="waste_produksi_l" value={formData.waste_produksi_l} onChange={handleChange} placeholder="L" className={inputClass} />
                  <input type="number" step="any" name="waste_produksi_t" value={formData.waste_produksi_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="waste_produksi_qty" value={formData.waste_produksi_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Sisa Potongan (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="any" name="sisa_p" value={formData.sisa_p} onChange={handleChange} placeholder="P" className={sisaColorClass} />
                  <input type="number" step="any" name="sisa_l" value={formData.sisa_l} onChange={handleChange} placeholder="L" className={sisaColorClass} />
                  <input type="number" step="any" name="sisa_t" value={formData.sisa_t} onChange={handleChange} placeholder="T" className={sisaColorClass} />
                  <input type="number" name="sisa_qty" value={formData.sisa_qty} onChange={handleChange} placeholder="Qty" className={sisaColorClass} />
                </div>
                <input type="text" name="sisa_keterangan" value={formData.sisa_keterangan} onChange={handleChange} placeholder="Keterangan Sisa Potongan..." className={`${sisaColorClass} mt-2`} />
              </div>

              <div className="col-span-1 lg:col-span-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                <label className={`${labelClass} text-red-700 dark:text-red-400 font-bold flex items-center gap-2 mb-2`}>
                  <AlertCircle size={16} /> Downtime (Kode, Jam, Ket)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <select name="dt_kode" value={formData.dt_kode} onChange={handleChange} className={`${inputClass} col-span-1`}>
                    <option value="">Kode</option>
                    {downtimeOptions.map((opt, i) => (
                      <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input type="time" name="dt_jam_awal" value={formData.dt_jam_awal} onChange={handleChange} className={`${inputClass} col-span-1`} />
                  <input type="time" name="dt_jam_akhir" value={formData.dt_jam_akhir} onChange={handleChange} className={`${inputClass} col-span-1`} />
                  <input type="text" value={calculateDurationMinutes(formData.dt_jam_awal, formData.dt_jam_akhir)} readOnly placeholder="Durasi" className={`${inputClass} col-span-1 bg-white/50 font-bold text-center text-red-600 dark:text-red-400`} />
                  <input type="text" name="dt_keterangan" value={formData.dt_keterangan} onChange={handleChange} placeholder="Keterangan..." className={`${inputClass} col-span-4`} />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 3: CAROUSEL / HORIZONTAL MULTI-WO */}
          <div className={`rounded-xl shadow-sm border overflow-hidden relative ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
            {isBagianIIILocked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-sm">
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-6 py-4 rounded-xl shadow-lg border border-red-200 dark:border-red-800 flex items-center gap-3 animate-in fade-in zoom-in max-w-lg text-center">
                  <AlertCircle size={24} className="flex-shrink-0" />
                  {isKondisiBusaEmpty 
                    ? 'Mohon isi "Keterangan Kondisi Busa" di Bagian I terlebih dahulu untuk membuka kunci.' 
                    : isAnomalyVertical
                      ? 'Terdeteksi Anomali pada Bagian II: Ukuran P/L Asal dan Hasil Potong sama (No Waste), namun T atau Qty Waste terisi. Harap jadikan 0 sebelum lanjut.'
                      : 'Mohon isi "Keterangan Sisa Potongan" di Bagian II terlebih dahulu untuk membuka kunci.'}
                </div>
              </div>
            )}
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-2 ${prefs.darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-gray-50 text-navy-dark'}`}>
              <div className="flex items-center gap-4">
                <span className="font-bold">Bagian III: Proses Level 2 (Horizontal / Carousel) - Multi WO</span>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-6 bg-gray-50 dark:bg-[#0f172a]/50">
              {formData.carousel_items.map((item, index) => {
                const sourceInfo = buckets.itemSources[index] || { source: 'Utama', sisaUtama: 0, sisaSispot: 0 };
                const sisaTinggi = sourceInfo.source === 'Utama' ? sourceInfo.sisaUtama : sourceInfo.sisaSispot;
                const sourceLabel = sourceInfo.source === 'Utama' ? 'Hasil Utama' : 'Sispot Vertikal';
                const labelColorClass = sourceInfo.source === 'Utama' 
                  ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                  : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';

                return (
                  <div key={index} className={`relative p-4 border rounded-lg shadow-sm ${prefs.darkMode ? 'bg-[#1e293b] border-slate-600' : 'bg-white border-gray-200'}`}>
                    {index > 0 && (
                      <button type="button" onClick={() => removeWO(index)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-50 rounded-full dark:hover:bg-red-900/20 z-10" title="Hapus WO">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-2 mb-4">
                      <h4 className="font-bold text-accent-blue flex flex-col md:flex-row items-start md:items-center gap-2">
                        Item WO #{index + 1}
                        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${labelColorClass}`}>
                          Sumber: {sourceLabel}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${sisaTinggi > 0
                            ? (prefs.darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200')
                            : sisaTinggi === 0
                              ? (prefs.darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200')
                              : (prefs.darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200')
                          }`}>
                          Sisa Tinggi: {Number(sisaTinggi).toLocaleString('id-ID', { maximumFractionDigits: 2 })} cm
                        </span>
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2 md:mt-0 pr-8">
                        <span className="bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-slate-600">
                          Barcode: <strong className="text-accent-blue">{formData.no_barcode || '-'}</strong>
                        </span>
                        {sourceInfo.source === 'Utama' ? (
                          <span className="bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-slate-600">
                            Hasil Vertical: <strong className="text-accent-blue">{formData.hasil_p || '0'} x {formData.hasil_l || '0'} x {formData.hasil_t || '0'} ({formData.hasil_qty || '0'})</strong>
                          </span>
                        ) : (
                          <span className="bg-purple-50 dark:bg-slate-700 px-2 py-1 rounded shadow-sm border border-purple-200 dark:border-slate-600">
                            Sispot Vertical: <strong className="text-purple-600">{formData.sisa_p || '0'} x {formData.sisa_l || '0'} x {formData.sisa_t || '0'} ({formData.sisa_qty || '0'})</strong>
                          </span>
                        )}
                      </div>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">

                    <div className="col-span-1 lg:col-span-2">
                      <label className={labelClass}>Tipe Mesin</label>
                      <select name="tipe_mesin" value={item.tipe_mesin} onChange={(e) => handleCarouselChange(index, e)} className={inputClass}>
                        <option value="Horizontal">Horizontal</option>
                        <option value="Carousel">Carousel</option>
                      </select>
                    </div>

                    <div className="col-span-1 lg:col-span-2">
                      <label className={labelClass}>No Mesin</label>
                      <select name="no_mesin" value={item.no_mesin} onChange={(e) => handleCarouselChange(index, e)} className={inputClass}>
                        {item.tipe_mesin === 'Horizontal' ? (
                          <><option value="H1">H1</option><option value="H2">H2</option><option value="H3">H3</option></>
                        ) : (
                          <><option value="C1">C1</option><option value="C2">C2</option><option value="C3">C3</option></>
                        )}
                      </select>
                    </div>

                    {item.tipe_mesin === 'Carousel' && (
                      <div className="col-span-1 lg:col-span-2 animate-in fade-in zoom-in">
                        <label className={labelClass}>Isi Disk</label>
                        <input type="text" name="no_disk" value={item.no_disk} onChange={(e) => handleCarouselChange(index, e)} placeholder="Isi Disk" className={`${inputClass} border-purple-400 bg-purple-50 dark:bg-purple-900/20`} />
                      </div>
                    )}

                    <div className="col-span-1 lg:col-span-2">
                      <label className={labelClass}>Tanggal WO</label>
                      <input type="date" name="tanggal_wo" value={item.tanggal_wo} onChange={(e) => handleTanggalWoChange(index, e.target.value)} className={inputClass} />
                    </div>

                    <div 
                      className={`col-span-1 ${item.tipe_mesin === 'Carousel' ? 'lg:col-span-4' : 'lg:col-span-3'} relative`} 
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setFocusedWoIndex(null);
                        }
                      }}
                    >
                      <label className={labelClass}>No WO</label>
                      <input
                        name="no_wo"
                        value={item.no_wo}
                        onChange={(e) => handleWoSelect(index, e.target.value)}
                        onFocus={() => {
                          setFocusedWoIndex(index);
                          if (item.tanggal_wo) fetchActiveWOs(item.tanggal_wo, true);
                        }}
                        className={`${inputClass} ${(item.no_wo && item.no_wo.length > 7) || (item.no_wo && /[a-zA-Z]/.test(item.no_wo)) ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                        placeholder="Ketik & Pilih WO..."
                        autoComplete="off"
                      />
                      {item.no_wo && item.no_wo.length > 7 && !/[a-zA-Z]/.test(item.no_wo) && (
                        <span className="text-red-500 text-xs mt-1 block font-medium">Warning: No WO tidak boleh lebih dari 7 digit.</span>
                      )}
                      {item.no_wo && /[a-zA-Z]/.test(item.no_wo) && (
                        <span className="text-red-500 text-xs mt-1 block font-medium">Warning: Jika huruf harus di isi ke Keterangan, bukan di No WO.</span>
                      )}
                      {focusedWoIndex === index && item.tanggal_wo && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {getAvailableWOs(index)
                            .filter(wo => wo.no_wo.toLowerCase().includes((item.no_wo || '').toLowerCase()))
                            .map((wo, wIdx) => (
                            <div
                              key={wIdx}
                              className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-gray-800 text-sm border-b border-gray-100 last:border-0 font-medium"
                              onMouseDown={(e) => {
                                e.preventDefault(); 
                                handleWoSelect(index, wo.no_wo);
                                setFocusedWoIndex(null);
                              }}
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-bold text-navy-dark">{wo.no_wo}</span>
                                <span className="text-xs text-gray-500 font-normal">
                                  {wo.ukuran_p ? `${Number(wo.ukuran_p)}x${Number(wo.ukuran_l)}x${Number(wo.ukuran_t)}` : (wo.ukuran_t ? `T:${Number(wo.ukuran_t)}` : '')} (Qty: {wo.qty_cutting})
                                </span>
                              </div>
                            </div>
                          ))}
                          {getAvailableWOs(index).filter(wo => wo.no_wo.toLowerCase().includes((item.no_wo || '').toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-gray-500 italic text-sm">WO tidak ditemukan</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={`col-span-1 ${item.tipe_mesin === 'Carousel' ? 'lg:col-span-8' : 'lg:col-span-3'}`}>
                      <label className={labelClass}>{item.tipe_mesin === 'Carousel' ? 'Keterangan Tambahan WO' : 'Keterangan'}</label>
                      <input type="text" name="keterangan" value={item.keterangan} onChange={(e) => handleCarouselChange(index, e)} placeholder={item.tipe_mesin === 'Carousel' ? "Isi ket jika WO tidak ada di daftar atau perlu catatan..." : "Isi ket jika WO tidak ada di daftar..."} className={inputClass} />
                    </div>

                    <div className="col-span-1 lg:col-span-4">
                      <label className={labelClass}>Status Produksi</label>
                      <div className="flex gap-2">
                        <select name="status" value={item.status} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} ${item.status === 'Reject' ? 'w-1/3' : 'w-full'}`}>
                          <option value="OK">OK</option>
                          <option value="Reject">Reject</option>
                        </select>
                        {item.status === 'Reject' && (
                          <input type="text" name="alasan_reject" value={item.alasan_reject} onChange={(e) => handleCarouselChange(index, e)} placeholder="Alasan Reject..." className={`${inputClass} w-2/3`} />
                        )}
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-6">
                      <label className={labelClass}>Hasil Cutting (P x L x T x Qty)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" step="any" name="hasil2_p" value={item.hasil2_p} onChange={(e) => handleCarouselChange(index, e)} placeholder="P" className={`${inputClass} border-blue-400 bg-blue-50 dark:bg-blue-900/20`} />
                        <input type="number" step="any" name="hasil2_l" value={item.hasil2_l} onChange={(e) => handleCarouselChange(index, e)} placeholder="L" className={`${inputClass} border-blue-400 bg-blue-50 dark:bg-blue-900/20`} />
                        <input type="number" step="any" name="hasil2_t" value={item.hasil2_t} onChange={(e) => handleCarouselChange(index, e)} placeholder="T" title="Otomatis dari WO" className={`${inputClass} border-blue-400 bg-blue-50 dark:bg-blue-900/20`} />
                        <input type="number" name="hasil2_qty" value={item.hasil2_qty} onChange={(e) => handleCarouselChange(index, e)} placeholder="Qty" title="Otomatis dari Sisa WO" className={`${inputClass} border-blue-400 bg-blue-50 dark:bg-blue-900/20`} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-6">
                      <label className={labelClass}>Waste Kulit (P x L x T x Qty)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" step="any" name="waste_kulit_p" value={item.waste_kulit_p} onChange={(e) => handleCarouselChange(index, e)} {...getPLProps(index, item.waste_kulit_p, 'P', item.waste_kulit_t)} />
                        <input type="number" step="any" name="waste_kulit_l" value={item.waste_kulit_l} onChange={(e) => handleCarouselChange(index, e)} {...getPLProps(index, item.waste_kulit_l, 'L', item.waste_kulit_t)} />
                        <input type="number" step="any" name="waste_kulit_t" value={item.waste_kulit_t} onChange={(e) => handleCarouselChange(index, e)} {...getTProps(index, item.waste_kulit_t)} />
                        <input type="number" name="waste_kulit_qty" value={item.waste_kulit_qty} onChange={(e) => handleCarouselChange(index, e)} {...getQtyProps(index, item.waste_kulit_t, item.waste_kulit_qty)} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-6">
                      <label className={labelClass}>Waste Potong (P x L x T x Qty)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" step="any" name="waste_potong_p" value={item.waste_potong_p} onChange={(e) => handleCarouselChange(index, e)} {...getPLProps(index, item.waste_potong_p, 'P', item.waste_potong_t)} />
                        <input type="number" step="any" name="waste_potong_l" value={item.waste_potong_l} onChange={(e) => handleCarouselChange(index, e)} {...getPLProps(index, item.waste_potong_l, 'L', item.waste_potong_t)} />
                        <input type="number" step="any" name="waste_potong_t" value={item.waste_potong_t} onChange={(e) => handleCarouselChange(index, e)} {...getTProps(index, item.waste_potong_t)} />
                        <input type="number" name="waste_potong_qty" value={item.waste_potong_qty} onChange={(e) => handleCarouselChange(index, e)} {...getQtyProps(index, item.waste_potong_t, item.waste_potong_qty)} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-6">
                      <label className={labelClass}>Waste Produksi & Keterangan</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" step="any" name="waste_produksi_p" value={item.waste_produksi_p} onChange={(e) => handleCarouselChange(index, e)} {...getPLProps(index, item.waste_produksi_p, 'P', item.waste_produksi_t)} />
                        <input type="number" step="any" name="waste_produksi_l" value={item.waste_produksi_l} onChange={(e) => handleCarouselChange(index, e)} {...getPLProps(index, item.waste_produksi_l, 'L', item.waste_produksi_t)} />
                        <input type="number" step="any" name="waste_produksi_t" value={item.waste_produksi_t} onChange={(e) => handleCarouselChange(index, e)} {...getTProps(index, item.waste_produksi_t)} />
                        <input type="number" name="waste_produksi_qty" value={item.waste_produksi_qty} onChange={(e) => handleCarouselChange(index, e)} {...getQtyProps(index, item.waste_produksi_t, item.waste_produksi_qty)} />
                        <input type="text" name="waste_produksi_keterangan" value={item.waste_produksi_keterangan} onChange={(e) => handleCarouselChange(index, e)} placeholder="Keterangan..." className={`${inputClass} col-span-4`} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-6">
                      <label className={labelClass}>
                        Sispot & Keterangan 
                        {index !== formData.carousel_items.length - 1 && (
                          <span className="text-red-500 font-normal ml-2 text-xs italic">(Hanya untuk WO terakhir)</span>
                        )}
                      </label>
                      <div className={`grid grid-cols-4 gap-2 ${index !== formData.carousel_items.length - 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input type="number" step="any" name="sispot_p" value={item.sispot_p} onChange={(e) => handleCarouselChange(index, e)} disabled={index !== formData.carousel_items.length - 1} {...getPLProps(index, item.sispot_p, 'P', item.sispot_t)} />
                        <input type="number" step="any" name="sispot_l" value={item.sispot_l} onChange={(e) => handleCarouselChange(index, e)} disabled={index !== formData.carousel_items.length - 1} {...getPLProps(index, item.sispot_l, 'L', item.sispot_t)} />
                        <input type="number" step="any" name="sispot_t" value={item.sispot_t} onChange={(e) => handleCarouselChange(index, e)} disabled={index !== formData.carousel_items.length - 1} {...getTProps(index, item.sispot_t)} />
                        <input type="number" name="sispot_qty" value={item.sispot_qty} onChange={(e) => handleCarouselChange(index, e)} disabled={index !== formData.carousel_items.length - 1} {...getQtyProps(index, item.sispot_t, item.sispot_qty)} />
                        <input type="text" name="sispot_keterangan" value={item.sispot_keterangan} onChange={(e) => handleCarouselChange(index, e)} disabled={index !== formData.carousel_items.length - 1} placeholder="Keterangan..." className={`${inputClass} col-span-4`} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-12 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                      <label className={`${labelClass} text-red-700 dark:text-red-400 font-bold flex items-center gap-2 mb-2`}>
                        <AlertCircle size={16} /> Downtime (Kode, Jam, Ket)
                      </label>
                      <div className="grid grid-cols-8 gap-2">
                        <select name="dt_kode" value={item.dt_kode} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} col-span-1`}>
                          <option value="">Kode</option>
                          {downtimeOptions.map((opt, i) => (
                            <option key={i} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input type="time" name="dt_jam_awal" value={item.dt_jam_awal} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} col-span-1`} />
                        <input type="time" name="dt_jam_akhir" value={item.dt_jam_akhir} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} col-span-1`} />
                        <input type="text" value={calculateDurationMinutes(item.dt_jam_awal, item.dt_jam_akhir)} readOnly placeholder="Durasi" className={`${inputClass} col-span-1 bg-white/50 font-bold text-center text-red-600 dark:text-red-400`} />
                        <input type="text" name="dt_keterangan" value={item.dt_keterangan} onChange={(e) => handleCarouselChange(index, e)} placeholder="Keterangan..." className={`${inputClass} col-span-4`} />
                      </div>
                    </div>

                    {index === formData.carousel_items.length - 1 && (
                      <div className="col-span-1 lg:col-span-12 flex justify-end mt-4 border-t pt-4 border-gray-100 dark:border-slate-700">
                        <button 
                          type="button" 
                          onClick={addWO} 
                          disabled={isTambahWoDisabled}
                          title={getTambahWoTooltip()}
                          className={`flex items-center justify-center gap-1 text-xs px-4 py-2 font-bold rounded shadow-sm transition-colors ${
                            isTambahWoDisabled 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-gray-400' 
                              : 'bg-accent-blue text-navy-dark hover:bg-opacity-80'
                          }`}
                        >
                          <Plus size={14} /> Tambah WO
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setFormData(getInitialFormState());
                  setActiveTab('table');
                }}
                className="px-6 py-3 font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-slate-700 dark:text-gray-400"
              >
                Batal Edit
              </button>
            )}
            <div className={`flex items-center gap-3 ${!editId && 'ml-auto'}`}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(null, true)}
                className="flex items-center gap-2 bg-amber-400 text-amber-900 font-bold px-6 py-3 rounded-lg shadow hover:bg-amber-500 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                Simpan sebagai Draft
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-accent-blue text-navy-dark font-bold px-8 py-3 rounded-lg shadow hover:bg-opacity-90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                {isSubmitting ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Submit Realisasi')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: DATA TABEL */}
      {activeTab === 'table' && (
        <div className={`flex flex-col gap-4 rounded-xl shadow-sm border overflow-hidden ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between ${prefs.darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-gray-50 text-navy-dark'}`}>
            <h3 className="font-bold flex items-center gap-2">Data History Realisasi</h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex bg-gray-200 dark:bg-slate-700 rounded-lg p-1">
                <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${filterStatus === 'ALL' ? 'bg-white text-navy-dark shadow' : 'text-gray-500 hover:text-navy-dark'}`}>Semua</button>
                <button onClick={() => setFilterStatus('SUBMITTED')} className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${filterStatus === 'SUBMITTED' ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:text-green-600'}`}>Tersimpan</button>
                <button onClick={() => setFilterStatus('DRAFT')} className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${filterStatus === 'DRAFT' ? 'bg-amber-400 text-amber-900 shadow' : 'text-gray-500 hover:text-amber-600'}`}>Draft</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tanggal:</span>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={inputClass} title="Pilih Tanggal" />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="p-2 text-red-500 hover:bg-red-50 rounded-md" title="Reset Filter">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className={`uppercase text-xs font-semibold ${prefs.darkMode ? 'bg-slate-800 text-gray-300 border-slate-700' : 'bg-gray-50 text-gray-500 border-gray-200'} border-b`}>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" onClick={() => requestSort('tanggal')}>
                    <div className="flex items-center gap-1">
                      Tanggal {sortConfig.key === 'tanggal' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" onClick={() => requestSort('no_barcode')}>
                    <div className="flex items-center gap-1">
                      Barcode {sortConfig.key === 'no_barcode' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" onClick={() => requestSort('no_spk')}>
                    <div className="flex items-center gap-1">
                      SPK {sortConfig.key === 'no_spk' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4">Total WO</th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" onClick={() => requestSort('nama_operator')}>
                    <div className="flex items-center gap-1">
                      Operator {sortConfig.key === 'nama_operator' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingData ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center"><Loader className="animate-spin mx-auto text-accent-blue" /></td>
                  </tr>
                ) : processedData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">Belum ada data realisasi / tidak ada data yang sesuai filter.</td>
                  </tr>
                ) : (
                  processedData.map((row) => (
                    <tr key={row.id} className={`border-b transition-colors ${prefs.darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <td className={`p-4 font-medium ${prefs.darkMode ? 'text-white' : 'text-navy-dark'}`}>{new Date(row.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{row.no_barcode}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{row.no_spk}</td>
                      <td className="p-4 font-bold text-accent-blue">{row.carousel_items ? row.carousel_items.length : 0} WO</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">
                        {row.nama_operator} ({row.shift} - {row.grup})
                        {row.identitas_status === 'DRAFT' && <span className="ml-2 inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">DRAFT</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {row.identitas_status === 'DRAFT' ? (
                            <button onClick={() => handleEdit(row)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-md transition-colors text-xs font-bold" title="Lanjutkan Draft">
                              <Edit size={14} /> Lanjutkan Draft
                            </button>
                          ) : (
                            <>
                              <button onClick={() => setSelectedDetail(row)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors dark:bg-blue-900/30 dark:hover:bg-blue-900/50" title="Lihat Detail">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => handleEdit(row)} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-md transition-colors dark:bg-amber-900/30 dark:hover:bg-amber-900/50" title="Edit Data">
                                <Edit size={16} />
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(row.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors dark:bg-red-900/30 dark:hover:bg-red-900/50" title="Hapus Data">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL VIEW DETAIL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl flex flex-col ${prefs.darkMode ? 'bg-slate-900 text-white' : 'bg-white'}`}>
            <div className={`flex justify-between items-center p-6 border-b sticky top-0 z-10 ${prefs.darkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ClipboardCheck className="text-accent-blue" /> Detail Realisasi Produksi
              </h3>
              <button onClick={() => setSelectedDetail(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Identitas Detail */}
                <div>
                  <h4 className="font-bold text-lg mb-4 text-accent-blue border-b pb-2">I. Identitas Material</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="block text-gray-500 text-xs">Barcode</span><span className="font-bold">{selectedDetail.no_barcode}</span></div>
                    <div><span className="block text-gray-500 text-xs">SPK</span><span className="font-bold">{selectedDetail.no_spk}</span></div>
                    <div><span className="block text-gray-500 text-xs">Kualitas</span><span className="font-bold">{selectedDetail.kualitas}</span></div>
                    <div><span className="block text-gray-500 text-xs">Operator / Shift / Grup</span><span className="font-bold">{selectedDetail.nama_operator} ({selectedDetail.shift} - {selectedDetail.grup})</span></div>
                    <div><span className="block text-gray-500 text-xs">Asal (PxLxTxQty)</span><span className="font-bold">{selectedDetail.asal_p} x {selectedDetail.asal_l} x {selectedDetail.asal_t} ({selectedDetail.asal_qty}x)</span></div>
                    <div className="col-span-2"><span className="block text-gray-500 text-xs">Ket. Kondisi</span><span className="font-bold">{selectedDetail.keterangan_kondisi || '-'}</span></div>
                  </div>
                </div>

                {/* Level 1 */}
                <div>
                  <h4 className="font-bold text-lg mb-4 text-accent-blue border-b pb-2">II. Level 1 (Vertical) - Mesin {selectedDetail.v_no_mesin || '-'}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="block text-gray-500 text-xs">Hasil (PxLxTxQty)</span>{renderDim(selectedDetail.v_hasil_p, selectedDetail.v_hasil_l, selectedDetail.v_hasil_t, selectedDetail.v_hasil_qty)}</div>
                    <div><span className="block text-gray-500 text-xs">Sisa Potong (PxLxTxQty)</span>{renderDim(selectedDetail.sisa_p, selectedDetail.sisa_l, selectedDetail.sisa_t, selectedDetail.sisa_qty, selectedDetail.sisa_keterangan)}</div>
                    <div><span className="block text-gray-500 text-xs">Waste Samping Kiri Kanan (PxLxTxQty)</span>{renderDim(selectedDetail.waste_samping_p, selectedDetail.waste_samping_l, selectedDetail.waste_samping_t, selectedDetail.waste_samping_qty)}</div>
                    <div><span className="block text-gray-500 text-xs">Waste Depan Belakang (PxLxTxQty)</span>{renderDim(selectedDetail.waste_dpn_blk_p, selectedDetail.waste_dpn_blk_l, selectedDetail.waste_dpn_blk_t, selectedDetail.waste_dpn_blk_qty)}</div>
                    <div><span className="block text-gray-500 text-xs">Waste Produksi (PxLxTxQty)</span>{renderDim(selectedDetail.waste_produksi_p, selectedDetail.waste_produksi_l, selectedDetail.waste_produksi_t, selectedDetail.waste_produksi_qty)}</div>
                    <div className="col-span-2"><span className="block text-gray-500 text-xs">Downtime</span><span className="font-bold">{selectedDetail.dt_kode ? `${selectedDetail.dt_kode} (${selectedDetail.dt_jam_awal} - ${selectedDetail.dt_jam_akhir})` : '-'}</span></div>
                  </div>
                </div>
              </div>

              {/* Level 2 (Multi-WO) */}
              <div>
                <h4 className="font-bold text-lg mb-4 text-accent-blue border-b pb-2">III. Level 2 (Horizontal / Carousel)</h4>

                {selectedDetail.carousel_items && selectedDetail.carousel_items.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {selectedDetail.carousel_items.map((item, idx) => (
                      <div key={idx} className={`p-4 border rounded-lg ${prefs.darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                        <h5 className="font-bold text-md mb-2 flex items-center justify-between">
                          <span className="text-purple-500">WO: {item.no_wo || '-'} {item.keterangan ? <span className="text-gray-400 text-xs italic font-normal ml-2">({item.keterangan})</span> : ''}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status}
                          </span>
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-3">
                          <div><span className="block text-gray-500 text-xs">Mesin</span><span className="font-bold">{item.tipe_mesin} ({item.no_mesin})</span></div>
                          {item.tipe_mesin === 'Carousel' && <div><span className="block text-gray-500 text-xs">No Disk</span><span className="font-bold">{item.no_disk || '-'}</span></div>}
                          <div><span className="block text-gray-500 text-xs">Hasil (PxLxTxQty)</span>{renderDim(item.hasil2_p, item.hasil2_l, item.hasil2_t, item.hasil2_qty)}</div>
                          <div><span className="block text-gray-500 text-xs">Waste Kulit (PxLxTxQty)</span>{renderDim(item.waste_kulit_p, item.waste_kulit_l, item.waste_kulit_t, item.waste_kulit_qty)}</div>
                          <div><span className="block text-gray-500 text-xs">Waste Potong (PxLxTxQty)</span>{renderDim(item.waste_potong_p, item.waste_potong_l, item.waste_potong_t, item.waste_potong_qty)}</div>
                          <div><span className="block text-gray-500 text-xs">Waste Produksi (PxLxTxQty)</span>{renderDim(item.waste_produksi_p, item.waste_produksi_l, item.waste_produksi_t, item.waste_produksi_qty, item.waste_produksi_keterangan)}</div>
                          <div><span className="block text-gray-500 text-xs">Sispot (PxLxTxQty)</span>{renderDim(item.sispot_p, item.sispot_l, item.sispot_t, item.sispot_qty, item.sispot_keterangan)}</div>
                          <div className="col-span-2"><span className="block text-gray-500 text-xs">Downtime</span><span className="font-bold">{item.dt_kode ? `${item.dt_kode} (${item.dt_jam_awal} - ${item.dt_jam_akhir})` : '-'}</span></div>
                          {item.status === 'Reject' && (
                            <div className="col-span-2"><span className="block text-red-400 text-xs">Alasan Reject</span><span className="font-bold text-red-500">{item.alasan_reject}</span></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Tidak ada data Level 2</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT MODAL */}
      {alertModal.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 ${prefs.darkMode ? 'bg-slate-900 text-white' : 'bg-white'}`}>
            <h3 className="text-xl font-bold text-red-500 flex items-center gap-2 border-b border-red-100 pb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">!</span>
              Peringatan Gagal Simpan
            </h3>
            <div className={`text-sm whitespace-pre-line ${prefs.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {alertModal.message}
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setAlertModal({ show: false, message: '' })}
                className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                Oke, Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRM MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 ${prefs.darkMode ? 'bg-slate-900 text-white' : 'bg-white'}`}>
            <h3 className="text-xl font-bold text-red-500 flex items-center gap-2 border-b border-red-100 pb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                <Trash2 size={16} />
              </span>
              Konfirmasi Hapus
            </h3>
            <div className={`text-sm whitespace-pre-line ${prefs.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {confirmModal.message}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setConfirmModal({ show: false, message: '', onConfirm: null })}
                className={`px-4 py-2 font-bold rounded-lg transition-colors ${prefs.darkMode ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Realisasi;
