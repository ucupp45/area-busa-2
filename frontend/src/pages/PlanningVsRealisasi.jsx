import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { TrendingUp, Activity, Calendar, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, LabelList } from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { toJpeg, toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Download, FileImage, FileText } from 'lucide-react';

const PlanningVsRealisasi = () => {
  const { prefs } = useSettings();
  const isDark = prefs.darkMode;
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const isSuperadmin = user?.role === 'Superadmin';
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [tableDate, setTableDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('wo');
  const [woData, setWoData] = useState([]);
  const [planEfisiensi, setPlanEfisiensi] = useState(null);
  const [realisasiData, setRealisasiData] = useState([]);
  const [chartSpkData, setChartSpkData] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  
  const [keterangan, setKeterangan] = useState({});
  const chartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToJPG = async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toJpeg(chartRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Tren_Realisasi_${startDate}_to_${endDate}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal export JPG", err);
      alert("Gagal export JPG: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    try {
      const node = chartRef.current;
      const dataUrl = await toPng(node, { pixelRatio: 2 });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (node.offsetHeight * pdfWidth) / node.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Tren_Realisasi_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error("Gagal export PDF", err);
      alert("Gagal export PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch Data for Charts
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const [chartRes, realRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/spk/chart?startDate=${startDate}&endDate=${endDate}`),
          axios.get(`http://localhost:5000/api/realisasi`)
        ]);
        setChartSpkData(chartRes.data || []);
        setRealisasiData(realRes.data || []);
      } catch (err) {
        console.error("Error fetching chart data:", err);
      }
    };
    fetchChartData();
  }, [startDate, endDate]);

  // Fetch Data for Tables
  useEffect(() => {
    const fetchTableData = async () => {
      setLoading(true);
      try {
        const [woRes, planRes, matrixRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/spk/wo/active?startDate=${tableDate}&endDate=${tableDate}&include_fulfilled=true`),
          axios.get(`http://localhost:5000/api/spk/efisiensi?startDate=${tableDate}&endDate=${tableDate}`),
          axios.get(`http://localhost:5000/api/matrix`)
        ]);
        
        setWoData(woRes.data || []);
        setPlanEfisiensi(planRes.data);
        setMatrixData(matrixRes.data || []);
      } catch (err) {
        console.error("Error fetching table data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTableData();
  }, [tableDate]);

  const handleKeteranganChange = (id, val) => {
      setKeterangan(prev => ({...prev, [id]: val}));
  };

  // Compute Table 1
  const table1Data = useMemo(() => {
     return woData.map((item, idx) => {
         const plan = Number(item.qty_cutting) || 0;
         const real = Number(item.qty_terpenuhi) || 0;
         const pct = plan > 0 ? ((real / plan) * 100).toFixed(1) : 0;
         let stat = 'Active';
         if (real >= plan) stat = 'Fulfilled';
         else if (real > 0) stat = 'Partial';
         return { ...item, plan, real, pct, stat, id: item.no_wo || idx };
     });
  }, [woData]);

  const todayRealisasi = useMemo(() => {
     return realisasiData.filter(r => {
        if (!r.tanggal) return false;
        const d = new Date(r.tanggal);
        const rStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return rStr === tableDate;
     });
  }, [realisasiData, tableDate]);

  // Compute Table 2
  const table2Data = useMemo(() => {
     if (!planEfisiensi?.itemDetails) return [];
     
     const groupedPlan = {};
     planEfisiensi.itemDetails.forEach(item => {
         // Normalize string to match format: "QUALITY (PxLxT)"
         const cleanName = item.nama_item.toUpperCase()
            .replace(/\s*X\s*/g, 'X')
            .replace(/\(\s*/, '(')
            .replace(/\s*\)/, ')')
            .trim();
         
         if (!groupedPlan[cleanName]) groupedPlan[cleanName] = 0;
         groupedPlan[cleanName] += (Number(item.total_sb) || 0);
     });

     const groupedReal = {};
     todayRealisasi.forEach(r => {
         const kualitas = (r.kualitas || '').trim().toUpperCase();
         
         const cleanName = kualitas;
         if (!cleanName) return; // Skip if empty
         
         if (!groupedReal[cleanName]) groupedReal[cleanName] = 0;
         groupedReal[cleanName] += (Number(r.v_hasil_qty) || 0);
     });

     const result = [];
     Object.keys(groupedPlan).forEach((key, idx) => {
         // Show up to 1 decimal place for planning SB
         const rawPlan = groupedPlan[key];
         const plan = rawPlan % 1 !== 0 ? Number(rawPlan.toFixed(1)) : rawPlan;
         
         const real = groupedReal[key] || 0;
         const pct = plan > 0 ? ((real / plan) * 100).toFixed(1) : 0;
         result.push({ nama_item: key, plan, real, pct, id: `tb2-${idx}` });
     });

     Object.keys(groupedReal).forEach((key, idx) => {
         if (groupedPlan[key] === undefined) {
             const real = groupedReal[key];
             result.push({ nama_item: key + ' (Unplanned)', plan: 0, real, pct: '100.0', id: `tb2-unp-${idx}` });
         }
     });

     return result;
  }, [planEfisiensi, todayRealisasi]);

  // Compute Summary Data for HZ/CR and VR
  const summaryData = useMemo(() => {
     const pV = planEfisiensi?.waktuPerMesin?.Vertikal || {waktu: 0, qty: 0};
     const pH = planEfisiensi?.waktuPerMesin?.Horizontal || {waktu: 0, qty: 0};
     const pC = planEfisiensi?.waktuPerMesin?.Carousel || {waktu: 0, qty: 0};
     
     let rV = { waktu: 0, qty: 0 };
     let rH = { waktu: 0, qty: 0 };
     let rC = { waktu: 0, qty: 0 };
     
     todayRealisasi.forEach(r => {
        const getMatrixItem = (namaItem, tipeMesin) => {
            if (!namaItem) return null;
            const cleanName = namaItem.replace(/\s+/g, '').toLowerCase();
            let matched = matrixData.find(m => m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanName && m.tipe_mesin === tipeMesin);
            if (!matched) {
                matched = matrixData.find(m => cleanName.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()) && m.tipe_mesin === tipeMesin);
            }
            return matched;
        };

        if (r.v_hasil_qty) {
            const qty = Number(r.v_hasil_qty);
            rV.qty += qty;
            const m = getMatrixItem(r.kualitas || '', 'Vertikal');
            if (m) {
                rV.waktu += qty * Number(m.cycle_time_menit);
            } else {
                rV.waktu += (qty * 7); 
            }
        }
        if (r.carousel_items) {
            r.carousel_items.forEach(c => {
                const qtyAsal = Number(r.asal_qty || 1);
                const m = getMatrixItem(r.kualitas || '', c.tipe_mesin);
                
                const calcItemCT = (t, qty) => {
                    let ptu = 0, pma = 0, pmu = 0;
                    if (!m) return 0;
                    if (c.tipe_mesin === 'Carousel') {
                        const roundupFactor = Math.ceil((qtyAsal / 6) * 100) / 100;
                        ptu = (Number(m.ct_ptu) || 0) * t * (qty / qtyAsal) * roundupFactor;
                        pma = (Number(m.ct_pma) || 0) * (qty / qtyAsal) * roundupFactor;
                    } else {
                        ptu = (Number(m.ct_ptu) || 0) * t * qty;
                        pma = (Number(m.ct_pma) || 0) * qty;
                        pmu = (Number(m.ct_pmu) || 0) * qty;
                    }
                    return ptu + pma + pmu;
                };

                const ctHasil = calcItemCT(Number(c.hasil2_t || 0), Number(c.hasil2_qty || 0));
                const ctWk = calcItemCT(Number(c.waste_kulit_t || 0), Number(c.waste_kulit_qty || 0));
                const ctWp = calcItemCT(Number(c.waste_potong_t || 0), Number(c.waste_potong_qty || 0));
                const ctWpr = calcItemCT(Number(c.waste_produksi_t || 0), Number(c.waste_produksi_qty || 0));
                const ctSp = calcItemCT(Number(c.sispot_t || 0), Number(c.sispot_qty || 0));
                
                const total_cutting_time = ctHasil + ctWk + ctWp + ctWpr + ctSp;
                
                if (c.tipe_mesin === 'Carousel') {
                    rC.qty += Number(c.hasil2_qty || 0);
                    if (m) {
                        const c1 = Number(m.ct_c1) || 0;
                        const c2 = Number(m.ct_c2) || 0;
                        const c3 = Number(m.ct_c3) || 0;
                        const distSetup = 1 / r.carousel_items.length;
                        const kebutuhanSB = qtyAsal / r.carousel_items.length;
                        rC.waktu += (c1 * distSetup) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + total_cutting_time;
                    } else {
                        rC.waktu += (Number(c.hasil2_qty || 0) * 7);
                    }
                } else {
                    rH.qty += Number(c.hasil2_qty || 0);
                    if (m) {
                        const c1 = Number(m.ct_c1) || 0;
                        const c2 = Number(m.ct_c2) || 0;
                        const c3 = Number(m.ct_c3) || 0;
                        const kebutuhanSB = qtyAsal / r.carousel_items.length;
                        rH.waktu += (c1 * kebutuhanSB) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + total_cutting_time;
                    } else {
                        rH.waktu += (Number(c.hasil2_qty || 0) * 7);
                    }
                }
            });
        }
     });

     const KELAS_MESIN = 420;

     const pV_mesin = pV.waktu > 0 ? Math.ceil(pV.waktu / KELAS_MESIN) : 0;
     const pH_mesin = pH.waktu > 0 ? Math.ceil(pH.waktu / KELAS_MESIN) : 0;
     const pC_mesin = pC.waktu > 0 ? Math.ceil(pC.waktu / KELAS_MESIN) : 0;

     const pV_manpower = pV_mesin * 4;
     const pH_manpower = pH_mesin * 4;
     const pC_manpower = pC_mesin * 4;

     const rV_mesin = rV.waktu > 0 ? Math.ceil(rV.waktu / KELAS_MESIN) : 0;
     const rH_mesin = rH.waktu > 0 ? Math.ceil(rH.waktu / KELAS_MESIN) : 0;
     const rC_mesin = rC.waktu > 0 ? Math.ceil(rC.waktu / KELAS_MESIN) : 0;

     const rV_manpower = rV_mesin * 4;
     const rH_manpower = rH_mesin * 4;
     const rC_manpower = rC_mesin * 4;

     const getPct = (real, plan) => plan > 0 ? ((real / plan) * 100).toFixed(1) : 0;

     return {
        hz_cr: {
           qtyPlan: table1Data.reduce((acc, curr) => acc + curr.plan, 0), qtyReal: table1Data.reduce((acc, curr) => acc + curr.real, 0), pctQty: getPct(table1Data.reduce((acc, curr) => acc + curr.real, 0), table1Data.reduce((acc, curr) => acc + curr.plan, 0)),
           waktuPlan: (pH.waktu + pC.waktu).toFixed(0), waktuReal: (rH.waktu + rC.waktu).toFixed(0), pctWaktu: getPct(rH.waktu + rC.waktu, pH.waktu + pC.waktu),
           mpPlan: (pH_manpower + pC_manpower), mpReal: (rH_manpower + rC_manpower), pctMp: getPct(rH_manpower + rC_manpower, pH_manpower + pC_manpower)
        },
        vr: {
           qtyPlan: Number(pV.qty).toFixed(1).replace(/\.0$/, ''), qtyReal: rV.qty, pctQty: getPct(rV.qty, pV.qty),
           waktuPlan: pV.waktu.toFixed(0), waktuReal: rV.waktu.toFixed(0), pctWaktu: getPct(rV.waktu, pV.waktu),
           mpPlan: pV_manpower, mpReal: rV_manpower, pctMp: getPct(rV_manpower, pV_manpower)
        }
     };
  }, [planEfisiensi, realisasiData, matrixData, table1Data]);

  // Compute chart data for selected range
  const getDateRange = () => {
    const days = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    // Safety check to prevent infinite loops, though validation handles this
    let maxIter = 0;
    while (current <= end && maxIter < 10) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        label: current.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      });
      current.setDate(current.getDate() + 1);
      maxIter++;
    }
    return days;
  };

  const chartData = useMemo(() => {
    // if (!realisasiData.length || !chartSpkData.length) return [];
    
    const past7Days = getDateRange();
    const KELAS_MESIN = 420;

    return past7Days.map(dayInfo => {
      // Realisasi
      const realHariIni = realisasiData.filter(r => {
          if (!r.tanggal) return false;
          const d = new Date(r.tanggal);
          const rStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return rStr === dayInfo.dateStr;
      });
      let rV_qty = 0, rH_qty = 0, rC_qty = 0;
      let rV_waktu = 0, rH_waktu = 0, rC_waktu = 0;
      realHariIni.forEach(r => {
        const getMatrixItem = (namaItem, tipeMesin) => {
            if (!namaItem) return null;
            const cleanName = namaItem.replace(/\s+/g, '').toLowerCase();
            let matched = matrixData.find(m => m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanName && m.tipe_mesin === tipeMesin);
            if (!matched) {
                matched = matrixData.find(m => cleanName.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()) && m.tipe_mesin === tipeMesin);
            }
            return matched;
        };

        if (r.v_hasil_qty) {
            const qty = Number(r.v_hasil_qty);
            rV_qty += qty;
            const m = getMatrixItem(r.kualitas || '', 'Vertikal');
            if (m) {
                rV_waktu += qty * Number(m.cycle_time_menit);
            } else {
                rV_waktu += (qty * 7);
            }
        }
        if (r.carousel_items) {
          r.carousel_items.forEach(c => {
             const qtyAsal = Number(r.asal_qty || 1);
             const m = getMatrixItem(r.kualitas || '', c.tipe_mesin);

             const calcItemCT = (t, qty) => {
                 let ptu = 0, pma = 0, pmu = 0;
                 if (!m) return 0;
                 if (c.tipe_mesin === 'Carousel') {
                     const roundupFactor = Math.ceil((qtyAsal / 6) * 100) / 100;
                     ptu = (Number(m.ct_ptu) || 0) * t * (qty / qtyAsal) * roundupFactor;
                     pma = (Number(m.ct_pma) || 0) * (qty / qtyAsal) * roundupFactor;
                 } else {
                     ptu = (Number(m.ct_ptu) || 0) * t * qty;
                     pma = (Number(m.ct_pma) || 0) * qty;
                     pmu = (Number(m.ct_pmu) || 0) * qty;
                 }
                 return ptu + pma + pmu;
             };

             const ctHasil = calcItemCT(Number(c.hasil2_t || 0), Number(c.hasil2_qty || 0));
             const ctWk = calcItemCT(Number(c.waste_kulit_t || 0), Number(c.waste_kulit_qty || 0));
             const ctWp = calcItemCT(Number(c.waste_potong_t || 0), Number(c.waste_potong_qty || 0));
             const ctWpr = calcItemCT(Number(c.waste_produksi_t || 0), Number(c.waste_produksi_qty || 0));
             const ctSp = calcItemCT(Number(c.sispot_t || 0), Number(c.sispot_qty || 0));
             
             const total_cutting_time = ctHasil + ctWk + ctWp + ctWpr + ctSp;

             if (c.tipe_mesin === 'Carousel') {
                 rC_qty += Number(c.hasil2_qty || 0);
                 if (m) {
                     const c1 = Number(m.ct_c1) || 0;
                     const c2 = Number(m.ct_c2) || 0;
                     const c3 = Number(m.ct_c3) || 0;
                     const distSetup = 1 / r.carousel_items.length;
                     const kebutuhanSB = qtyAsal / r.carousel_items.length;
                     rC_waktu += (c1 * distSetup) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + total_cutting_time;
                 } else {
                     rC_waktu += (Number(c.hasil2_qty || 0) * 7);
                 }
             } else {
                 rH_qty += Number(c.hasil2_qty || 0);
                 if (m) {
                     const c1 = Number(m.ct_c1) || 0;
                     const c2 = Number(m.ct_c2) || 0;
                     const c3 = Number(m.ct_c3) || 0;
                     const kebutuhanSB = qtyAsal / r.carousel_items.length;
                     rH_waktu += (c1 * kebutuhanSB) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + total_cutting_time;
                 } else {
                     rH_waktu += (Number(c.hasil2_qty || 0) * 7);
                 }
             }
          });
        }
      });
      const r_waktu = rV_waktu + rC_waktu + rH_waktu;
      const rV_mp = (Math.ceil(rV_waktu / KELAS_MESIN) * 4);
      const rC_mp = (Math.ceil(rC_waktu / KELAS_MESIN) * 4);
      const rH_mp = (Math.ceil(rH_waktu / KELAS_MESIN) * 4);
      const r_mp = rV_mp + rC_mp + rH_mp;

      // Planning
      const planHariIni = chartSpkData.filter(r => {
          const rDate = new Date(r.tanggal);
          const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth()+1).padStart(2,'0')}-${String(rDate.getDate()).padStart(2,'0')}`;
          return rStr === dayInfo.dateStr;
      });
      
      let pV_qty = 0, pH_qty = 0, pC_qty = 0;
      let pV_waktu = 0, pH_waktu = 0, pC_waktu = 0;
      planHariIni.forEach(spk => {
          pV_qty += Number(spk.total_sb) || 0; 
          pH_qty += Number(spk.qty_h) || 0;
          pC_qty += Number(spk.qty_c) || 0;
          pV_waktu += (Number(spk.waktu_v) || 0);
          pH_waktu += (Number(spk.waktu_h) || 0);
          pC_waktu += (Number(spk.waktu_c) || 0);
      });
      const p_waktu = pV_waktu + pH_waktu + pC_waktu;
      const pV_mp = (Math.ceil(pV_waktu / KELAS_MESIN) * 4);
      const pH_mp = (Math.ceil(pH_waktu / KELAS_MESIN) * 4);
      const pC_mp = (Math.ceil(pC_waktu / KELAS_MESIN) * 4);
      const p_mp = pV_mp + pH_mp + pC_mp;

      return {
          tanggal: dayInfo.label,
          pct_hz_cr: (pH_qty + pC_qty) > 0 ? Math.min(Number((((rH_qty + rC_qty) / (pH_qty + pC_qty)) * 100).toFixed(1)), 100) : 0,
          pct_vr: pV_qty > 0 ? Math.min(Number(((rV_qty / pV_qty) * 100).toFixed(1)), 100) : 0,
          pct_waktu: p_waktu > 0 ? Math.min(Number(((r_waktu / p_waktu) * 100).toFixed(1)), 100) : 0,
          pct_mp: p_mp > 0 ? Math.min(Number(((r_mp / p_mp) * 100).toFixed(1)), 100) : 0,
      };
    });
  }, [realisasiData, chartSpkData, startDate, endDate, matrixData]);

  // Averages for tables are removed as Pemakaian Mesin table is deleted

  return (
    <div className={`p-6 min-h-screen pb-20 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Hapus title utama agar lebih ringkas sesuai permintaan user */}
      
      {loading ? (
         <div className="flex justify-center p-12">
           <Activity className="animate-spin text-blue-500" size={32} />
         </div>
      ) : (
         <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* CHARTS CONTAINER (Selalu tampil di atas) */}
            <div ref={chartRef} className={`rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="text-green-500" /> Tren Result Planning vs Realisasi (Rentang Waktu)
                 </h2>
                 <div className="flex flex-wrap items-center gap-4" data-html2canvas-ignore="true">
                    {/* Date Picker (dipindahkan ke sini agar hemat tempat vertikal) */}
                    <div className={`flex items-center gap-2 p-1.5 rounded-lg border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                       <div className="flex items-center gap-1">
                           <Calendar className={isDark ? 'text-gray-400' : 'text-gray-500'} size={16} />
                           <input 
                             type="date" 
                             value={startDate}
                             onChange={(e) => {
                                 const val = e.target.value;
                                 const start = new Date(val);
                                 const end = new Date(endDate);
                                 const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
                                 if (start > end) {
                                     setEndDate(val);
                                 } else if (diffDays > 6) {
                                     const newEnd = new Date(start);
                                     newEnd.setDate(newEnd.getDate() + 6);
                                     setEndDate(newEnd.toISOString().split('T')[0]);
                                 }
                                 setStartDate(val);
                             }}
                             className={`border-none bg-transparent px-1 py-0.5 text-sm outline-none font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}
                           />
                       </div>
                       <span className="text-gray-400 font-bold hidden sm:inline">-</span>
                       <div className="flex items-center gap-1">
                           <input 
                             type="date" 
                             value={endDate}
                             onChange={(e) => {
                                 const val = e.target.value;
                                 const end = new Date(val);
                                 const start = new Date(startDate);
                                 const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
                                 if (end < start) {
                                     setStartDate(val);
                                 } else if (diffDays > 6) {
                                     const newStart = new Date(end);
                                     newStart.setDate(newStart.getDate() - 6);
                                     setStartDate(newStart.toISOString().split('T')[0]);
                                 }
                                 setEndDate(val);
                             }}
                             className={`border-none bg-transparent px-1 py-0.5 text-sm outline-none font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}
                           />
                       </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={exportToJPG} disabled={isExporting} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <FileImage size={16} /> {isExporting ? 'Memproses...' : 'JPG'}
                      </button>
                      <button onClick={exportToPDF} disabled={isExporting} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <FileText size={16} /> {isExporting ? 'Memproses...' : 'PDF'}
                      </button>
                    </div>
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart A */}
                  <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                     <h3 className="font-bold text-sm mb-4 text-center text-blue-500">WO & QTY</h3>
                     <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                             <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} domain={[0, dataMax => Math.max(100, dataMax)]} />
                             <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: isDark ? '#fff' : '#000' }} formatter={(value) => `${value}%`} />
                             <Bar dataKey="pct_hz_cr" name="Pencapaian" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                 <LabelList dataKey="pct_hz_cr" position="top" formatter={(v) => `${v}%`} fill={isDark ? '#cbd5e1' : '#6b7280'} fontSize={10} offset={10} />
                             </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  {/* Chart B */}
                  <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                     <h3 className="font-bold text-sm mb-4 text-center text-green-500">Quality Busa</h3>
                     <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                             <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} domain={[0, dataMax => Math.max(100, dataMax)]} />
                             <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: isDark ? '#fff' : '#000' }} formatter={(value) => `${value}%`} />
                             <Bar dataKey="pct_vr" name="Pencapaian" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                 <LabelList dataKey="pct_vr" position="top" formatter={(v) => `${v}%`} fill={isDark ? '#cbd5e1' : '#6b7280'} fontSize={10} offset={10} />
                             </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  {/* Chart C */}
                  <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                     <h3 className="font-bold text-sm mb-4 text-center text-orange-500">Total Waktu Terpakai</h3>
                     <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                             <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} domain={[0, dataMax => Math.max(100, dataMax)]} />
                             <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: isDark ? '#fff' : '#000' }} formatter={(value) => `${value}%`} />
                             <Bar dataKey="pct_waktu" name="Pencapaian" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                 <LabelList dataKey="pct_waktu" position="top" formatter={(v) => `${v}%`} fill={isDark ? '#cbd5e1' : '#6b7280'} fontSize={10} offset={10} />
                             </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  {/* Chart D */}
                  <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                     <h3 className="font-bold text-sm mb-4 text-center text-purple-500">Total Man Power</h3>
                     <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                             <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} domain={[0, dataMax => Math.max(100, dataMax)]} />
                             <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: isDark ? '#fff' : '#000' }} formatter={(value) => `${value}%`} />
                             <Bar dataKey="pct_mp" name="Pencapaian" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                 <LabelList dataKey="pct_mp" position="top" formatter={(v) => `${v}%`} fill={isDark ? '#cbd5e1' : '#6b7280'} fontSize={10} offset={10} />
                             </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>

            {/* TABS & DATE PICKER FOR TABLES */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b pb-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('wo')}
                  className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors -mb-[18px] ${activeTab === 'wo' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  Realisasi WO
                </button>
                <button 
                  onClick={() => setActiveTab('mesin')}
                  className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors -mb-[18px] ${activeTab === 'mesin' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  Quality Busa & Pemakaian Mesin
                </button>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <Calendar size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                <input 
                  type="date" 
                  value={tableDate}
                  onChange={(e) => setTableDate(e.target.value)}
                  className={`border-none bg-transparent px-2 py-1 outline-none font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}
                />
              </div>
            </div>

            {/* TABLE 1: WO */}
            {activeTab === 'wo' && (
            <div className={`rounded-xl shadow-sm border p-6 overflow-hidden flex flex-col gap-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
               <h2 className="text-lg font-bold">Realisasi Work Order</h2>
               
               {/* Summary Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                 {(() => {
                    const renderCard = (title, plan, real, pct, colorType) => {
                       const isOver = Number(pct) > 100;
                       const displayPct = (isSuperadmin || !isOver) ? pct : '100.0';
                       const isRed = isOver && isSuperadmin;
                       
                       let bgClass, titleClass, valueClass, pctClass;
                       if (isRed) {
                          bgClass = isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200';
                          titleClass = isDark ? 'text-red-400' : 'text-red-500';
                          valueClass = isDark ? 'text-red-400' : 'text-red-600';
                          pctClass = isDark ? 'text-red-400' : 'text-red-500';
                       } else {
                          if (colorType === 'blue') {
                             bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-blue-50 border-blue-100';
                             titleClass = isDark ? 'text-gray-400' : 'text-gray-500';
                             valueClass = isDark ? 'text-blue-400' : 'text-blue-600';
                             pctClass = isDark ? 'text-gray-400' : 'text-gray-500';
                          } else if (colorType === 'orange') {
                             bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-orange-50 border-orange-100';
                             titleClass = isDark ? 'text-gray-400' : 'text-gray-500';
                             valueClass = isDark ? 'text-orange-400' : 'text-orange-600';
                             pctClass = isDark ? 'text-gray-400' : 'text-gray-500';
                          } else if (colorType === 'purple') {
                             bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-purple-50 border-purple-100';
                             titleClass = isDark ? 'text-gray-400' : 'text-gray-500';
                             valueClass = isDark ? 'text-purple-400' : 'text-purple-600';
                             pctClass = isDark ? 'text-gray-400' : 'text-gray-500';
                          }
                       }
                       
                       return (
                          <div className={`p-4 rounded-lg border ${bgClass}`}>
                             <div className={`text-sm font-semibold mb-1 ${titleClass}`}>{title}</div>
                             <div className={`text-2xl font-black ${valueClass}`}>
                                 {plan} <span className="text-gray-400 text-lg mx-1">/</span> {real}
                             </div>
                             <div className={`text-xs font-bold mt-2 ${pctClass}`}>{displayPct}% Achieved</div>
                          </div>
                       );
                    };

                    return (
                       <>
                          {renderCard("QTY Demand (Plan vs Real)", summaryData.hz_cr.qtyPlan, summaryData.hz_cr.qtyReal, summaryData.hz_cr.pctQty, 'blue')}
                          {renderCard("Waktu Terpakai (Plan vs Real)", summaryData.hz_cr.waktuPlan, summaryData.hz_cr.waktuReal, summaryData.hz_cr.pctWaktu, 'orange')}
                          {renderCard("Man Power Terpakai (Plan vs Real)", summaryData.hz_cr.mpPlan, summaryData.hz_cr.mpReal, summaryData.hz_cr.pctMp, 'purple')}
                       </>
                    );
                 })()}
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead>
                        <tr className={`border-b ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                           <th className="py-3 px-4">No</th>
                           <th className="py-3 px-4">Tgl WO</th>
                           <th className="py-3 px-4">No WO</th>
                           <th className="py-3 px-4">Stat</th>
                           <th className="py-3 px-4">Plan</th>
                           <th className="py-3 px-4">Real</th>
                           <th className="py-3 px-4">Keterangan</th>
                           <th className="py-3 px-4">%</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {table1Data.map((row, i) => {
                           const isOver = row.real > row.plan;
                           const needsRemark = isOver;
                           return (
                              <tr key={row.id} className={`transition-colors ${isOver ? (isDark ? 'bg-red-900/20' : 'bg-red-50') : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                                 <td className="py-3 px-4">{i + 1}</td>
                                 <td className="py-3 px-4 text-xs">{tableDate}</td>
                                 <td className="py-3 px-4 font-semibold">{row.no_wo}</td>
                                 <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                       row.stat === 'Fulfilled' ? 'bg-green-100 text-green-700' : 
                                       row.stat === 'Partial' ? 'bg-amber-100 text-amber-700' : 
                                       'bg-blue-100 text-blue-700'
                                    }`}>
                                       {row.stat}
                                    </span>
                                 </td>
                                 <td className="py-3 px-4">{row.plan}</td>
                                 <td className={`py-3 px-4 font-bold ${isOver ? 'text-red-500' : ''}`}>{row.real}</td>
                                 <td className="py-3 px-4">
                                    {needsRemark ? (
                                       <div className="flex items-center gap-2">
                                          <AlertCircle size={16} className="text-red-500" />
                                          <input 
                                             type="text" 
                                             placeholder="Isi keterangan (Over Qty)" 
                                             value={keterangan[row.id] || ''}
                                             onChange={(e) => handleKeteranganChange(row.id, e.target.value)}
                                             className={`border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-red-500 w-full ${isDark ? 'bg-slate-700 border-red-500/50 text-white' : 'bg-white border-red-300'}`}
                                          />
                                       </div>
                                    ) : (
                                       <span className="text-gray-400 text-xs italic">-</span>
                                    )}
                                 </td>
                                 <td className="py-3 px-4 font-bold">{row.pct}%</td>
                              </tr>
                           );
                        })}
                        {table1Data.length > 0 && (
                           <tr className={`font-bold bg-gray-50 dark:bg-slate-700/50`}>
                              <td colSpan="4" className="py-3 px-4 text-center">AVG</td>
                              <td className="py-3 px-4">{table1Data.reduce((acc, curr) => acc + curr.plan, 0)}</td>
                              <td className="py-3 px-4">{table1Data.reduce((acc, curr) => acc + curr.real, 0)}</td>
                              <td className="py-3 px-4 text-center">-</td>
                              <td className="py-3 px-4 text-blue-500">
                                 {((table1Data.reduce((acc, curr) => acc + curr.real, 0) / (table1Data.reduce((acc, curr) => acc + curr.plan, 0) || 1)) * 100).toFixed(1)}%
                              </td>
                           </tr>
                        )}
                        {table1Data.length === 0 && (
                           <tr>
                              <td colSpan="8" className="py-4 text-center text-gray-500">Tidak ada data aktif pada tanggal ini.</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
            )}

            {/* TABLE 2 CONTAINER */}
            {activeTab === 'mesin' && (
            <div className="flex flex-col gap-8">
               
               {/* QUALITY BUSA */}
               <div className={`rounded-xl shadow-sm border p-6 overflow-hidden flex flex-col gap-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <h2 className="text-lg font-bold">Quality Busa (Vertikal)</h2>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    {(() => {
                       const renderCard = (title, plan, real, pct, colorType) => {
                          const isOver = Number(pct) > 100;
                          const displayPct = (isSuperadmin || !isOver) ? pct : '100.0';
                          const isRed = isOver && isSuperadmin;
                          
                          let bgClass, titleClass, valueClass, pctClass;
                          if (isRed) {
                             bgClass = isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200';
                             titleClass = isDark ? 'text-red-400' : 'text-red-500';
                             valueClass = isDark ? 'text-red-400' : 'text-red-600';
                             pctClass = isDark ? 'text-red-400' : 'text-red-500';
                          } else {
                             if (colorType === 'blue') {
                                bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-blue-50 border-blue-100';
                                titleClass = isDark ? 'text-gray-400' : 'text-gray-500';
                                valueClass = isDark ? 'text-blue-400' : 'text-blue-600';
                                pctClass = isDark ? 'text-gray-400' : 'text-gray-500';
                             } else if (colorType === 'orange') {
                                bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-orange-50 border-orange-100';
                                titleClass = isDark ? 'text-gray-400' : 'text-gray-500';
                                valueClass = isDark ? 'text-orange-400' : 'text-orange-600';
                                pctClass = isDark ? 'text-gray-400' : 'text-gray-500';
                             } else if (colorType === 'purple') {
                                bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-purple-50 border-purple-100';
                                titleClass = isDark ? 'text-gray-400' : 'text-gray-500';
                                valueClass = isDark ? 'text-purple-400' : 'text-purple-600';
                                pctClass = isDark ? 'text-gray-400' : 'text-gray-500';
                             }
                          }
                          
                          return (
                             <div className={`p-4 rounded-lg border ${bgClass}`}>
                                <div className={`text-sm font-semibold mb-1 ${titleClass}`}>{title}</div>
                                <div className={`text-2xl font-black ${valueClass}`}>
                                    {plan} <span className="text-gray-400 text-lg mx-1">/</span> {real}
                                </div>
                                <div className={`text-xs font-bold mt-2 ${pctClass}`}>{displayPct}% Achieved</div>
                             </div>
                          );
                       };

                       return (
                          <>
                             {renderCard("Jumlah SB (Plan vs Real)", summaryData.vr.qtyPlan, summaryData.vr.qtyReal, summaryData.vr.pctQty, 'blue')}
                             {renderCard("Waktu Terpakai (Plan vs Real)", summaryData.vr.waktuPlan, summaryData.vr.waktuReal, summaryData.vr.pctWaktu, 'orange')}
                             {renderCard("Man Power Terpakai (Plan vs Real)", summaryData.vr.mpPlan, summaryData.vr.mpReal, summaryData.vr.pctMp, 'purple')}
                          </>
                       );
                    })()}
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead>
                           <tr className={`border-b ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                              <th className="py-3 px-4">Quality Busa</th>
                              <th className="py-3 px-4 text-right">Planning</th>
                              <th className="py-3 px-4 text-right">Realisasi</th>
                              <th className="py-3 px-4 text-right">%</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                           {table2Data.map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                 <td className="py-3 px-4 font-semibold">{row.nama_item}</td>
                                 <td className="py-3 px-4 text-right">{row.plan}</td>
                                 <td className="py-3 px-4 text-right">{row.real}</td>
                                 <td className="py-3 px-4 text-right font-bold text-green-500">{row.pct}%</td>
                              </tr>
                           ))}
                           {table2Data.length > 0 && (
                              <tr className={`font-bold bg-gray-50 dark:bg-slate-700/50`}>
                                 <td className="py-3 px-4 text-center">AVG</td>
                                 <td className="py-3 px-4 text-right">{Number(table2Data.reduce((acc, curr) => acc + curr.plan, 0)).toFixed(1).replace(/\.0$/, '')}</td>
                                 <td className="py-3 px-4 text-right">{table2Data.reduce((acc, curr) => acc + curr.real, 0)}</td>
                                 <td className="py-3 px-4 text-right text-blue-500">
                                    {((table2Data.reduce((acc, curr) => acc + curr.real, 0) / (table2Data.reduce((acc, curr) => acc + curr.plan, 0) || 1)) * 100).toFixed(1)}%
                                 </td>
                              </tr>
                           )}
                           {table2Data.length === 0 && (
                              <tr>
                                 <td colSpan="4" className="py-4 text-center text-gray-500">Tidak ada data kualitas busa.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

            </div>
            )}
         </div>
      )}
    </div>
  );
};

export default PlanningVsRealisasi;
