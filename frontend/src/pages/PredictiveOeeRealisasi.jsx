import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Activity, Loader, Settings, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { useSettings } from '../context/SettingsContext';

const PredictiveOeeRealisasi = () => {
  const { prefs } = useSettings();
  const isDark = prefs.darkMode;

  const [loading, setLoading] = useState(true);
  const [realisasiData, setRealisasiData] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [manualOverrides, setManualOverrides] = useState({});
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  const getPast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      
      days.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      });
    }
    return days;
  };

  // Fetch realisasi data & cycle time matrix
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRealisasi, resMatrix] = await Promise.all([
        axios.get('http://localhost:5000/api/realisasi'),
        axios.get('http://localhost:5000/api/matrix')
      ]);
      setRealisasiData(resRealisasi.data || []);
      setMatrixData(resMatrix.data || []);
    } catch (error) {
      console.error("Gagal mengambil data realisasi/matrix:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMatrixItem = (namaItem, tipeMesin, matrixList) => {
    if (!namaItem || !matrixList) return null;
    const cleanName = namaItem.replace(/\s+/g, '').toLowerCase();
    let matched = matrixList.find(m => m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanName && m.tipe_mesin === tipeMesin);
    if (!matched) {
      matched = matrixList.find(m => cleanName.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()) && m.tipe_mesin === tipeMesin);
    }
    return matched;
  };

  const calculateRowCT = (r, matrixList) => {
    let wV = 0, wH = 0, wC = 0;

    // Vertikal CT
    if (r.v_hasil_qty) {
      const qty = Number(r.v_hasil_qty);
      const m = getMatrixItem(r.kualitas || '', 'Vertikal', matrixList);
      const ct = m ? Number(m.cycle_time_menit) : 2.5;
      wV += qty * ct;
    }

    // Horizontal & Carousel CT
    if (r.carousel_items && r.carousel_items.length > 0) {
      const qtyAsal = Number(r.asal_qty || 1);
      r.carousel_items.forEach(c => {
        const type = c.tipe_mesin === 'Carousel' ? 'Carousel' : 'Horizontal';
        const qty = Number(c.hasil2_qty || 0);
        const m = getMatrixItem(r.kualitas || '', type, matrixList);

        const calcItemCT = (t, q) => {
          let ptu = 0, pma = 0, pmu = 0;
          if (!m) return (q * 0.35);
          if (type === 'Carousel') {
            const roundupFactor = Math.ceil((qtyAsal / 6) * 100) / 100;
            ptu = (Number(m.ct_ptu) || 0) * t * (q / qtyAsal) * roundupFactor;
            pma = (Number(m.ct_pma) || 0) * (q / qtyAsal) * roundupFactor;
          } else {
            ptu = (Number(m.ct_ptu) || 0) * t * q;
            pma = (Number(m.ct_pma) || 0) * q;
            pmu = (Number(m.ct_pmu) || 0) * q;
          }
          return ptu + pma + pmu;
        };

        const ctHasil = calcItemCT(Number(c.hasil2_t || 0), Number(c.hasil2_qty || 0));
        const ctWk = calcItemCT(Number(c.waste_kulit_t || 0), Number(c.waste_kulit_qty || 0));
        const ctWp = calcItemCT(Number(c.waste_potong_t || 0), Number(c.waste_potong_qty || 0));
        const ctWpr = calcItemCT(Number(c.waste_produksi_t || 0), Number(c.waste_produksi_qty || 0));
        const ctSp = calcItemCT(Number(c.sispot_t || 0), Number(c.sispot_qty || 0));
        const totalCutting = ctHasil + ctWk + ctWp + ctWpr + ctSp;

        if (type === 'Carousel') {
          if (m) {
            const c1 = Number(m.ct_c1) || 0;
            const c2 = Number(m.ct_c2) || 0;
            const c3 = Number(m.ct_c3) || 0;
            const distSetup = 1 / r.carousel_items.length;
            const kebutuhanSB = qtyAsal / r.carousel_items.length;
            wC += (c1 * distSetup) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + totalCutting;
          } else {
            wC += totalCutting;
          }
        } else {
          if (m) {
            const c1 = Number(m.ct_c1) || 0;
            const c2 = Number(m.ct_c2) || 0;
            const c3 = Number(m.ct_c3) || 0;
            const kebutuhanSB = qtyAsal / r.carousel_items.length;
            wH += (c1 * kebutuhanSB) + (c2 * kebutuhanSB) + (c3 * kebutuhanSB) + totalCutting;
          } else {
            wH += totalCutting;
          }
        }
      });
    }

    return { wV, wH, wC };
  };

  // Calculate actuals based on selected date
  const actualStats = useMemo(() => {
    let stats = {
      Vertikal: { qty: 0, defect: 0, downtime: 0, waktu: 0, mesinCount: 0 },
      Horizontal: { qty: 0, defect: 0, downtime: 0, waktu: 0, mesinCount: 0 },
      Carousel: { qty: 0, defect: 0, downtime: 0, waktu: 0, mesinCount: 0 }
    };

    const calcDowntime = (start, end) => {
      if (!start || !end) return 0;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // handle overnight
      return diff / 60; // in hours
    };

    const filtered = realisasiData.filter(r => {
      if (!r.tanggal) return false;
      const d = new Date(r.tanggal);
      const rStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return rStr === tanggal;
    });

    const vMachines = new Set();
    const hMachines = new Set();
    const cMachines = new Set();

    filtered.forEach(r => {
      const { wV, wH, wC } = calculateRowCT(r, matrixData);
      stats.Vertikal.waktu += wV;
      stats.Horizontal.waktu += wH;
      stats.Carousel.waktu += wC;

      // Vertikal
      if (r.v_hasil_qty) {
        stats.Vertikal.qty += Number(r.v_hasil_qty);
        stats.Vertikal.defect += Number(r.waste_produksi_qty || 0);
        if (r.v_no_mesin) vMachines.add(r.v_no_mesin);
        if (r.dt_jam_awal && r.dt_jam_akhir) {
          stats.Vertikal.downtime += calcDowntime(r.dt_jam_awal, r.dt_jam_akhir);
        }
      }

      // Horizontal & Carousel
      if (r.carousel_items && r.carousel_items.length > 0) {
        r.carousel_items.forEach(c => {
          const type = c.tipe_mesin === 'Carousel' ? 'Carousel' : 'Horizontal';
          stats[type].qty += Number(c.hasil2_qty || 0);
          stats[type].defect += Number(c.waste_produksi_qty || 0);
          if (c.no_mesin) {
            if (type === 'Carousel') cMachines.add(c.no_mesin);
            else hMachines.add(c.no_mesin);
          }
          if (c.dt_jam_awal && c.dt_jam_akhir) {
            stats[type].downtime += calcDowntime(c.dt_jam_awal, c.dt_jam_akhir);
          }
        });
      }
    });

    stats.Vertikal.mesinCount = vMachines.size || (stats.Vertikal.qty > 0 ? 1 : 0);
    stats.Horizontal.mesinCount = hMachines.size || (stats.Horizontal.qty > 0 ? 1 : 0);
    stats.Carousel.mesinCount = cMachines.size || (stats.Carousel.qty > 0 ? 1 : 0);

    return stats;
  }, [realisasiData, matrixData, tanggal]);

  const chartData = useMemo(() => {
    if (!realisasiData.length) return [];
    
    const past7Days = getPast7Days();
    const KELAS_MESIN = 420;

    return past7Days.map(dayInfo => {
      const realisasiHariIni = realisasiData.filter(r => {
        if (!r.tanggal) return false;
        const d = new Date(r.tanggal);
        const rStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return rStr === dayInfo.dateStr;
      });
      
      let wV = 0, wH = 0, wC = 0;

      realisasiHariIni.forEach(r => {
        const rowCT = calculateRowCT(r, matrixData);
        wV += rowCT.wV;
        wH += rowCT.wH;
        wC += rowCT.wC;
      });
      
      let final_mV = wV > 0 ? Math.ceil(wV / KELAS_MESIN) : 1;
      let final_mH = wH > 0 ? Math.ceil(wH / KELAS_MESIN) : 1;
      let final_mC = wC > 0 ? Math.ceil(wC / KELAS_MESIN) : 1;
      
      if (final_mV > 3) final_mV = 3;
      if (final_mH > 3) final_mH = 3;
      if (final_mC > 2) final_mC = 2;

      let oee_v = wV > 0 ? (wV / (final_mV * KELAS_MESIN)) * 100 : 0;
      let oee_h = wH > 0 ? (wH / (final_mH * KELAS_MESIN)) * 100 : 0;
      let oee_c = wC > 0 ? (wC / (final_mC * KELAS_MESIN)) * 100 : 0;

      return {
          tanggal: dayInfo.label,
          Vertikal: final_mV, Horizontal: final_mH, Carousel: final_mC,
          oee_v: Number(Math.min(oee_v, 100).toFixed(1)),
          oee_h: Number(Math.min(oee_h, 100).toFixed(1)),
          oee_c: Number(Math.min(oee_c, 100).toFixed(1))
      };
    });
  }, [realisasiData, matrixData]);

  const handleManualOverride = (mesinType, field, value) => {
    setManualOverrides(prev => ({
      ...prev,
      [mesinType]: {
        ...prev[mesinType],
        [field]: value === '' ? '' : Number(value)
      }
    }));
  };

  const { machineData } = useMemo(() => {
    const keys = ['Vertikal', 'Horizontal', 'Carousel'];

    const mData = keys.reduce((acc, key) => {
      const actual = actualStats[key] || { qty: 0, defect: 0, downtime: 0, waktu: 0, mesinCount: 0 };
      const override = manualOverrides[key] || {};
      
      const waktu_shift = override.waktu_shift !== undefined ? override.waktu_shift : 7;
      const eff = override.eff !== undefined ? override.eff : 100;
      
      // Allow overriding actual values, fallback to actual
      const downtime = override.downtime !== undefined ? override.downtime : actual.downtime;
      const defect = override.defect !== undefined ? override.defect : actual.defect;
      const qty = override.qty !== undefined ? override.qty : actual.qty;
      
      const defaultMesin = actual.mesinCount > 0 ? actual.mesinCount : 1;
      const mesin = override.mesin !== undefined && override.mesin !== '' ? Number(override.mesin) : defaultMesin;
      const ideal_cycle = override.ideal_cycle !== undefined ? override.ideal_cycle : 7;

      const summary_available = Math.max(0, waktu_shift - downtime);
      const available_pct = waktu_shift > 0 ? (summary_available * (eff / 100) / waktu_shift) * 100 : 0;

      const ideal_cycle_time = mesin * ideal_cycle;
      
      // Jam kerja aktual dari Cycle Time matriks riil (dalam jam)
      const eq_operating_hours = actual.waktu > 0 ? (actual.waktu / 60) : 0;
      
      const performance_pct = ideal_cycle_time > 0 ? (eq_operating_hours / ideal_cycle_time) * 100 : 0;

      const good_qty = Math.max(0, qty - defect);
      const quality_pct = qty > 0 ? (good_qty / qty) * 100 : 0;

      const oee_score = (Math.min(available_pct, 100) / 100) * (Math.min(performance_pct, 100) / 100) * (Math.min(quality_pct, 100) / 100) * 100;

      acc[key] = {
        waktu_shift, eff, downtime: Number(downtime).toFixed(2), summary_available: Number(summary_available).toFixed(2), available_pct,
        mesin, ideal_cycle, ideal_cycle_time, operating_hours: eq_operating_hours, performance_pct,
        qty, defect, quality_pct, oee_score,
        uom: key === 'Vertikal' ? 'SB' : 'SH'
      };
      return acc;
    }, {});

    return { machineData: mData };
  }, [actualStats, manualOverrides]);

  const renderMachineUtilization = () => {
    const keys = ['Vertikal', 'Horizontal', 'Carousel'];

    return (
      <div className={`rounded-2xl shadow-sm border mb-6 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-4 border-b flex items-center justify-between gap-3 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
              <Activity size={18} className="text-blue-500" />
            </div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Rincian OEE Per Tipe Mesin (Actual)</h3>
          </div>
          
          <input 
            type="date" 
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold outline-none transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className={isDark ? 'bg-slate-800/50' : 'bg-gray-50/50'}>
                <th className={`p-4 font-semibold uppercase text-[10px] tracking-wider w-1/4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Parameter</th>
                {keys.map(key => (
                  <th key={key} className={`p-4 text-center font-bold uppercase text-[11px] tracking-wider w-1/4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-50'}`}>
              
              {/* AVAILABLE (A) */}
              <tr>
                <td colSpan={4} className={`px-4 py-2 border-l-[8px] border-emerald-500 ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50/50'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Available (A)
                  </span>
                </td>
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium border-l-[8px] ${isDark ? 'border-emerald-500/20 text-gray-300' : 'border-emerald-500/30 text-gray-600'}`}>Waktu / Shift (Jam)</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className={`w-16 text-center border-transparent focus:ring-2 focus:ring-emerald-100 rounded-lg px-2 py-1 outline-none font-semibold transition-all ${isDark ? 'bg-slate-700 text-gray-200 focus:border-emerald-500' : 'bg-gray-50 text-gray-700 focus:bg-white focus:border-emerald-300'}`} value={machineData[key].waktu_shift} onChange={(e) => handleManualOverride(key, 'waktu_shift', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium border-l-[8px] ${isDark ? 'border-emerald-500/20 text-gray-300' : 'border-emerald-500/30 text-gray-600'}`}>Eff (%)</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className={`w-16 text-center border-transparent focus:ring-2 focus:ring-emerald-100 rounded-lg px-2 py-1 outline-none font-semibold transition-all ${isDark ? 'bg-slate-700 text-gray-200 focus:border-emerald-500' : 'bg-gray-50 text-gray-700 focus:bg-white focus:border-emerald-300'}`} value={machineData[key].eff} onChange={(e) => handleManualOverride(key, 'eff', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium border-l-[8px] ${isDark ? 'border-emerald-500/20 text-red-400' : 'border-emerald-500/30 text-red-500'}`}>Downtime (Jam)</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" step="0.1" className={`w-16 text-center border-transparent focus:ring-2 focus:ring-red-100 rounded-lg px-2 py-1 outline-none font-bold transition-all ${isDark ? 'bg-red-900/30 text-red-400 focus:border-red-500' : 'bg-red-50/50 text-red-600 focus:bg-white focus:border-red-300'}`} value={machineData[key].downtime} onChange={(e) => handleManualOverride(key, 'downtime', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium text-xs border-l-[8px] ${isDark ? 'border-emerald-500/20 text-gray-400' : 'border-emerald-500/30 text-gray-500'}`}>Summary Available</td>
                {keys.map(key => (
                  <td key={key} className={`p-3 text-center font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {machineData[key].summary_available}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={`p-3 pl-4 font-semibold text-xs border-l-[8px] ${isDark ? 'border-emerald-500/20 text-emerald-400' : 'border-emerald-500/30 text-emerald-700'}`}>Rate Available</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-black text-emerald-500">
                    {Math.min(machineData[key].available_pct, 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* PERFORMANCE (B) */}
              <tr>
                <td colSpan={4} className={`px-4 py-2 border-l-[8px] border-blue-500 border-t mt-2 ${isDark ? 'bg-blue-900/20 border-blue-900/50' : 'bg-blue-50/50 border-blue-100/50'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    Performance (B)
                  </span>
                </td>
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium border-l-[8px] ${isDark ? 'border-blue-500/20 text-gray-300' : 'border-blue-500/30 text-gray-600'}`}>Machine Qty</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className={`w-16 text-center border-transparent focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 outline-none font-bold transition-all ${isDark ? 'bg-blue-900/30 text-blue-400 focus:border-blue-500' : 'bg-blue-50/50 text-blue-700 focus:bg-white focus:border-blue-300'}`} value={machineData[key].mesin} onChange={(e) => handleManualOverride(key, 'mesin', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium border-l-[8px] ${isDark ? 'border-blue-500/20 text-gray-300' : 'border-blue-500/30 text-gray-600'}`}>Ideal Cycle</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className={`w-16 text-center border-transparent focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 outline-none font-semibold transition-all ${isDark ? 'bg-slate-700 text-gray-200 focus:border-blue-500' : 'bg-gray-50 text-gray-700 focus:bg-white focus:border-blue-300'}`} value={machineData[key].ideal_cycle} onChange={(e) => handleManualOverride(key, 'ideal_cycle', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium text-xs border-l-[8px] ${isDark ? 'border-blue-500/20 text-gray-400' : 'border-blue-500/30 text-gray-500'}`}>Ideal Time</td>
                {keys.map(key => (
                  <td key={key} className={`p-3 text-center font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {machineData[key].ideal_cycle_time}
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium text-xs border-l-[8px] ${isDark ? 'border-blue-500/20 text-gray-400' : 'border-blue-500/30 text-gray-500'}`}>Operating (Jam)</td>
                {keys.map(key => (
                  <td key={key} className={`p-3 text-center font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {machineData[key].operating_hours.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={`p-3 pl-4 font-semibold text-xs border-l-[8px] ${isDark ? 'border-blue-500/20 text-blue-400' : 'border-blue-500/30 text-blue-700'}`}>Rate Performance</td>
                {keys.map(key => (
                  <td key={key} className={`p-3 text-center font-black ${machineData[key].performance_pct > 100 ? 'text-red-500' : 'text-blue-500'}`}>
                    {machineData[key].performance_pct.toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* QUALITY (C) */}
              <tr>
                <td colSpan={4} className={`px-4 py-2 border-l-[8px] border-purple-500 border-t mt-2 ${isDark ? 'bg-purple-900/20 border-purple-900/50' : 'bg-purple-50/50 border-purple-100/50'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                    Quality (C)
                  </span>
                </td>
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium text-xs border-l-[8px] ${isDark ? 'border-purple-500/20 text-gray-400' : 'border-purple-500/30 text-gray-500'}`}>Total Output</td>
                {keys.map(key => (
                  <td key={key} className={`p-3 text-center font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {machineData[key].qty.toFixed(1)} <span className="text-[9px] text-gray-400 font-normal">{machineData[key].uom}</span>
                  </td>
                ))}
              </tr>
              <tr className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'}`}>
                <td className={`p-3 pl-4 font-medium border-l-[8px] ${isDark ? 'border-purple-500/20 text-red-400' : 'border-purple-500/30 text-red-500'}`}>Defect</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input type="number" className={`w-16 text-center border-transparent focus:ring-2 focus:ring-red-100 rounded-lg px-2 py-1 outline-none font-bold transition-all ${isDark ? 'bg-red-900/30 text-red-400 focus:border-red-500' : 'bg-red-50/50 text-red-600 focus:bg-white focus:border-red-300'}`} value={machineData[key].defect} onChange={(e) => handleManualOverride(key, 'defect', e.target.value)} />
                      <span className="text-[9px] text-gray-400">{machineData[key].uom}</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className={`p-3 pl-4 font-semibold text-xs border-l-[8px] ${isDark ? 'border-purple-500/20 text-purple-400' : 'border-purple-500/30 text-purple-700'}`}>Rate Quality</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-black text-purple-500">
                    {Math.min(machineData[key].quality_pct, 100).toFixed(1)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-6 min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-black flex items-center gap-3 ${isDark ? 'text-white' : 'text-navy-dark'}`}>
            <Activity className="text-accent-blue" size={32} />
            Predictive OEE Realisasi
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Pengukuran & kalkulasi predictive OEE berbasis data aktual produksi yang diinput operator.
          </p>
        </div>

        <div className={`flex items-center gap-3 p-2.5 rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <label className={`text-sm font-bold whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tanggal Analisis:</label>
          <input 
            type="date" 
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow ${isDark ? 'bg-slate-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300 pb-10">
          {/* KARTU ATAS: OEE PER MESIN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-navy-dark rounded-xl shadow-lg p-6 flex justify-between items-center relative overflow-hidden border border-white/10">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
              <div className="z-10 text-white flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
                  <Settings size={18} /> OEE Vertikal
                </div>
                <div className="text-4xl font-extrabold">{machineData['Vertikal']?.oee_score ? machineData['Vertikal'].oee_score.toFixed(1) : '0.0'}%</div>
                <div className="text-xs text-gray-400 mt-1">Efektivitas Mesin Vertikal</div>
              </div>
              <div className="w-16 h-16 rounded-full border-[3px] border-green-400/30 flex items-center justify-center z-10 shrink-0">
                 <span className="font-bold text-green-400">VRT</span>
              </div>
            </div>

            <div className="bg-navy-dark rounded-xl shadow-lg p-6 flex justify-between items-center relative overflow-hidden border border-white/10">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="z-10 text-white flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
                  <Settings size={18} /> OEE Horizontal
                </div>
                <div className="text-4xl font-extrabold">{machineData['Horizontal']?.oee_score ? machineData['Horizontal'].oee_score.toFixed(1) : '0.0'}%</div>
                <div className="text-xs text-gray-400 mt-1">Efektivitas Mesin Horizontal</div>
              </div>
              <div className="w-16 h-16 rounded-full border-[3px] border-blue-400/30 flex items-center justify-center z-10 shrink-0">
                 <span className="font-bold text-blue-400">HRZ</span>
              </div>
            </div>

            <div className="bg-navy-dark rounded-xl shadow-lg p-6 flex justify-between items-center relative overflow-hidden border border-white/10">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl"></div>
              <div className="z-10 text-white flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
                  <Settings size={18} /> OEE Carousel
                </div>
                <div className="text-4xl font-extrabold">{machineData['Carousel']?.oee_score ? machineData['Carousel'].oee_score.toFixed(1) : '0.0'}%</div>
                <div className="text-xs text-gray-400 mt-1">Efektivitas Mesin Carousel</div>
              </div>
              <div className="w-16 h-16 rounded-full border-[3px] border-yellow-400/30 flex items-center justify-center z-10 shrink-0">
                 <span className="font-bold text-yellow-400">CRS</span>
              </div>
            </div>
          </div>

          {/* RENDER MESIN BERDASARKAN TIPE */}
          {renderMachineUtilization()}

          {/* ===== GRAFIK TREN OEE PER MESIN (7 HARI) ===== */}
          <div className={`rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-green-500" size={24} />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-navy-dark'}`}>Tren OEE Per Mesin (7 Hari Terakhir)</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Grafik Vertikal */}
              <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <h3 className="font-bold text-green-500 text-sm mb-4 text-center">OEE Vertikal</h3>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                      <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} formatter={(val) => [`${val}%`, 'OEE']} />
                      <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min 80%', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="oee_v" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grafik Horizontal */}
              <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <h3 className="font-bold text-blue-500 text-sm mb-4 text-center">OEE Horizontal</h3>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                      <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} formatter={(val) => [`${val}%`, 'OEE']} />
                      <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min 80%', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="oee_h" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grafik Carousel */}
              <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <h3 className="font-bold text-yellow-500 text-sm mb-4 text-center">OEE Carousel</h3>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                      <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', color: isDark ? '#f1f5f9' : '#0f172a' }} formatter={(val) => [`${val}%`, 'OEE']} />
                      <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min 80%', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="oee_c" stroke="#eab308" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ===== GRAFIK HISTORI PEMAKAIAN MESIN (DINAMIS 7 HARI) ===== */}
          <div className={`rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-8">
              <BarChart2 className="text-accent-blue" size={24} />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-navy-dark'}`}>Histori Pemakaian Mesin (7 Hari Terakhir)</h2>
            </div>
            
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                  <XAxis 
                    dataKey="tanggal" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    tickFormatter={(val) => `${val}x`}
                    domain={[0, 4]} 
                    ticks={[0, 1, 2, 3, 4]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: isDark ? '#f1f5f9' : '#0f172a' }}
                    cursor={{ fill: isDark ? '#334155' : '#f8fafc' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar dataKey="Carousel" name="Carousel" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Horizontal" name="Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Vertikal" name="Vertikal" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveOeeRealisasi;
