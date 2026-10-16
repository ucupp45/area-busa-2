import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Loader, Download, TrendingUp, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

const Dashboard = ({ isAll }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const historyId = searchParams.get('history_id');

  const [loading, setLoading] = useState(true);
  const [currentSpkName, setCurrentSpkName] = useState('');
  const [activeMesinTab, setActiveMesinTab] = useState('Semua');

  const [planningMetrics, setPlanningMetrics] = useState({
    woAktif: 0,
    mesinDibutuhkan: 0,
    manpowerDibutuhkan: 0,
    shortBlock: 0,
    waktuSpk: '0 Jam',
    mesinBreakdown: { Vertikal: 0, Horizontal: 0, Carousel: 0 },
    waktuBreakdown: { Vertikal: 0, Horizontal: 0, Carousel: 0 },
    anomalyCount: 0
  });
  const [planningData, setPlanningData] = useState([]);
  const [chartHistory, setChartHistory] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(isAll ? 'Semua' : (historyId ? 'History' : 'Semua'));

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const chartRes = await axios.get('http://localhost:5000/api/spk/chart');

        // Format chart history dates
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

        let dataToProcess = chartRes.data;
        if (!dataToProcess || dataToProcess.length === 0) {
          const days = [];
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 6);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push({
              tanggal: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
              total_wo: 0, total_sb: 0, waktu_v: 0, waktu_h: 0, waktu_c: 0, qty_h: 0, qty_c: 0, manpower: 0
            });
          }
          dataToProcess = days;
        }

        const formattedHistory = dataToProcess.map(item => {
          // item.tanggal is now formatted as YYYY-MM-DD from backend
          const [year, month, day] = item.tanggal.split('-');
          return {
            ...item,
            labelTanggal: `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`,
            manpower: item.manpower || 0
          };
        });
        setChartHistory(formattedHistory);

        // Get unique dates for dropdown
        const dates = [...new Set(chartRes.data.map(item => item.tanggal))];
        setAvailableDates(dates.sort((a, b) => new Date(b) - new Date(a)));
      } catch (error) {
        console.error('Error fetching base data:', error);
      }
    };
    fetchBaseData();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        let dashUrl = 'http://localhost:5000/api/spk/dashboard';

        if (selectedDate === 'Semua') {
          dashUrl += '?all=true';
        } else if (selectedDate === 'History' && historyId) {
          dashUrl += `?history_id=${historyId}`;
        } else if (selectedDate !== 'Semua' && selectedDate !== 'History') {
          dashUrl += `?date=${selectedDate}`;
        }

        const dashRes = await axios.get(dashUrl);

        setPlanningMetrics(dashRes.data.metrics);
        setPlanningData(dashRes.data.planningData);
        setCurrentSpkName(dashRes.data.currentSpkName);
        if (dashRes.data.availableDates && dashRes.data.availableDates.length > 0) {
          setAvailableDates(dashRes.data.availableDates);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedDate, historyId]);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Rencana Produksi SPK - Mesin Vertikal', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 27);

      const tableColumn = ["Nama Item", "Customer", "Qty Order", "Kebutuhan SB", "Mesin", "Est. Waktu"];
      const tableRows = [];

      filteredData.forEach(row => {
        const rowData = [
          `${row.item}\n(${row.ukuran_p}x${row.ukuran_l}x${row.ukuran_t})`,
          row.customer || '-',
          `${row.qty} SH`,
          row.kebutuhan_sb !== null && row.kebutuhan_sb > 0 ? `${row.kebutuhan_sb} SB\n(T: ${row.tinggi_balokan}cm)` : '-',
          row.tipe_mesin,
          row.waktu
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [11, 31, 68] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 32 }
      });

      doc.save(`SPK_Rencana_Produksi_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Gagal export PDF:", err);
      alert("Terjadi kesalahan saat meng-export PDF. Cek console untuk detailnya.");
    }
  };

  const getBadgeColor = (mesin) => {
    if (mesin?.toLowerCase() === 'vertikal') return 'bg-red-100 text-red-700 border-red-200';
    if (mesin?.toLowerCase() === 'horizontal') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (mesin?.toLowerCase() === 'carousel') return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const MetricCard = ({ title, value, subtext }) => (
    <div className="bg-navy-dark text-white p-5 rounded-xl shadow-lg border border-white/10 flex flex-col justify-center transform transition hover:scale-105 duration-200">
      <h3 className="text-gray-300 text-sm font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-accent-blue text-xs font-semibold">{subtext}</div>
    </div>
  );

  const AverageCard = ({ title, value, subtext }) => (
    <div className="bg-gradient-to-br from-accent-blue/20 to-transparent border border-accent-blue/30 p-4 rounded-xl shadow-sm flex flex-col justify-center">
      <h3 className="text-navy-dark text-sm font-bold mb-1">{title}</h3>
      <div className="text-2xl font-black text-navy-dark mb-1">{value}</div>
      <p className="text-gray-500 text-xs font-semibold">{subtext}</p>
    </div>
  );

  if (loading && chartHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-accent-blue">
        <Loader size={36} className="animate-spin mb-4" />
        <p className="font-bold text-navy-dark">Memuat Data Dashboard...</p>
      </div>
    );
  }

  // Calculate machine utilization
  const shiftMinutes = 420; // 7 Jam
  const calculateUtil = (waktu, mesin) => {
    if (!mesin || mesin === 0) return 0;
    return Math.min(100, (waktu / (mesin * shiftMinutes)) * 100);
  };

  const barChartData = [
    {
      name: `Vertikal (${planningMetrics.mesinBreakdown?.Vertikal || 0} Unit)`,
      utilisasi: calculateUtil(planningMetrics.waktuBreakdown?.Vertikal, planningMetrics.mesinBreakdown?.Vertikal),
      color: '#f59e0b'
    },
    {
      name: `Horizontal (${planningMetrics.mesinBreakdown?.Horizontal || 0} Unit)`,
      utilisasi: calculateUtil(planningMetrics.waktuBreakdown?.Horizontal, planningMetrics.mesinBreakdown?.Horizontal),
      color: '#3b82f6'
    },
    {
      name: `Carousel (${planningMetrics.mesinBreakdown?.Carousel || 0} Unit)`,
      utilisasi: calculateUtil(planningMetrics.waktuBreakdown?.Carousel, planningMetrics.mesinBreakdown?.Carousel),
      color: '#8b5cf6'
    },
  ];

  const filteredData = planningData.filter(row => {
    if (activeMesinTab === 'Semua' || activeMesinTab === 'Vertikal') return true;
    return row.tipe_mesin?.toLowerCase() === activeMesinTab.toLowerCase();
  });


  // Filter chart data based on selected date
  const filteredChartHistory = (selectedDate === 'Semua' || selectedDate === 'History')
    ? chartHistory
    : chartHistory.filter(item => item.tanggal === selectedDate);

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">

        {/* CHARTS CONTAINER (Unified Layout similar to Planning vs Realisasi) */}
        <div className="rounded-xl shadow-sm border p-6 bg-white border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-navy-dark">
              <TrendingUp className="text-blue-500" /> Tren Rencana Produksi (Rentang Waktu)
            </h2>

            {/* FILTER HEADER (Date Picker) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 p-1.5 rounded-lg border shadow-sm bg-white border-gray-200">
                <Calendar size={15} className="text-blue-500 ml-1 shrink-0" />
                <label className="text-xs font-bold text-gray-500">Tampilkan:</label>
                <input
                  type="date"
                  value={selectedDate === 'Semua' || selectedDate === 'History' ? '' : selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || 'Semua')}
                  className="border-none bg-transparent px-1 py-0.5 text-xs sm:text-sm outline-none font-semibold text-gray-700 cursor-pointer"
                />
                {availableDates && availableDates.length > 0 && (
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-gray-700 px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua Tanggal</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
                {selectedDate !== 'Semua' && (
                  <button
                    onClick={() => setSelectedDate('Semua')}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. Total WO (Bar Chart) */}
            <div className="border rounded-lg p-4 border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-sm mb-4 text-center text-blue-500">Total Work Order (Prediksi)</h3>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="total_wo" name="Total WO" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="total_wo" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                    </Bar>
                    <Line type="monotone" dataKey="total_wo" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Kebutuhan Short Block */}
            <div className="border rounded-lg p-4 border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-sm mb-4 text-center text-red-500">Kebutuhan Short Block (SB)</h3>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value) => typeof value === 'number' ? Number(value).toFixed(2) : value} />
                    <Bar dataKey="total_sb" name="Total SB" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="total_sb" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val.toFixed(1).replace(/\.0$/, '') : ''} />
                    </Bar>
                    <Line type="monotone" dataKey="total_sb" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Estimasi Waktu SPK */}
            <div className="border rounded-lg p-4 border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-sm mb-4 text-center text-orange-500">Estimasi Waktu Per Mesin (Menit)</h3>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="10%" barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value) => typeof value === 'number' ? Number(value).toFixed(2) : value} />
                    <Bar dataKey="waktu_v" name="Vertikal" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="waktu_v" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? Math.round(val) : ''} />
                    </Bar>
                    <Bar dataKey="waktu_h" name="Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="waktu_h" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? Math.round(val) : ''} />
                    </Bar>
                    <Bar dataKey="waktu_c" name="Carousel" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="waktu_c" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? Math.round(val) : ''} />
                    </Bar>
                    <Line type="monotone" dataKey="waktu_v" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="waktu_h" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="waktu_c" stroke="#6d28d9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Total Manpower (Bar Chart) */}
            <div className="border rounded-lg p-4 border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-sm mb-4 text-center text-purple-500">Total Manpower (Prediksi)</h3>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="10%" barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="mp_v" name="MP Vertikal" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="mp_v" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                    </Bar>
                    <Bar dataKey="mp_h" name="MP Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="mp_h" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                    </Bar>
                    <Bar dataKey="mp_c" name="MP Carousel" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="mp_c" position="top" style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                    </Bar>
                    <Line type="monotone" dataKey="mp_v" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="mp_h" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="mp_c" stroke="#6d28d9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ALERT ANOMALI */}
        {planningMetrics.anomalyCount > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between shadow-sm print:hidden">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span className="text-sm font-semibold">Terdapat {planningMetrics.anomalyCount} baris anomali pada rencana produksi (CT kosong, varians tidak terbaca, dll). Harap lakukan pengecekan pada data SPK.</span>
            </div>
          </div>
        )}

        {/* TABEL PLANNING */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-50/50 print:hidden">
            <div>
              <h3 className="font-bold text-navy-dark text-lg flex items-center gap-2">
                Rencana Produksi SPK
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {selectedDate === 'Semua' 
                  ? 'Menampilkan semua riwayat perencanaan SPK' 
                  : (selectedDate === 'History' ? currentSpkName : `Filter Tanggal: ${selectedDate}`)}
                <span className="ml-2 font-bold text-navy-dark">({filteredData.length} Item)</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              {/* FILTER TANGGAL */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                <Calendar size={15} className="text-accent-blue shrink-0" />
                <span className="text-xs font-semibold text-gray-500">Tanggal:</span>
                <input
                  type="date"
                  value={selectedDate === 'Semua' || selectedDate === 'History' ? '' : selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || 'Semua')}
                  className="bg-transparent text-xs font-bold text-navy-dark outline-none cursor-pointer"
                />
                {availableDates && availableDates.length > 0 && (
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-gray-700 px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua Tanggal</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => {
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    setSelectedDate(todayStr);
                  }}
                  className="text-xs px-2 py-1 rounded font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  title="Lihat Tanggal Hari Ini"
                >
                  Hari Ini
                </button>
                {selectedDate !== 'Semua' && (
                  <button
                    onClick={() => setSelectedDate('Semua')}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded transition-colors"
                    title="Tampilkan Semua Tanggal"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* TABS MESIN */}
              <div className="flex bg-gray-200/60 p-1 rounded-lg">
                {['Semua', 'Vertikal', 'Horizontal', 'Carousel'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMesinTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${activeMesinTab === tab ? 'bg-white text-navy-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* EXPORT PDF */}
              <button onClick={handleExportPDF} className="flex items-center gap-2 bg-navy-dark text-white px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-opacity-90 transition-colors shadow-sm whitespace-nowrap">
                <Download size={15} /> Export PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                  <th className="p-4 pl-6 font-semibold w-1/3">Nama Item</th>
                  <th className="p-4 font-semibold">Qty Order</th>
                  <th className="p-4 font-semibold">Kebutuhan SB</th>
                  <th className="p-4 pr-6 font-semibold text-right">Estimasi Waktu</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 transition-colors ${row.isAnomaly ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50/80'}`}>
                    <td className="p-4 pl-6">
                      <div className="font-bold text-navy-dark text-[15px] leading-snug">
                        {row.item}
                        {row.ukuran_p > 0 && <span className="text-gray-500 font-normal"> ({row.ukuran_p} x {row.ukuran_l} x {row.ukuran_t})</span>}
                      </div>
                      <div className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
                        {row.customer && row.customer !== '-' ? row.customer : 'Tanpa Customer'}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider ${getBadgeColor(row.tipe_mesin)}`}>
                          {row.tipe_mesin || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-[15px] align-top">
                      {row.qty} <span className="text-gray-400 text-xs font-normal">SH</span>
                    </td>
                    <td className="p-4 align-top">
                      {row.kebutuhan_sb !== null && row.kebutuhan_sb !== undefined && row.kebutuhan_sb > 0 ? (
                        <div>
                          <div className="font-bold text-purple-700 text-[15px]">{row.kebutuhan_sb} SB</div>
                          <div className="text-xs text-gray-400 font-medium mt-1">T.Balok: {row.tinggi_balokan || 60} cm</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-4 pr-6 align-top text-right">
                      <div className="text-accent-blue font-bold text-[15px]">{row.waktu}</div>
                      <div className="text-xs text-gray-400 font-medium mt-1">CT: {row.ct}</div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calendar size={32} className="text-gray-300 mb-1" />
                        <p className="text-sm font-semibold text-gray-600">
                          Tidak ada data rencana produksi untuk area <span className="font-bold text-navy-dark">{activeMesinTab}</span> {selectedDate !== 'Semua' ? `pada tanggal ${selectedDate}` : ''}.
                        </p>
                        {selectedDate !== 'Semua' && (
                          <button
                            onClick={() => setSelectedDate('Semua')}
                            className="mt-2 text-xs font-bold text-accent-blue hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                          >
                            Tampilkan Semua Riwayat Tanggal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;