import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Users, Activity, Loader, Layers, Edit2, Check, X, BarChart2, AlertTriangle, WrenchIcon, ShieldCheck, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';

const Efisiensi = () => {
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
        axios.get('http://localhost:5000/api/spk/efisiensi'),
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
  }, []);

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

  const calculateMetrics = () => {
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
  };

  const { stats, oee, manpowerEff } = calculateMetrics();

  useEffect(() => {
    const fetchOee = async () => {
      const scores = { Vertikal: 0, Horizontal: 0, Carousel: 0 };
      for (const key of ['Vertikal', 'Horizontal', 'Carousel']) {
        const data = waktuPerMesinData[key] || { waktu: 0, qty: 0 };
        const mData = stats[key];
        if (mData) {
          try {
            const res = await axios.post('http://localhost:5000/api/spk/calculate-oee', {
              shift_time: 7, // Berdasarkan standar waktu/shift = 7 Jam
              efficiency: 1.0,
              downtime: 0, // Dalam Jam
              machine_qty: mData.mesinReq,
              cycle_time_per_machine: 420, // 7 Jam dalam Menit
              operating_time: data.waktu,
              total_input: data.qty || 1,
              defect_qty: 0,
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
  }, [waktuPerMesinData, manualOverrides]);

  const renderMachineUtilization = () => {
    const keys = ['Vertikal', 'Horizontal', 'Carousel'];

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <h3 className="font-bold text-navy-dark mb-4 flex items-center gap-2">
          <Activity size={18} className="text-accent-blue" />
          Utilisasi & Manpower Per Tipe Mesin
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {keys.map(key => {
             const mData = stats[key];
             if (!mData) return null;

             const numMachines = parseInt(manualOverrides[key]?.mesin !== undefined ? manualOverrides[key].mesin : mData.mesinReq) || 0;
             
             // Hitung utilisasi per mesin
             const machineUtilizations = [];
             let remainingTime = mData.waktu;
             const kapasitas = 480;
             
             if (numMachines > 0) {
                 for (let i = 0; i < numMachines; i++) {
                     let timeForThisMachine = Math.min(remainingTime, kapasitas);
                     if (remainingTime <= 0) timeForThisMachine = 0;
                     if (i === numMachines - 1 && remainingTime > kapasitas) {
                         timeForThisMachine = remainingTime;
                     }
                     machineUtilizations.push((timeForThisMachine / kapasitas) * 100);
                     remainingTime -= timeForThisMachine;
                 }
             } else {
                 if (mData.waktu > 0) {
                     machineUtilizations.push((mData.waktu / kapasitas) * 100);
                 }
             }

             return (
               <div key={key} className="border border-gray-200 p-4 rounded-lg bg-gray-50 flex flex-col gap-2">
                  <div className="font-bold text-navy-dark border-b pb-2 mb-2">{key}</div>
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Waktu:</span>
                    <span className="font-bold">{mData.waktu.toFixed(1)} mnt</span>
                  </div>
                  
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-500">Mesin:</span>
                    <input 
                       type="number"
                       className="w-12 px-1 py-0.5 border border-gray-300 rounded text-right font-bold text-blue-600 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                       value={manualOverrides[key]?.mesin !== undefined ? manualOverrides[key].mesin : mData.mesinReq}
                       onChange={(e) => handleManualOverride(key, 'mesin', e.target.value)}
                       min="0"
                    />
                  </div>

                  <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-500">Manpower:</span>
                    <input 
                       type="number"
                       className="w-12 px-1 py-0.5 border border-gray-300 rounded text-right font-bold text-purple-600 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                       value={manualOverrides[key]?.manpower !== undefined ? manualOverrides[key].manpower : mData.mpReq}
                       onChange={(e) => handleManualOverride(key, 'manpower', e.target.value)}
                       min="0"
                    />
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-200">
                     <div className="flex justify-between text-[10px] mb-1">
                       <span className="text-gray-500 font-semibold">Total Utilisasi</span>
                       <span className={`font-bold px-1.5 py-0.5 rounded ${mData.utilisasi > 100 ? 'bg-red-100 text-red-700' : mData.utilisasi >= 80 ? 'bg-green-100 text-green-700' : mData.utilisasi >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{mData.utilisasi.toFixed(1)}%</span>
                     </div>
                     
                     <div className="flex flex-col gap-1.5 mt-2">
                        {machineUtilizations.length > 0 ? machineUtilizations.map((util, i) => (
                           <div key={i} className="flex items-center gap-2">
                             <span className="text-[9px] text-gray-400 w-8">M{i+1}</span>
                             <div className="w-full bg-gray-200 rounded-full h-1.5 flex-1 relative group">
                               <div 
                                 className={`h-1.5 rounded-full ${util > 100 ? 'bg-red-500' : util >= 80 ? 'bg-green-500' : util >= 50 ? 'bg-yellow-500' : 'bg-gray-400'}`} 
                                 style={{ width: `${Math.min(util, 100)}%` }}
                               ></div>
                             </div>
                             <span className="text-[9px] font-medium text-gray-500 w-6 text-right">{util.toFixed(0)}%</span>
                           </div>
                        )) : (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"></div>
                        )}
                     </div>

                     {mData.utilisasi > 100 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-600 flex items-start gap-1.5 leading-tight">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        <span>Overcapacity! Tambah mesin/manpower di atas.</span>
                      </div>
                    )}
                  </div>
               </div>
             );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-accent-blue">
         <Loader size={36} className="animate-spin mb-4" />
         <p className="font-bold text-navy-dark">Mengkalkulasi Prediksi Produksi...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 pb-10">
      
      {/* PANEL SIMULASI OEE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-2 flex items-center justify-between">
         <div className="flex items-center gap-2 text-navy-dark font-bold">
            <Settings size={18} className="text-gray-400" />
            Parameter OEE
         </div>
         <div className="flex gap-4">
            <div className="flex items-center gap-2">
               <label className="text-xs font-semibold text-gray-500">Downtime (Jam):</label>
               <input type="number" value={0} disabled className="bg-gray-100 border border-gray-200 rounded px-3 py-1.5 text-sm w-20 text-center cursor-not-allowed text-gray-500" title="Dinonaktifkan sementara" />
            </div>
            <div className="flex items-center gap-2">
               <label className="text-xs font-semibold text-gray-500">Defect Qty:</label>
               <input type="number" value={0} disabled className="bg-gray-100 border border-gray-200 rounded px-3 py-1.5 text-sm w-20 text-center cursor-not-allowed text-gray-500" title="Dinonaktifkan sementara" />
            </div>
         </div>
      </div>

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

    </div>
  );
};

export default Efisiensi;