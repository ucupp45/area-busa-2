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

const emptyCarouselItem = {
  no_mesin: 'H1',
  tipe_mesin: 'Horizontal',
  no_disk: '',
  no_wo: '',
  keterangan: '',
  hasil2_p: '', hasil2_l: '', hasil2_t: '', hasil2_qty: '',
  status: 'OK', alasan_reject: '',
  waste_kulit_t: '', waste_kulit_qty: '',
  sispot_p: '', sispot_l: '', sispot_t: '', sispot_qty: '', sispot_keterangan: '',
  waste_potong_t: '', waste_potong_qty: '',
  waste_produksi_t: '', waste_produksi_qty: '',
  dt_kode: '', dt_jam_awal: '', dt_jam_akhir: '', dt_keterangan: ''
};

const initialFormState = {
  // Identitas
  kualitas: '', no_barcode: '', tanggal: '', no_spk: '', nama_operator: '', shift: 'Shift 1', grup: 'Grup A',
  asal_p: '', asal_l: '', asal_t: '', asal_qty: '', keterangan_kondisi: '',
  // Vertical
  no_mesin: 'V1',
  hasil_p: '', hasil_l: '', hasil_t: '', hasil_qty: '',
  waste_samping_p: '', waste_samping_l: '', waste_samping_t: '', waste_samping_qty: '',
  waste_dpn_blk_p: '', waste_dpn_blk_l: '', waste_dpn_blk_t: '', waste_dpn_blk_qty: '',
  sisa_p: '', sisa_l: '', sisa_t: '', sisa_qty: '', sisa_keterangan: '',
  dt_kode: '', dt_jam_awal: '', dt_jam_akhir: '', dt_keterangan: '',
  // Carousel Array
  carousel_items: [ { ...emptyCarouselItem } ]
};

const Realisasi = () => {
  const { prefs } = useSettings();
  const [activeTab, setActiveTab] = useState('input');
  const [formData, setFormData] = useState(initialFormState);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [alertModal, setAlertModal] = useState({ show: false, message: '' });
  
  const [realisasiData, setRealisasiData] = useState([]);
  const [activeWOs, setActiveWOs] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [selectedDetail, setSelectedDetail] = useState(null);

  const calculateDurationMinutes = (start, end) => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // Handle over-midnight case
    return diff + ' mnt';
  };

  const [filterDate, setFilterDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (activeTab === 'table') {
      fetchData();
    } else {
      fetchActiveWOs();
    }
  }, [activeTab]);

  const fetchActiveWOs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/spk/wo/active');
      setActiveWOs(res.data);
    } catch (error) {
      console.error('Error fetching active WOs:', error);
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
      if (!filterDate) return true;
      const rowDate = new Date(row.tanggal).setHours(0,0,0,0);
      const targetDate = new Date(filterDate).setHours(0,0,0,0);
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
            'Lv2 Hasil P': item.hasil_p,
            'Lv2 Hasil L': item.hasil_l,
            'Lv2 Hasil T': item.hasil_t,
            'Lv2 Hasil Qty': item.hasil_qty,
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
      
      // Auto-fill logic for Waste Vertical Dimensions
      if (['asal_p', 'asal_l', 'asal_t'].includes(name)) {
        if (name === 'asal_p') updated.waste_samping_p = value;
        if (name === 'asal_t') {
          updated.waste_samping_l = value;
          updated.waste_dpn_blk_l = value;
        }
        if (name === 'asal_l') updated.waste_dpn_blk_p = value;
      }
      
      // Auto-calculate Sisa Potong
      const dims = ['p', 'l', 't', 'qty'];
      dims.forEach(d => {
        const asal = Number(updated[`asal_${d}`] || 0);
        const hasil = Number(updated[`hasil_${d}`] || 0);
        const ws = Number(updated[`waste_samping_${d}`] || 0);
        const wd = Number(updated[`waste_dpn_blk_${d}`] || 0);
        const sum = hasil + ws + wd;
        
        if (asal > 0 && sum > 0 && asal > sum) {
          const diff = asal - sum;
          updated[`sisa_${d}`] = Number.isInteger(diff) ? diff.toString() : diff.toFixed(2);
        } else if (sum >= asal) {
          // Kosongkan sisa potong jika jumlah >= asal
          updated[`sisa_${d}`] = '';
        }
      });
      
      return updated;
    });
  };

  const handleCarouselChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.carousel_items];
    newItems[index][name] = value;
    
    // Auto clear no_disk if tipe_mesin is not Carousel
    if (name === 'tipe_mesin' && value !== 'Carousel') {
      newItems[index].no_disk = '';
    }

    setFormData(prev => ({ ...prev, carousel_items: newItems }));
  };

  const handleWoSelect = (index, value) => {
    const newItems = [...formData.carousel_items];
    newItems[index].no_wo = value;
    
    // Auto fill
    const woData = activeWOs.find(w => w.no_wo === value);
    if (woData) {
      newItems[index].hasil2_t = woData.ukuran_t || '';
      const sisaQty = Number(woData.qty_cutting) - Number(woData.qty_terpenuhi);
      newItems[index].hasil2_qty = sisaQty > 0 ? sisaQty : 0;
    }
    
    setFormData(prev => ({ ...prev, carousel_items: newItems }));
  };

  const addWO = () => {
    setFormData(prev => ({
      ...prev,
      carousel_items: [...prev.carousel_items, { ...emptyCarouselItem }]
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation Waste Vertical vs Asal Balokan
    const errors = [];
    if (formData.asal_p && Number(formData.waste_samping_p || 0) !== Number(formData.asal_p || 0)) {
        errors.push("Panjang Waste Samping Kiri Kanan harus sama dengan Panjang Balok Asal.");
    }
    if (formData.asal_t && Number(formData.waste_samping_l || 0) !== Number(formData.asal_t || 0)) {
        errors.push("Lebar Waste Samping Kiri Kanan harus sama dengan Tinggi Balok Asal.");
    }
    if (formData.asal_l && Number(formData.waste_dpn_blk_p || 0) !== Number(formData.asal_l || 0)) {
        errors.push("Panjang Waste Depan Belakang harus sama dengan Lebar Balok Asal.");
    }
    if (formData.asal_t && Number(formData.waste_dpn_blk_l || 0) !== Number(formData.asal_t || 0)) {
        errors.push("Lebar Waste Depan Belakang harus sama dengan Tinggi Balok Asal.");
    }

    const dimsMap = { p: 'Panjang', l: 'Lebar', t: 'Tinggi', qty: 'Qty' };
    ['p', 'l', 't', 'qty'].forEach(d => {
      const asal = Number(formData[`asal_${d}`] || 0);
      const hasil = Number(formData[`hasil_${d}`] || 0);
      const ws = Number(formData[`waste_samping_${d}`] || 0);
      const wd = Number(formData[`waste_dpn_blk_${d}`] || 0);
      const sum = hasil + ws + wd;
      
      if (asal > 0 && sum > asal) {
        errors.push(`Total penjumlahan ${dimsMap[d]} (Hasil + Waste) = ${sum} melebihi Balok Asal = ${asal}.`);
      }
    });

    if (errors.length > 0) {
        setAlertModal({ 
            show: true, 
            message: `Terdapat ketidaksesuaian data:\n\n- ` + errors.join('\n- ') 
        });
        return;
    }

    // Front-end Kubikasi Validation
    let totalDemandT = 0;
    formData.carousel_items.forEach(item => {
      totalDemandT += (Number(item.hasil2_t || 0) * Number(item.hasil2_qty || 0)) +
                      Number(item.waste_kulit_t || 0) +
                      Number(item.waste_potong_t || 0) +
                      Number(item.waste_produksi_t || 0) +
                      Number(item.sispot_t || 0);
    });

    const sbHeight = Number(formData.hasil_t || 0);
    
    if (totalDemandT > sbHeight) {
      setAlertModal({ 
        show: true, 
        message: `Ketinggian total demand WO dan Waste (${totalDemandT.toFixed(2)}) melebihi ketersediaan tinggi SB Vertical (${sbHeight.toFixed(2)}). Mohon cek kembali input Anda.` 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/realisasi/${editId}`, formData);
        showNotification('Data realisasi berhasil diperbarui!', 'success');
      } else {
        await axios.post('http://localhost:5000/api/realisasi', formData);
        showNotification('Data realisasi berhasil disimpan!', 'success');
      }
      setFormData(initialFormState);
      setEditId(null);
      fetchActiveWOs(); // Refresh WO quantities
      if (editId) setActiveTab('table'); // Go back to table after edit
    } catch (error) {
      console.error('Error submit realisasi:', error);
      showNotification(error.response?.data?.message || 'Gagal menyimpan data', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (row) => {
    const editedForm = {
      kualitas: row.kualitas || '', no_barcode: row.no_barcode || '', 
      tanggal: new Date(row.tanggal).toISOString().split('T')[0], 
      no_spk: row.no_spk || '', nama_operator: row.nama_operator || '', 
      shift: row.shift || 'Shift 1', grup: row.grup || 'Grup A',
      asal_p: row.asal_p || '', asal_l: row.asal_l || '', asal_t: row.asal_t || '', asal_qty: row.asal_qty || '', keterangan_kondisi: row.keterangan_kondisi || '',
      
      no_mesin: row.v_no_mesin || 'V1',
      hasil_p: row.v_hasil_p || '', hasil_l: row.v_hasil_l || '', hasil_t: row.v_hasil_t || '', hasil_qty: row.v_hasil_qty || '',
      waste_samping_p: row.waste_samping_p || '', waste_samping_l: row.waste_samping_l || '', waste_samping_t: row.waste_samping_t || '', waste_samping_qty: row.waste_samping_qty || '',
      waste_dpn_blk_p: row.waste_dpn_blk_p || '', waste_dpn_blk_l: row.waste_dpn_blk_l || '', waste_dpn_blk_t: row.waste_dpn_blk_t || '', waste_dpn_blk_qty: row.waste_dpn_blk_qty || '',
      sisa_p: row.sisa_p || '', sisa_l: row.sisa_l || '', sisa_t: row.sisa_t || '', sisa_qty: row.sisa_qty || '', sisa_keterangan: row.sisa_keterangan || '',
      dt_kode: row.dt_kode || '', dt_jam_awal: row.dt_jam_awal || '', dt_jam_akhir: row.dt_jam_akhir || '', dt_keterangan: row.dt_keterangan || '',
      
      carousel_items: row.carousel_items && row.carousel_items.length > 0 ? row.carousel_items.map(c => ({
        no_mesin: c.no_mesin || 'H1',
        tipe_mesin: c.tipe_mesin || 'Horizontal',
        no_disk: c.no_disk || '',
        no_wo: c.no_wo || '',
        keterangan: c.keterangan || '',
        hasil2_p: c.hasil_p || '', hasil2_l: c.hasil_l || '', hasil2_t: c.hasil_t || '', hasil2_qty: c.hasil_qty || '',
        status: c.status || 'OK', alasan_reject: c.alasan_reject || '',
        waste_kulit_t: c.waste_kulit_t || '', waste_kulit_qty: c.waste_kulit_qty || '',
        sispot_p: c.sispot_p || '', sispot_l: c.sispot_l || '', sispot_t: c.sispot_t || '', sispot_qty: c.sispot_qty || '', sispot_keterangan: c.sispot_keterangan || '',
        waste_potong_t: c.waste_potong_t || '', waste_potong_qty: c.waste_potong_qty || '',
        waste_produksi_t: c.waste_produksi_t || '', waste_produksi_qty: c.waste_produksi_qty || '',
        dt_kode: c.dt_kode || '', dt_jam_awal: c.dt_jam_awal || '', dt_jam_akhir: c.dt_jam_akhir || '', dt_keterangan: c.dt_keterangan || ''
      })) : [{ ...emptyCarouselItem }]
    };

    setFormData(editedForm);
    setEditId(row.id);
    setActiveTab('input');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data realisasi ini? Aksi ini tidak dapat dibatalkan.')) {
      try {
        await axios.delete(`http://localhost:5000/api/realisasi/${id}`);
        showNotification('Data realisasi berhasil dihapus!', 'success');
        fetchData();
        fetchActiveWOs();
      } catch (error) {
        console.error('Error deleting:', error);
        showNotification('Gagal menghapus data', 'error');
      }
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const labelClass = `block text-xs font-semibold mb-1 ${prefs.darkMode ? 'text-gray-300' : 'text-gray-600'}`;
  const inputClass = `w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-accent-blue transition-all ${
    prefs.darkMode 
      ? 'bg-[#1e293b] border-slate-600 text-white focus:border-accent-blue' 
      : 'bg-white border-gray-300 text-gray-800 focus:border-accent-blue'
  }`;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 relative">
      
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
          <button onClick={() => { setActiveTab('input'); if(activeTab !== 'input' && !editId) setFormData(initialFormState); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'input' ? 'bg-accent-blue text-navy-dark shadow' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
            <PlusCircle size={16} /> Form Input
          </button>
          <button onClick={() => { setActiveTab('table'); setEditId(null); setFormData(initialFormState); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'table' ? 'bg-accent-blue text-navy-dark shadow' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
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
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div><label className={labelClass}>Kualitas</label><input required type="text" name="kualitas" value={formData.kualitas} onChange={handleChange} className={inputClass} placeholder="Contoh: LBR R 100" /></div>
              <div><label className={labelClass}>No Barcode</label><input required type="text" name="no_barcode" value={formData.no_barcode} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>Tanggal</label><input required type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>No SPK</label><input required type="text" name="no_spk" value={formData.no_spk} onChange={handleChange} className={inputClass} /></div>
              
              <div><label className={labelClass}>Nama Operator</label><input required type="text" name="nama_operator" value={formData.nama_operator} onChange={handleChange} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Shift</label>
                <select name="shift" value={formData.shift} onChange={handleChange} className={inputClass}>
                  <option value="Shift 1">Shift 1</option>
                  <option value="Shift 2">Shift 2</option>
                  <option value="Shift 3">Shift 3</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Grup</label>
                <select name="grup" value={formData.grup} onChange={handleChange} className={inputClass}>
                  <option value="Grup A">Grup A</option>
                  <option value="Grup B">Grup B</option>
                  <option value="Grup C">Grup C</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Ukuran Asal (P x L x T x Qty)</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" name="asal_p" value={formData.asal_p} onChange={handleChange} placeholder="P" className={inputClass} />
                  <input type="number" step="0.01" name="asal_l" value={formData.asal_l} onChange={handleChange} placeholder="L" className={inputClass} />
                  <input type="number" step="0.01" name="asal_t" value={formData.asal_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="asal_qty" value={formData.asal_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
              </div>
              
              <div className="md:col-span-2"><label className={labelClass}>Keterangan Kondisi Busa</label><textarea name="keterangan_kondisi" value={formData.keterangan_kondisi} onChange={handleChange} className={`${inputClass} h-10`} placeholder="Jebol/Sobek/dll" /></div>
            </div>
          </div>

          {/* SECTION 2: VERTICAL */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
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
                  <input required type="number" step="0.01" name="hasil_p" value={formData.hasil_p} onChange={handleChange} placeholder="P" className={inputClass} />
                  <input required type="number" step="0.01" name="hasil_l" value={formData.hasil_l} onChange={handleChange} placeholder="L" className={inputClass} />
                  <input required type="number" step="0.01" name="hasil_t" value={formData.hasil_t} onChange={handleChange} placeholder="T (SB)" title="Tinggi Short Block" className={`${inputClass} border-blue-500 font-bold`} />
                  <input required type="number" name="hasil_qty" value={formData.hasil_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
              </div>
              
              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Waste Samping Kiri Kanan (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="0.01" name="waste_samping_p" value={formData.waste_samping_p} onChange={handleChange} placeholder="P" title="Auto: = Panjang Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="0.01" name="waste_samping_l" value={formData.waste_samping_l} onChange={handleChange} placeholder="L" title="Auto: = Tinggi Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="0.01" name="waste_samping_t" value={formData.waste_samping_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="waste_samping_qty" value={formData.waste_samping_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Waste Depan Belakang (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="0.01" name="waste_dpn_blk_p" value={formData.waste_dpn_blk_p} onChange={handleChange} placeholder="P" title="Auto: = Lebar Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="0.01" name="waste_dpn_blk_l" value={formData.waste_dpn_blk_l} onChange={handleChange} placeholder="L" title="Auto: = Tinggi Asal" className={`${inputClass} border-amber-300`} />
                  <input type="number" step="0.01" name="waste_dpn_blk_t" value={formData.waste_dpn_blk_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="waste_dpn_blk_qty" value={formData.waste_dpn_blk_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className={labelClass}>Sisa Potongan (P x L x T x Qty)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" step="0.01" name="sisa_p" value={formData.sisa_p} onChange={handleChange} placeholder="P" className={inputClass} />
                  <input type="number" step="0.01" name="sisa_l" value={formData.sisa_l} onChange={handleChange} placeholder="L" className={inputClass} />
                  <input type="number" step="0.01" name="sisa_t" value={formData.sisa_t} onChange={handleChange} placeholder="T" className={inputClass} />
                  <input type="number" name="sisa_qty" value={formData.sisa_qty} onChange={handleChange} placeholder="Qty" className={inputClass} />
                </div>
                <input type="text" name="sisa_keterangan" value={formData.sisa_keterangan} onChange={handleChange} placeholder="Keterangan Sisa Potongan..." className={`${inputClass} mt-2`} />
              </div>

              <div className="col-span-1 lg:col-span-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                <label className={`${labelClass} text-red-700 dark:text-red-400 font-bold flex items-center gap-2 mb-2`}>
                  <AlertCircle size={16} /> Downtime (Kode, Jam, Ket)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <select name="dt_kode" value={formData.dt_kode} onChange={handleChange} className={`${inputClass} col-span-1`}>
                    <option value="">Kode</option>
                    {downtimeOptions.map((opt, i) => (
                      <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input type="time" name="dt_jam_awal" value={formData.dt_jam_awal} onChange={handleChange} className={`${inputClass} col-span-1`} />
                  <input type="time" name="dt_jam_akhir" value={formData.dt_jam_akhir} onChange={handleChange} className={`${inputClass} col-span-1`} />
                  <input type="text" value={calculateDurationMinutes(formData.dt_jam_awal, formData.dt_jam_akhir)} readOnly placeholder="Durasi" className={`${inputClass} col-span-1 bg-white/50 font-bold text-center text-red-600 dark:text-red-400`} />
                  <input type="text" name="dt_keterangan" value={formData.dt_keterangan} onChange={handleChange} placeholder="Keterangan..." className={`${inputClass} col-span-1`} />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 3: CAROUSEL / HORIZONTAL MULTI-WO */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b font-bold flex items-center justify-between gap-2 ${prefs.darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-gray-50 text-navy-dark'}`}>
              <span>Bagian III: Proses Level 2 (Horizontal / Carousel) - Multi WO</span>
              <button type="button" onClick={addWO} className="flex items-center gap-1 text-xs px-3 py-1 bg-accent-blue text-navy-dark rounded hover:bg-opacity-80">
                <Plus size={14} /> Tambah WO
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-6 bg-gray-50 dark:bg-[#0f172a]/50">
              {formData.carousel_items.map((item, index) => (
                <div key={index} className={`relative p-4 border rounded-lg shadow-sm ${prefs.darkMode ? 'bg-[#1e293b] border-slate-600' : 'bg-white border-gray-200'}`}>
                  {index > 0 && (
                    <button type="button" onClick={() => removeWO(index)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-50 rounded-full dark:hover:bg-red-900/20" title="Hapus WO">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <h4 className="font-bold text-accent-blue mb-4 border-b pb-2">Item WO #{index + 1}</h4>
                  
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
                        <label className={labelClass}>No Disk</label>
                        <input type="text" name="no_disk" value={item.no_disk} onChange={(e) => handleCarouselChange(index, e)} placeholder="Nomor Disk" className={`${inputClass} border-purple-400 bg-purple-50 dark:bg-purple-900/20`} />
                      </div>
                    )}

                    <div className="col-span-1 lg:col-span-4">
                      <label className={labelClass}>No WO</label>
                      <input 
                        list={`wo-list-${index}`}
                        name="no_wo" 
                        value={item.no_wo} 
                        onChange={(e) => handleWoSelect(index, e.target.value)} 
                        className={inputClass} 
                        placeholder="Ketik & Pilih WO dari Planning..." 
                      />
                      <datalist id={`wo-list-${index}`}>
                        {activeWOs.map((wo, wIdx) => (
                          <option key={wIdx} value={wo.no_wo} />
                        ))}
                      </datalist>
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

                    <div className="col-span-1 lg:col-span-4">
                      <label className={labelClass}>Hasil Cutting (P x L x T x Qty)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" step="0.01" name="hasil2_p" value={item.hasil2_p} onChange={(e) => handleCarouselChange(index, e)} placeholder="P" className={inputClass} />
                        <input type="number" step="0.01" name="hasil2_l" value={item.hasil2_l} onChange={(e) => handleCarouselChange(index, e)} placeholder="L" className={inputClass} />
                        <input type="number" step="0.01" name="hasil2_t" value={item.hasil2_t} onChange={(e) => handleCarouselChange(index, e)} placeholder="T" title="Otomatis dari WO" className={`${inputClass} border-blue-400`} />
                        <input type="number" name="hasil2_qty" value={item.hasil2_qty} onChange={(e) => handleCarouselChange(index, e)} placeholder="Qty" title="Otomatis dari Sisa WO" className={`${inputClass} border-blue-400`} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-4">
                      <label className={labelClass}>Waste Kulit (T x Qty)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" step="0.01" name="waste_kulit_t" value={item.waste_kulit_t} onChange={(e) => handleCarouselChange(index, e)} placeholder="T" className={inputClass} />
                        <input type="number" name="waste_kulit_qty" value={item.waste_kulit_qty} onChange={(e) => handleCarouselChange(index, e)} placeholder="Qty" className={inputClass} />
                      </div>
                    </div>
                    
                    <div className="col-span-1 lg:col-span-6">
                      <label className={labelClass}>Sispot (P x L x T x Qty) & Keterangan</label>
                      <div className="grid grid-cols-6 gap-2">
                        <input type="number" step="0.01" name="sispot_p" value={item.sispot_p} onChange={(e) => handleCarouselChange(index, e)} placeholder="P" className={inputClass} />
                        <input type="number" step="0.01" name="sispot_l" value={item.sispot_l} onChange={(e) => handleCarouselChange(index, e)} placeholder="L" className={inputClass} />
                        <input type="number" step="0.01" name="sispot_t" value={item.sispot_t} onChange={(e) => handleCarouselChange(index, e)} placeholder="T" className={inputClass} />
                        <input type="number" name="sispot_qty" value={item.sispot_qty} onChange={(e) => handleCarouselChange(index, e)} placeholder="Qty" className={inputClass} />
                        <input type="text" name="sispot_keterangan" value={item.sispot_keterangan} onChange={(e) => handleCarouselChange(index, e)} placeholder="Keterangan..." className={`${inputClass} col-span-2`} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-3">
                      <label className={labelClass}>Waste Potong (T x Qty)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" step="0.01" name="waste_potong_t" value={item.waste_potong_t} onChange={(e) => handleCarouselChange(index, e)} placeholder="T" className={inputClass} />
                        <input type="number" name="waste_potong_qty" value={item.waste_potong_qty} onChange={(e) => handleCarouselChange(index, e)} placeholder="Qty" className={inputClass} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-3">
                      <label className={labelClass}>Waste Produksi (T x Qty)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" step="0.01" name="waste_produksi_t" value={item.waste_produksi_t} onChange={(e) => handleCarouselChange(index, e)} placeholder="T" className={inputClass} />
                        <input type="number" name="waste_produksi_qty" value={item.waste_produksi_qty} onChange={(e) => handleCarouselChange(index, e)} placeholder="Qty" className={inputClass} />
                      </div>
                    </div>

                    <div className="col-span-1 lg:col-span-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                      <label className={`${labelClass} text-red-700 dark:text-red-400 font-bold flex items-center gap-2 mb-2`}>
                        <AlertCircle size={16} /> Downtime (Kode, Jam, Ket)
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        <select name="dt_kode" value={item.dt_kode} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} col-span-1`}>
                          <option value="">Kode</option>
                          {downtimeOptions.map((opt, i) => (
                            <option key={i} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input type="time" name="dt_jam_awal" value={item.dt_jam_awal} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} col-span-1`} />
                        <input type="time" name="dt_jam_akhir" value={item.dt_jam_akhir} onChange={(e) => handleCarouselChange(index, e)} className={`${inputClass} col-span-1`} />
                        <input type="text" value={calculateDurationMinutes(item.dt_jam_awal, item.dt_jam_akhir)} readOnly placeholder="Durasi" className={`${inputClass} col-span-1 bg-white/50 font-bold text-center text-red-600 dark:text-red-400`} />
                        <input type="text" name="dt_keterangan" value={item.dt_keterangan} onChange={(e) => handleCarouselChange(index, e)} placeholder="Keterangan..." className={`${inputClass} col-span-1`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setFormData(initialFormState);
                  setActiveTab('table');
                }}
                className="px-6 py-3 font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-slate-700 dark:text-gray-400"
              >
                Batal Edit
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 bg-accent-blue text-navy-dark font-bold px-8 py-3 rounded-lg shadow hover:bg-opacity-90 transition-all disabled:opacity-50 ${!editId && 'ml-auto'}`}
            >
              {isSubmitting ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
              {isSubmitting ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Submit Realisasi')}
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: DATA TABEL */}
      {activeTab === 'table' && (
        <div className={`flex flex-col gap-4 rounded-xl shadow-sm border overflow-hidden ${prefs.darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between ${prefs.darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-gray-50 text-navy-dark'}`}>
            <h3 className="font-bold flex items-center gap-2">Data History Realisasi</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Pilih Tanggal:</span>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={inputClass} title="Pilih Tanggal" />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="p-2 text-red-500 hover:bg-red-50 rounded-md" title="Reset Filter">
                  <X size={16} />
                </button>
              )}
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
                      <td className="p-4 text-gray-600 dark:text-gray-400">{row.nama_operator} ({row.shift} - {row.grup})</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedDetail(row)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors dark:bg-blue-900/30 dark:hover:bg-blue-900/50" title="Lihat Detail">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleEdit(row)} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-md transition-colors dark:bg-amber-900/30 dark:hover:bg-amber-900/50" title="Edit Data">
                            <Edit size={16} />
                          </button>
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
                    <div><span className="block text-gray-500 text-xs">Hasil (PxLxTxQty)</span><span className="font-bold">{selectedDetail.v_hasil_p}x{selectedDetail.v_hasil_l}x{selectedDetail.v_hasil_t} ({selectedDetail.v_hasil_qty})</span></div>
                    <div><span className="block text-gray-500 text-xs">Sisa Potong (PxLxTxQty)</span><span className="font-bold">{selectedDetail.sisa_p}x{selectedDetail.sisa_l}x{selectedDetail.sisa_t} ({selectedDetail.sisa_qty})<br/><span className="text-gray-400 italic text-xs">{selectedDetail.sisa_keterangan}</span></span></div>
                    <div><span className="block text-gray-500 text-xs">Waste Samping Kiri Kanan (PxLxTxQty)</span><span className="font-bold">{selectedDetail.waste_samping_p}x{selectedDetail.waste_samping_l}x{selectedDetail.waste_samping_t} ({selectedDetail.waste_samping_qty})</span></div>
                    <div><span className="block text-gray-500 text-xs">Waste Depan Belakang (PxLxTxQty)</span><span className="font-bold">{selectedDetail.waste_dpn_blk_p}x{selectedDetail.waste_dpn_blk_l}x{selectedDetail.waste_dpn_blk_t} ({selectedDetail.waste_dpn_blk_qty})</span></div>
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
                          <span className="text-purple-500">WO: {item.no_wo || '-'}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status}
                          </span>
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-3">
                          <div><span className="block text-gray-500 text-xs">Mesin</span><span className="font-bold">{item.tipe_mesin} ({item.no_mesin})</span></div>
                          {item.tipe_mesin === 'Carousel' && <div><span className="block text-gray-500 text-xs">No Disk</span><span className="font-bold">{item.no_disk || '-'}</span></div>}
                          <div><span className="block text-gray-500 text-xs">Hasil (PxLxTxQty)</span><span className="font-bold">{item.hasil_p}x{item.hasil_l}x{item.hasil_t} ({item.hasil_qty})</span></div>
                          <div><span className="block text-gray-500 text-xs">Sispot (PxLxTxQty)</span><span className="font-bold">{item.sispot_p}x{item.sispot_l}x{item.sispot_t} ({item.sispot_qty})<br/><span className="text-gray-400 italic text-xs">{item.sispot_keterangan}</span></span></div>
                          <div><span className="block text-gray-500 text-xs">Waste Kulit (TxQty)</span><span className="font-bold">{item.waste_kulit_t} ({item.waste_kulit_qty}x)</span></div>
                          <div><span className="block text-gray-500 text-xs">Waste Potong (TxQty)</span><span className="font-bold">{item.waste_potong_t} ({item.waste_potong_qty}x)</span></div>
                          <div><span className="block text-gray-500 text-xs">Waste Produksi (TxQty)</span><span className="font-bold">{item.waste_produksi_t} ({item.waste_produksi_qty}x)</span></div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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

    </div>
  );
};

export default Realisasi;
