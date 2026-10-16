import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Settings, Users, Activity, Loader, Layers, Edit2, Check, X, BarChart2, AlertTriangle, WrenchIcon, ShieldCheck, Clock, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { useSettings } from '../context/SettingsContext';

const Efisiensi = () => {
  const { prefs } = useSettings();
  const isDark = prefs?.darkMode;
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [totalWaktu, setTotalWaktu] = useState(0);
  const [waktuPerMesinData, setWaktuPerMesinData] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});
  const [qualityData, setQualityData] = useState([]); 
  const [historyId, setHistoryId] = useState(null); 
  const [chartData, setChartData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [machineHealth, setMachineHealth] = useState([]);
  const [downtimeForm, setdowntimeForm] = useState({});
  const [savingDowntime, setSavingDowntime] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ ok: 0, ng: 0, catatan: '' });
  
  const [apiOeeScores, setApiOeeScores] = useState({
    Vertikal: 0, Horizontal: 0, Carousel: 0
  });

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

  const fetchData = async () => {
    try {
      const [efisiensiRes, chartRes, healthRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/spk/efisiensi?date=${tanggal}`),
        axios.get('http://localhost:5000/api/spk/chart'),
        axios.get('http://localhost:5000/api/machines/health'),
      ]);

      setTotalWaktu(Number(efisiensiRes.data.totalWaktu)); 
      setWaktuPerMesinData(efisiensiRes.data.waktuPerMesin || {});
      setQualityData(efisiensiRes.data.itemDetails || []); 
      setHistoryId(efisiensiRes.data.historyId);
      setMachineHealth(healthRes.data.machines || []);

      // Init downtimeForm dari data health
      const initForm = {};
      (healthRes.data.machines || []).forEach(m => {
        initForm[m.mesin_id] = { downtime: m.downtime || 0, catatan: m.catatan || '' };
      });
      setdowntimeForm(initForm);

      const rawChart = chartRes.data;
      const past7Days = getPast7Days();
      
      const KELAS_MESIN = 420; // 1 shift = 7 jam = 420 menit
      
      const processedChart = past7Days.map(dayInfo => {
         const spkHariIni = rawChart.filter(r => {
             const rDate = new Date(r.tanggal);
             const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth()+1).padStart(2,'0')}-${String(rDate.getDate()).padStart(2,'0')}`;
             return rStr === dayInfo.dateStr;
         });
         
         let Vertikal = 0, Horizontal = 0, Carousel = 0, CNC = 0;
         let wV = 0, wH = 0, wC = 0;
         let mV = 0, mH = 0, mC = 0;
         
         for (const spk of spkHariIni) {
             wV += Number(spk.waktu_v) || 0;
             wH += Number(spk.waktu_h) || 0;
             wC += Number(spk.waktu_c) || 0;
             
             mV += Number(spk.mesin_v) || 0;
             mH += Number(spk.mesin_h) || 0;
             mC += Number(spk.mesin_c) || 0;
         }
         
         Vertikal = mV;
         Horizontal = mH;
         Carousel = mC;
         CNC = Vertikal > 2 ? 1 : 0;

         let final_mV = wV > 0 ? Math.ceil(wV / KELAS_MESIN) : 1;
         if (final_mV > 3) final_mV = 3; // Max capacity Vertikal

         let final_mH = wH > 0 ? Math.ceil(wH / KELAS_MESIN) : 1;
         if (final_mH > 3) final_mH = 3; // Max capacity Horizontal

         let final_mC = wC > 0 ? Math.ceil(wC / KELAS_MESIN) : 1;
         if (final_mC > 2) final_mC = 2; // Max capacity Carousel

         let oee_v = wV > 0 ? (wV / (final_mV * KELAS_MESIN)) * 100 : 0;
         let oee_h = wH > 0 ? (wH / (final_mH * KELAS_MESIN)) * 100 : 0;
         let oee_c = wC > 0 ? (wC / (final_mC * KELAS_MESIN)) * 100 : 0;

         return {
             tanggal: dayInfo.label,
             Vertikal, Horizontal, Carousel, CNC,
             oee_v: Number(Math.min(oee_v, 100).toFixed(1)),
             oee_h: Number(Math.min(oee_h, 100).toFixed(1)),
             oee_c: Number(Math.min(oee_c, 100).toFixed(1))
         };
      });
      
      setChartData(processedChart);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitDowntime = async (mesinId) => {
    setSavingDowntime(mesinId);
    try {
      const form = downtimeForm[mesinId] || { downtime: 0, catatan: '' };
      await axios.post('http://localhost:5000/api/machines/downtime', {
        mesin_id: mesinId,
        downtime: parseFloat(form.downtime) || 0,
        catatan: form.catatan,
      });
      await fetchData();
    } catch (err) {
      console.error('Gagal simpan downtime:', err);
    } finally {
      setSavingDowntime(null);
    }
  };

  const toggleMaintenance = async (mesinId) => {
    try {
      await axios.put(`http://localhost:5000/api/machines/${mesinId}/maintenance`);
      await fetchData();
    } catch (err) {
      console.error('Gagal toggle maintenance:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tanggal]);

  // Helper untuk warna progress
  const getProgressColor = (value) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  // Helper untuk warna OEE
  const oeeColor = (val) => {
    if (val >= 60) return { bar: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-100 text-green-700 border-green-200' };
    if (val >= 40) return { bar: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return { bar: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-700 border-red-200' };
  };

  const statusBadge = (status) => {
    if (status === 'Maintenance') return { cls: 'bg-red-100 text-red-700 border-red-200', icon: <WrenchIcon size={11} className="inline mr-1" />, label: 'Maintenance' };
    if (status === 'Warning')     return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle size={11} className="inline mr-1" />, label: 'Warning' };
    return { cls: 'bg-green-100 text-green-700 border-green-200', icon: <ShieldCheck size={11} className="inline mr-1" />, label: 'Operational' };
  };

  const startEdit = (item) => {
    setEditingItem(item.nama_item);
    setEditForm({ 
      ok: item.qty_ok || 0, 
      ng: item.qty_ng || 0, 
      catatan: item.catatan === 'Menunggu Produksi' ? '' : item.catatan 
    });
  };

  const saveEdit = async (nama_item) => {
    try {
      await axios.post('http://localhost:5000/api/spk/quality', {
        history_id: historyId,
        nama_item: nama_item,
        qty_ok: editForm.ok,
        qty_ng: editForm.ng,
        catatan: editForm.catatan.trim() || (editForm.ng > 0 ? 'Terdapat Reject' : 'Selesai')
      });
      setEditingItem(null);
      fetchData(); 
    } catch (error) {
      console.error("Gagal menyimpan kualitas:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    }
  };

  const handleManualOverride = (mesinType, field, value) => {
    setManualOverrides(prev => ({
      ...prev,
      [mesinType]: {
        ...prev[mesinType],
        [field]: value === '' ? '' : Number(value)
      }
    }));
  };

  const { stats, oee, manpowerEff } = useMemo(() => {
    let totalWaktuAll = 0;
    let totalKapasitasMesin = 0;
    let totalKapasitasManpower = 0;
    const KELAS_MESIN = 420; // 7 Jam
    const keys = ['Vertikal', 'Horizontal', 'Carousel'];

    const machineStats = keys.reduce((acc, key) => {
      const data = waktuPerMesinData[key] || { waktu: 0, qty: 0 };
      totalWaktuAll += data.waktu;

      let maxCapacity = 1;
      let manpowerPerMachine = 1;
      
      if (key === 'Vertikal') {
          maxCapacity = 3;
          manpowerPerMachine = 3;
      } else if (key === 'Horizontal') {
          maxCapacity = 3;
          manpowerPerMachine = 1;
      } else if (key === 'Carousel') {
          maxCapacity = 2;
          manpowerPerMachine = 1;
      }

      let defaultMesin = Math.ceil(data.waktu / KELAS_MESIN);
      if (defaultMesin > maxCapacity) defaultMesin = maxCapacity;

      let defaultMp = defaultMesin * manpowerPerMachine;

      const override = manualOverrides[key] || {};
      const finalMesin = override.mesin !== undefined && override.mesin !== '' ? Number(override.mesin) : defaultMesin;
      const finalMp = override.manpower !== undefined && override.manpower !== '' ? Number(override.manpower) : defaultMp;

      totalKapasitasMesin += (finalMesin * KELAS_MESIN);
      totalKapasitasManpower += (finalMp * KELAS_MESIN); // Base per operator adalah 480 menit

      const utilisasi = finalMesin > 0 ? (data.waktu / (finalMesin * KELAS_MESIN)) * 100 : 0;
      
      acc[key] = {
        waktu: data.waktu,
        mesinReq: finalMesin,
        mpReq: finalMp,
        utilisasi: Math.min(utilisasi, 100)
      };
      
      return acc;
    }, {});

    const oeeTotal = totalKapasitasMesin > 0 ? (totalWaktuAll / totalKapasitasMesin) * 100 : 0;
    const manpowerEfisiensi = totalKapasitasManpower > 0 ? (totalWaktuAll / totalKapasitasManpower) * 100 : 0;

    return { 
      stats: machineStats, 
      oee: Math.min(oeeTotal, 100), 
      manpowerEff: Math.min(manpowerEfisiensi, 100) 
    };
  }, [waktuPerMesinData, manualOverrides]);

  useEffect(() => {
    const fetchOee = async () => {
      const scores = { Vertikal: 0, Horizontal: 0, Carousel: 0 };
      for (const key of ['Vertikal', 'Horizontal', 'Carousel']) {
        const data = waktuPerMesinData[key] || { waktu: 0, qty: 0 };
        const mData = stats[key];
        const override = manualOverrides[key] || {};
        
        const shift_time = (override.waktu_shift !== undefined ? override.waktu_shift : 7) * 60; // to minutes
        const efficiency = (override.eff !== undefined ? override.eff : 100) / 100;
        const downtime = (override.downtime !== undefined ? override.downtime : 0) * 60; // to minutes
        const machine_qty = override.mesin !== undefined ? override.mesin : (mData?.mesinReq || 1);
        const cycle_time_per_machine = (override.ideal_cycle !== undefined ? override.ideal_cycle : 7) * 60; // to minutes
        const defect_qty = override.defect !== undefined ? override.defect : 0;

        if (mData) {
          try {
            const res = await axios.post('http://localhost:5000/api/spk/calculate-oee', {
              shift_time,
              efficiency,
              downtime,
              machine_qty,
              cycle_time_per_machine,
              operating_time: data.waktu, // Already in minutes
              total_input: data.qty || 1,
              defect_qty,
              tanggal: new Date().toISOString().split('T')[0],
              tipe_mesin: key
            });
            scores[key] = res.data.oee_score_akhir;
          } catch (err) {
             scores[key] = 0;
          }
        }
      }
      setApiOeeScores(scores);
    };

    if (Object.keys(stats).length > 0) {
      fetchOee();
    }
  }, [waktuPerMesinData, manualOverrides, stats]);

  const renderMachineUtilization = () => {
    const keys = ['Vertikal', 'Horizontal', 'Carousel'];

    // Pre-calculate data for all machines
    const machineData = keys.reduce((acc, key) => {
      const mData = stats[key];
      const rawData = waktuPerMesinData[key] || { waktu: 0, qty: 0 };
      const override = manualOverrides[key] || {};
      
      const waktu_shift = override.waktu_shift !== undefined ? override.waktu_shift : 7;
      const eff = override.eff !== undefined ? override.eff : 100;
      const downtime = override.downtime !== undefined ? override.downtime : 0;
      const mesin = override.mesin !== undefined ? override.mesin : (mData?.mesinReq || 1);
      const ideal_cycle = override.ideal_cycle !== undefined ? override.ideal_cycle : 7;
      const defect = override.defect !== undefined ? override.defect : 0;
      const qty = rawData.qty || 1;

      const summary_available = Math.max(0, waktu_shift - downtime);
      const available_pct = waktu_shift > 0 ? (summary_available * (eff / 100) / waktu_shift) * 100 : 0;

      const ideal_cycle_time = mesin * ideal_cycle;
      const operating_hours = rawData.waktu / 60;
      const performance_pct = ideal_cycle_time > 0 ? (operating_hours / ideal_cycle_time) * 100 : 0;

      const good_qty = Math.max(0, qty - defect);
      const quality_pct = qty > 0 ? (good_qty / qty) * 100 : 0;

      const oee_score = (Math.min(available_pct, 100) / 100) * (Math.min(performance_pct, 100) / 100) * (Math.min(quality_pct, 100) / 100) * 100;

      acc[key] = {
        waktu_shift, eff, downtime, summary_available, available_pct,
        mesin, ideal_cycle, ideal_cycle_time, operating_hours, performance_pct,
        qty, defect, quality_pct, oee_score,
        uom: key === 'Vertikal' ? 'SB' : 'SH'
      };
      return acc;
    }, {});

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Activity size={18} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800">Parameter Simulasi OEE</h3>
          </div>
          
          {/* PEMILIH TANGGAL */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Tanggal:</label>
            <input 
              type="date" 
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 font-semibold text-gray-500 uppercase text-[10px] tracking-wider w-1/4">Parameter</th>
                {keys.map(key => (
                  <th key={key} className="p-4 text-center font-bold text-gray-800 w-1/4 uppercase text-[11px] tracking-wider">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              
              {/* AVAILABLE (A) */}
              <tr>
                <td colSpan={4} className="px-4 py-2 bg-emerald-50/50 border-l-[8px] border-emerald-500">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    Available (A)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-600 font-medium border-l-[8px] border-emerald-500/30">Waktu / Shift (Jam)</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className="w-16 text-center bg-gray-50 border-transparent focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-lg px-2 py-1 outline-none font-semibold text-gray-700 transition-all" value={machineData[key].waktu_shift} onChange={(e) => handleManualOverride(key, 'waktu_shift', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-600 font-medium border-l-[8px] border-emerald-500/30">Eff (%)</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className="w-16 text-center bg-gray-50 border-transparent focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-lg px-2 py-1 outline-none font-semibold text-gray-700 transition-all" value={machineData[key].eff} onChange={(e) => handleManualOverride(key, 'eff', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-red-500 font-medium border-l-[8px] border-emerald-500/30">Downtime (Jam)</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className="w-16 text-center bg-red-50/50 text-red-600 border-transparent focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-lg px-2 py-1 outline-none font-bold transition-all" value={machineData[key].downtime} onChange={(e) => handleManualOverride(key, 'downtime', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-500 font-medium text-xs border-l-[8px] border-emerald-500/30">Summary Available</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-bold text-gray-700">
                    {machineData[key].summary_available}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 pl-4 text-emerald-700 font-semibold text-xs border-l-[8px] border-emerald-500/30">Rate Available</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-black text-emerald-600">
                    {Math.min(machineData[key].available_pct, 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* PERFORMANCE (B) */}
              <tr>
                <td colSpan={4} className="px-4 py-2 bg-blue-50/50 border-l-[8px] border-blue-500 border-t border-blue-100/50 mt-2">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    Performance (B)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-600 font-medium border-l-[8px] border-blue-500/30">Machine Qty</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className="w-16 text-center bg-blue-50/50 text-blue-700 border-transparent focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 outline-none font-bold transition-all" value={machineData[key].mesin} onChange={(e) => handleManualOverride(key, 'mesin', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-600 font-medium border-l-[8px] border-blue-500/30">Ideal Cycle</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <input type="number" className="w-16 text-center bg-gray-50 border-transparent focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 outline-none font-semibold text-gray-700 transition-all" value={machineData[key].ideal_cycle} onChange={(e) => handleManualOverride(key, 'ideal_cycle', e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-500 font-medium text-xs border-l-[8px] border-blue-500/30">Ideal Time</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-bold text-gray-700">
                    {machineData[key].ideal_cycle_time}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-500 font-medium text-xs border-l-[8px] border-blue-500/30">Operating (Jam)</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-bold text-gray-700">
                    {machineData[key].operating_hours.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 pl-4 text-blue-700 font-semibold text-xs border-l-[8px] border-blue-500/30">Rate Performance</td>
                {keys.map(key => (
                  <td key={key} className={`p-3 text-center font-black ${machineData[key].performance_pct > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                    {machineData[key].performance_pct.toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* QUALITY (C) */}
              <tr>
                <td colSpan={4} className="px-4 py-2 bg-purple-50/50 border-l-[8px] border-purple-500 border-t border-purple-100/50 mt-2">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2">
                    Quality (C)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-gray-500 font-medium text-xs border-l-[8px] border-purple-500/30">Total Output</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-bold text-gray-700">
                    {machineData[key].qty.toFixed(1)} <span className="text-[9px] text-gray-400 font-normal">{machineData[key].uom}</span>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 pl-4 text-red-500 font-medium border-l-[8px] border-purple-500/30">Defect</td>
                {keys.map(key => (
                  <td key={key} className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input type="number" className="w-16 text-center bg-red-50/50 text-red-600 border-transparent focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-lg px-2 py-1 outline-none font-bold transition-all" value={machineData[key].defect} onChange={(e) => handleManualOverride(key, 'defect', e.target.value)} />
                      <span className="text-[9px] text-gray-400">{machineData[key].uom}</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 pl-4 text-purple-700 font-semibold text-xs border-l-[8px] border-purple-500/30">Rate Quality</td>
                {keys.map(key => (
                  <td key={key} className="p-3 text-center font-black text-purple-600">
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

  const isToday = tanggal === new Date().toISOString().split('T')[0];

  return (
    <div className={`flex flex-col gap-6 animate-in fade-in duration-300 pb-10 ${isDark ? 'text-white' : 'text-gray-800'}`}>
      {/* BANNER HEADER */}
      <div className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div>
          <h1 className={`text-2xl font-black flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-navy-dark'}`}>
            <Activity className="text-accent-blue" size={28} />
            Predictive OEE Planning
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Simulasi estimasi performa efektivitas mesin (Availability, Performance, Quality) berbasis rencana kerja SPK
          </p>
        </div>

        {/* Filter Pemilih Tanggal Rencana */}
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <Calendar size={16} className="text-blue-500 shrink-0" />
            <label className={`text-xs font-bold whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Pilih Tanggal Rencana:
            </label>
            <input 
              type="date" 
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={`px-2 py-1 rounded-lg border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow cursor-pointer ${isDark ? 'bg-slate-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            />
          </div>

          {!isToday && (
            <button
              onClick={() => setTanggal(new Date().toISOString().split('T')[0])}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'}`}
              title="Kembali ke Hari Ini"
            >
              Hari Ini
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-accent-blue">
          <Loader size={36} className="animate-spin mb-4" />
          <p className={`font-bold ${isDark ? 'text-gray-300' : 'text-navy-dark'}`}>Mengkalkulasi Prediksi Produksi...</p>
        </div>
      ) : (
        <>
          {/* KARTU ATAS: OEE PER MESIN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-navy-dark rounded-xl shadow-lg p-6 flex justify-between items-center relative overflow-hidden border border-white/10">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
          <div className="z-10 text-white flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
              <Settings size={18} /> OEE Vertikal
            </div>
            <div className="text-4xl font-extrabold">{apiOeeScores['Vertikal'] ? apiOeeScores['Vertikal'].toFixed(1) : '0.0'}%</div>
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
            <div className="text-4xl font-extrabold">{apiOeeScores['Horizontal'] ? apiOeeScores['Horizontal'].toFixed(1) : '0.0'}%</div>
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
            <div className="text-4xl font-extrabold">{apiOeeScores['Carousel'] ? apiOeeScores['Carousel'].toFixed(1) : '0.0'}%</div>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="text-green-500" size={24} />
          <h2 className="text-lg font-bold text-navy-dark">Tren OEE Per Mesin (7 Hari Terakhir)</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grafik Vertikal */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
            <h3 className="font-bold text-green-700 text-sm mb-4 text-center">OEE Vertikal</h3>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} formatter={(val) => [`${val}%`, 'OEE']} />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min 80%', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="oee_v" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafik Horizontal */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
            <h3 className="font-bold text-blue-700 text-sm mb-4 text-center">OEE Horizontal</h3>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} formatter={(val) => [`${val}%`, 'OEE']} />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min 80%', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="oee_h" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafik Carousel */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
            <h3 className="font-bold text-yellow-600 text-sm mb-4 text-center">OEE Carousel</h3>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} formatter={(val) => [`${val}%`, 'OEE']} />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min 80%', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="oee_c" stroke="#eab308" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ===== GRAFIK HISTORI PEMAKAIAN MESIN (DINAMIS 7 HARI) ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-8">
          <BarChart2 className="text-accent-blue" size={24} />
          <h2 className="text-lg font-bold text-navy-dark">Histori Pemakaian Mesin (7 Hari Terakhir)</h2>
        </div>
        
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="tanggal" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 12 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 12 }} 
                tickFormatter={(value) => `${value}x`}
                allowDecimals={false} 
              />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value) => [`${value} Kali Pakai`, undefined]}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} 
              />
              <Bar dataKey="Vertikal" name="Vertikal" fill="#207756" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="Horizontal" name="Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="Carousel" name="Carousel" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>



      {/* ===== KUALITAS POTONGAN SHORT BLOCK ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
          <Layers size={17} className="text-accent-blue" />
          <h3 className="font-bold text-navy-dark">Kualitas Potongan Short Block</h3>
          <span className="text-xs text-gray-400 font-medium ml-1">(Input Aktual Laporan Operator)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="p-4 font-semibold w-1/4">Jenis Foam</th>
                <th className="p-4 font-semibold text-center w-24">Target</th>
                <th className="p-4 font-semibold text-center w-24">OK</th>
                <th className="p-4 font-semibold text-center w-24">Reject</th>
                <th className="p-4 font-semibold w-32">Quality Rate</th>
                <th className="p-4 font-semibold">Catatan / Status</th>
                <th className="p-4 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {qualityData.length > 0 ? (
                qualityData.map((f, i) => {
                  let grade = '-';
                  if (f.nama_item && f.nama_item.startsWith('LBR ')) grade = f.nama_item.split(' ')[1];
                  
                  const isEditing = editingItem === f.nama_item;
                  const totalTarget = Number(f.total_qty);
                  const ok = isEditing ? editForm.ok : Number(f.qty_ok);
                  const ng = isEditing ? editForm.ng : Number(f.qty_ng);
                  const qualityRate = totalTarget === 0 ? 0 : Math.round((ok / totalTarget) * 100);

                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-navy-dark">{f.nama_item}</div>
                        <div className="text-xs text-gray-400">Grade {grade}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-700 text-lg">{totalTarget}</td>
                      
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <input type="number" min="0" value={editForm.ok} onChange={(e) => setEditForm({...editForm, ok: e.target.value})} className="w-16 p-1 border border-green-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
                        ) : (
                          <span className={`font-bold ${ok > 0 ? 'text-green-600' : 'text-gray-300'}`}>{ok}</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {isEditing ? (
                          <input type="number" min="0" value={editForm.ng} onChange={(e) => setEditForm({...editForm, ng: e.target.value})} className="w-16 p-1 border border-red-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-red-500" />
                        ) : (
                          <span className={`font-bold ${ng > 0 ? 'text-red-500' : 'text-gray-300'}`}>{ng}</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${qualityRate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-500 w-8 text-right">{qualityRate}%</span>
                        </div>
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <input type="text" placeholder="Masukkan alasan reject..." value={editForm.catatan} onChange={(e) => setEditForm({...editForm, catatan: e.target.value})} className="w-full p-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue" />
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${f.catatan !== 'Menunggu Produksi' ? (ng > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200') : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {f.catatan}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(f.nama_item)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors" title="Simpan Data">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingItem(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors" title="Batal">
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => startEdit(f)} className="p-1.5 bg-blue-50 text-blue-500 rounded hover:bg-blue-100 transition-colors" title="Input Kualitas (Laporan Operator)">
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400 font-semibold">
                    Belum ada data target produksi. Silakan input SPK terlebih dahulu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

    </div>
  );
};

export default Efisiensi;