import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Loader, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

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
        const formattedHistory = chartRes.data.map(item => {
           // item.tanggal is now formatted as YYYY-MM-DD from backend
           const [year, month, day] = item.tanggal.split('-');
           return {
             ...item,
             labelTanggal: `${parseInt(day)}/${parseInt(month)}`,
             manpower: item.manpower || 0
           };
        });
        setChartHistory(formattedHistory);

        // Get unique dates for dropdown
        const dates = [...new Set(chartRes.data.map(item => item.tanggal))];
        setAvailableDates(dates.sort((a,b) => new Date(b) - new Date(a)));
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

  // Calculate Global Averages
  let avgManpower = 0;
  let avgUtilisasi = 0;
  if (chartHistory.length > 0) {
      avgManpower = chartHistory.reduce((acc, curr) => acc + curr.manpower, 0) / chartHistory.length;
      // Asumsi 3 mesin beroperasi tiap hari (1V, 1H, 1C) = 1260 menit kapasitas total (3 x 420)
      avgUtilisasi = chartHistory.reduce((acc, curr) => {
          const util = (curr.total_waktu_spk / 1260) * 100;
          return acc + (util > 100 ? 100 : util);
      }, 0) / chartHistory.length;
  }
  // Filter chart data based on selected date
  const filteredChartHistory = (selectedDate === 'Semua' || selectedDate === 'History')
      ? chartHistory
      : chartHistory.filter(item => item.tanggal === selectedDate);

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">
        
        {/* FILTER & AVERAGES HEADER */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-dark">Tampilkan Data Berdasarkan:</label>
                <div className="flex items-center gap-3">
                    <input 
                        type="date" 
                        value={selectedDate === 'Semua' || selectedDate === 'History' ? '' : selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value || 'Semua')}
                        className="bg-gray-50 border border-gray-300 text-navy-dark text-sm rounded-lg focus:ring-accent-blue focus:border-accent-blue block p-2.5 font-medium shadow-sm outline-none"
                    />
                    {selectedDate !== 'Semua' && (
                        <button 
                            onClick={() => setSelectedDate('Semua')}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap"
                        >
                            Tampilkan Semua
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
                <AverageCard title="Rata-rata Utilisasi" value={`${avgUtilisasi.toFixed(1)}%`} subtext="Dari seluruh data (7 Hari)" />
                <AverageCard title="Rata-rata Manpower" value={`${Math.round(avgManpower)} Orang`} subtext="Dari seluruh data (7 Hari)" />
            </div>
        </div>


        {/* CHARTS SECTION (Replaced Summary Cards & Old Charts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Total Mesin (Bar Chart) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-navy-dark mb-4">Total Mesin Beroperasi (Prediksi)</h3>
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} allowDecimals={false} />
                            <Tooltip cursor={{fill: '#f3f4f6'}} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="mesin_v" name="Vertikal" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="mesin_h" name="Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="mesin_c" name="Carousel" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Total Manpower (Bar Chart) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-navy-dark mb-4">Total Manpower (Prediksi)</h3>
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} allowDecimals={false} />
                            <Tooltip cursor={{fill: '#f3f4f6'}} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="mp_v" name="MP Vertikal" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="mp_h" name="MP Horizontal" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="mp_c" name="MP Carousel" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Kebutuhan Short Block */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-navy-dark mb-4">Kebutuhan Short Block (SB)</h3>
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                            <Tooltip labelStyle={{color: '#1f2937', fontWeight: 'bold'}} formatter={(value) => typeof value === 'number' ? Number(value).toFixed(2) : value} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="total_sb" name="Total SB" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Estimasi Waktu SPK */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-navy-dark mb-4">Estimasi Waktu Per Mesin (Menit)</h3>
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredChartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="labelTanggal" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                            <Tooltip labelStyle={{color: '#1f2937', fontWeight: 'bold'}} formatter={(value) => typeof value === 'number' ? Number(value).toFixed(2) : value} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="waktu_v" name="Vertikal" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="waktu_h" name="Horizontal" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="waktu_c" name="Carousel" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
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
          <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/50 print:hidden">
            <h3 className="font-bold text-navy-dark text-lg">Rencana Produksi SPK</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex bg-gray-200/60 p-1 rounded-lg">
                {['Semua', 'Vertikal', 'Horizontal', 'Carousel'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMesinTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeMesinTab === tab ? 'bg-white text-navy-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button onClick={handleExportPDF} className="flex items-center gap-2 bg-navy-dark text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-opacity-90 transition-colors shadow-sm whitespace-nowrap">
                <Download size={16} /> Export PDF
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
                    <td colSpan="4" className="p-8 text-center text-gray-400 font-medium">
                      Tidak ada data rencana produksi untuk area {activeMesinTab}.
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