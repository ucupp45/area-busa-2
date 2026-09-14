import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { Activity, AlertTriangle, Database, Clock } from 'lucide-react';

const HasilRealisasi = () => {
  const { prefs } = useSettings();
  const isDark = prefs.darkMode;
  const [activeTab, setActiveTab] = useState('vertikal');
  const [data, setData] = useState([]);
  const [dataHorizontal, setDataHorizontal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const getTodayDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resVertikal, resHorizontal] = await Promise.all([
        axios.get('http://localhost:5000/api/realisasi/hasil/vertikal'),
        axios.get('http://localhost:5000/api/realisasi/hasil/horizontal')
      ]);

      if (resVertikal.data.success) {
        setData(resVertikal.data.data);
      } else {
        throw new Error(resVertikal.data.message);
      }

      if (resHorizontal.data.success) {
        setDataHorizontal(resHorizontal.data.data);
      } else {
        throw new Error(resHorizontal.data.message);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal mengambil data dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="animate-spin mr-3"><Activity size={24} /></div>
        <span className="text-lg font-medium">Menganalisis Data Produksi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle /> Terjadi Kesalahan</h3>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  const activeDateFilter = filterDate || getTodayDateString();

  let displayDataVertikal = data.filter(item => {
    const d = new Date(item._raw.tanggal);
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
    return localDate === activeDateFilter;
  });

  if (filterShift) {
    displayDataVertikal = displayDataVertikal.filter(item => item._raw.shift === filterShift);
  }

  const rowSpans = {};
  displayDataVertikal.forEach(item => {
    const id = item._raw.id;
    rowSpans[id] = (rowSpans[id] || 0) + 1;
  });

  return (
    <div className={`space-y-10 ${isDark ? 'text-white' : 'text-gray-800'}`}>

      {/* TABS & FILTER */}
      <div className={`sticky top-0 z-10 flex flex-wrap items-center justify-between border-b backdrop-blur-md pt-4 px-2 -mx-2 ${isDark ? 'border-gray-700 bg-[#0f172a]/70' : 'border-gray-300 bg-white/70'}`}>
        <div className="flex overflow-x-auto">
          <button
            className={`px-6 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === 'vertikal' ? (isDark ? 'border-indigo-400 text-indigo-400' : 'border-indigo-600 text-indigo-600') : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')}`}
            onClick={() => setActiveTab('vertikal')}
          >
            MESIN VERTIKAL
          </button>
          <button
            className={`px-6 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === 'horizontal' ? (isDark ? 'border-indigo-400 text-indigo-400' : 'border-indigo-600 text-indigo-600') : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')}`}
            onClick={() => setActiveTab('horizontal')}
          >
            MESIN HORIZONTAL
          </button>
          <button
            className={`px-6 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === 'carousel' ? (isDark ? 'border-indigo-400 text-indigo-400' : 'border-indigo-600 text-indigo-600') : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')}`}
            onClick={() => setActiveTab('carousel')}
          >
            MESIN CAROUSEL
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-2 pr-4 pt-2 md:pt-0">
          <label className={`text-sm font-semibold whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Filter Tanggal:</label>
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow ${isDark ? 'bg-slate-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
          />
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              className={`text-xs underline px-1 mr-4 ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
            >
              Reset
            </button>
          )}

          <label className={`text-sm font-semibold whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Filter Shift:</label>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow ${isDark ? 'bg-slate-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
          >
            <option value="">Semua Shift</option>
            <option value="Shift 1">Shift 1</option>
            <option value="Shift 2">Shift 2</option>
            <option value="Shift 3">Shift 3</option>
          </select>
        </div>
      </div>

      {activeTab === 'vertikal' && (
        <div className="space-y-10">
          {/* SECTION 1: SHORTBLOCK DATA ANALYZER */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-black text-blue-700 tracking-tight flex items-center gap-2">
                <Database size={28} className="text-blue-600" />
                Shortblock Data Analyzer
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Hasil analisis data realisasi mesin vertikal (Format Grouping per Barcode).
              </p>
            </div>

            {displayDataVertikal.length === 0 ? (
              <div className={`p-12 text-center rounded-xl border border-dashed ${isDark ? 'border-gray-700 bg-[#1e293b]' : 'border-gray-300 bg-gray-50'}`}>
                <p className="text-gray-500">Belum ada data realisasi vertikal yang bisa dianalisis {filterDate ? 'pada tanggal tersebut' : ''}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <table className={`w-full border-collapse text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <thead>
                    <tr>
                      <th rowSpan={2} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight w-24">Tanggal</th>
                      <th rowSpan={2} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight w-24">Barcode</th>
                      <th rowSpan={2} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight">Quality<br />(Description)</th>
                      <th colSpan={4} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center font-bold">Bahan Baku Asal</th>

                      <th colSpan={4} className="border border-gray-400 bg-emerald-300 text-black px-1 py-1.5 text-center font-bold">Hasil Cutting ( Vertikal )</th>
                      <th rowSpan={2} className="border border-gray-400 bg-emerald-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight">Mesin</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold">P</th>
                      <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold">L</th>
                      <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold">T</th>
                      <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold leading-tight">Qty</th>

                      <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold">P</th>
                      <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold">L</th>
                      <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold">T</th>
                      <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold leading-tight">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayDataVertikal.map((item, index) => {
                      const isFirstOfGroup = index === 0 || displayDataVertikal[index - 1]._raw.id !== item._raw.id;
                      const span = rowSpans[item._raw.id];
                      const trClass = `${isDark ? 'bg-[#1e293b]' : 'bg-white'} hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'}`;

                      return (
                        <tr key={'sb_' + item._raw.id + '_' + index} className={trClass}>
                          {isFirstOfGroup && (
                            <>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center font-bold whitespace-nowrap bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>
                                {new Date(item._raw.tanggal).toLocaleDateString('id-ID')}
                              </td>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center font-bold whitespace-nowrap bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>
                                {item.summary_realisasi_vertical.barcode_sb || '-'}
                              </td>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`} title={item.summary_realisasi_vertical.kualitas_busa}>
                                {item.summary_realisasi_vertical.kualitas_busa}
                              </td>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.asal_p}</td>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.asal_l}</td>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.asal_t}</td>
                              <td rowSpan={span} className={`border border-gray-300 px-1 py-1 text-center font-bold bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.asal_qty}</td>
                            </>
                          )}

                          <td className={`border border-gray-300 px-1 py-1 text-center ${isDark ? 'border-gray-600' : ''}`}>{item._raw.hasil_p}</td>
                          <td className={`border border-gray-300 px-1 py-1 text-center ${isDark ? 'border-gray-600' : ''}`}>{item._raw.hasil_l}</td>
                          <td className={`border border-gray-300 px-1 py-1 text-center ${isDark ? 'border-gray-600' : ''}`}>{item._raw.hasil_t}</td>
                          <td className={`border border-gray-300 px-1 py-1 text-center font-bold ${isDark ? 'border-gray-600' : ''}`}>{item._raw.hasil_qty}</td>
                          <td className={`border border-gray-300 px-1 py-1 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item._raw.mesin || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 2: VERTICAL PRODUCTION DATA ANALYZER */}
          {displayDataVertikal.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-black text-indigo-700 tracking-tight flex items-center gap-2">
                  <Clock size={24} className="text-indigo-600" />
                  Vertical Production Data Analyzer (Olahan CT)
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hasil olahan Matriks Cycle Time (CT) untuk setiap mesin vertikal.
                </p>
              </div>

              <div className="overflow-x-auto pb-4">
                <table className={`w-full border-collapse text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <thead>
                    <tr>
                      <th className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold w-24">Tanggal</th>
                      <th className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold">Barcode</th>
                      <th className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold w-16">VARIANT</th>
                      <th className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold">CYCLE TIME (Base)</th>
                      <th className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold">SUM CT (Total)<br /><span className="text-xs font-semibold">(Menit)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayDataVertikal.map((item, index) => {
                      const trClass = `${isDark ? 'bg-[#1e293b]' : 'bg-white'} hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'}`;
                      return (
                        <tr key={'ct_' + item._raw.id + '_' + index} className={trClass}>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap ${isDark ? 'border-gray-600' : ''}`}>
                            {new Date(item._raw.tanggal).toLocaleDateString('id-ID')}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap font-medium ${isDark ? 'border-gray-600' : ''}`}>
                            {item.summary_realisasi_vertical.barcode_sb || '-'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center text-indigo-700 font-medium ${isDark ? 'border-gray-600 text-indigo-400' : ''}`}>
                            {item.summary_realisasi_vertical.varians_potong?.replace('Varians ', '') || '-'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center ${isDark ? 'border-gray-600' : ''}`}>
                            {item.summary_realisasi_vertical.base_ct}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold text-lg ${isDark ? 'border-gray-600' : ''}`}>
                            {item.summary_realisasi_vertical.summary_ct_aktual}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SECTION 3: KUBIKASI DATA ANALYZER */}
          {displayDataVertikal.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-black text-amber-700 tracking-tight flex items-center gap-2">
                  <Database size={24} className="text-amber-600" />
                  Vertical Kubikasi Data Analyzer (M³)
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hasil perhitungan Matematis Kubikasi Induk dan Sisa Potong.
                </p>
              </div>

              <div className="overflow-x-auto pb-4">
                <table className={`w-full border-collapse text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <thead>
                    <tr>
                      <th className="border border-gray-400 bg-blue-200 text-black px-2 py-1.5 text-center font-bold align-middle w-24">Tanggal</th>
                      <th className="border border-gray-400 bg-blue-200 text-black px-2 py-1.5 text-center font-bold align-middle w-24">Barcode</th>
                      <th className="border border-gray-400 bg-amber-100 text-black px-1 py-1.5 text-center font-bold align-middle">Asal (M³)</th>
                      <th className="border border-gray-400 bg-emerald-100 text-black px-1 py-1.5 text-center font-bold align-middle">Hasil (M³)</th>
                      <th className="border border-gray-400 bg-orange-100 text-black px-1 py-1.5 text-center font-bold align-middle" title="Waste Samping 1 (Bag Panjang)">WS 1 (M³)</th>
                      <th className="border border-gray-400 bg-orange-100 text-black px-1 py-1.5 text-center font-bold align-middle" title="Waste Samping 2 (Bag Lebar)">WS 2 (M³)</th>
                      <th className="border border-gray-400 bg-red-100 text-black px-1 py-1.5 text-center font-bold align-middle">Sisa (M³)</th>
                      <th className="border border-gray-400 bg-gray-200 text-black px-2 py-1.5 text-center font-bold align-middle w-24">Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayDataVertikal.map((item, index) => {
                      const isFirstOfGroup = index === 0 || displayDataVertikal[index - 1]._raw.id !== item._raw.id;
                      const trClass = `${isDark ? 'bg-[#1e293b]' : 'bg-white'} hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'}`;

                      if (!isFirstOfGroup) return null; // We only render 1 row per Barcode for the Kubikasi table

                      const asalM3 = item._raw.asal_m3 || 0;

                      return (
                        <tr key={'kubikasi_' + item._raw.id + '_' + index} className={trClass}>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap bg-blue-50 ${isDark ? 'border-gray-600 bg-blue-900/20' : ''}`}>
                            {new Date(item._raw.tanggal).toLocaleDateString('id-ID')}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap bg-blue-50 ${isDark ? 'border-gray-600 bg-blue-900/20' : ''}`}>
                            {item.summary_realisasi_vertical.barcode_sb || '-'}
                          </td>

                          <td className={`border border-gray-300 px-1 py-1.5 text-center font-bold text-amber-700 bg-amber-50 ${isDark ? 'border-gray-600 bg-amber-900/20 text-amber-400' : ''}`}>
                            {asalM3}
                          </td>

                          <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item._raw.total_m3_demand}</td>
                          <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.rincian_kubikasi.m3_waste_samping}</td>
                          <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.rincian_kubikasi.m3_waste_depan}</td>
                          <td className={`border border-gray-300 px-1 py-1.5 text-center font-bold text-red-600 bg-red-50 ${isDark ? 'border-gray-600 bg-red-900/20 text-red-400' : ''}`}>{item._raw.m3_sisa_potong}</td>

                          {/* VALIDASI */}
                          <td className={`border border-gray-300 px-1 py-1 text-center align-middle bg-gray-50 ${isDark ? 'border-gray-600 bg-[#1e293b]' : ''}`}>
                            {item._raw.status_validasi === "PASS" ? (
                              <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded border border-green-300 text-[10px]">PASS</span>
                            ) : (
                              <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-300 text-[9px] block leading-tight" title={item._raw.status_validasi}>
                                WARNING
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {(activeTab === 'horizontal' || activeTab === 'carousel') && (() => {
        let filteredData = dataHorizontal.filter(item => {
          const tipe = item.summary_realisasi_horizontal.tipe_mesin || 'Horizontal';
          return activeTab === 'horizontal' ? tipe === 'Horizontal' : tipe === 'Carousel';
        });

        const activeDateFilterHorizontal = filterDate || getTodayDateString();
        filteredData = filteredData.filter(item => {
          const d = new Date(item._raw.tanggal);
          const offset = d.getTimezoneOffset() * 60000;
          const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
          return localDate === activeDateFilterHorizontal;
        });

        if (filterShift) {
          filteredData = filteredData.filter(item => item._raw.shift === filterShift);
        }

        const judulMesin = activeTab === 'horizontal' ? 'Horizontal' : 'Carousel';

        return (
          <div className="space-y-10">
            {/* HORIZONTAL SECTION 1: SHORTBLOCK DATA ANALYZER */}
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-black text-blue-700 tracking-tight flex items-center gap-2">
                  <Database size={28} className="text-blue-600" />
                  {judulMesin} Data Analyzer
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hasil analisis data realisasi mesin {judulMesin.toLowerCase()} (Format Grouping per Barcode).
                </p>
              </div>

              {filteredData.length === 0 ? (
                <div className={`p-12 text-center rounded-xl border border-dashed ${isDark ? 'border-gray-700 bg-[#1e293b]' : 'border-gray-300 bg-gray-50'}`}>
                  <p className="text-gray-500">Belum ada data realisasi {judulMesin.toLowerCase()} yang bisa dianalisis.</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <table className={`w-full border-collapse text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    <thead>
                      <tr>
                        <th rowSpan={2} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight w-24">Tanggal</th>
                        <th rowSpan={2} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight w-24">Barcode</th>
                        <th rowSpan={2} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight">Quality</th>
                        <th colSpan={4} className="border border-gray-400 bg-yellow-300 text-black px-1 py-1.5 text-center font-bold">Bahan Baku Asal (Vertikal)</th>

                        <th rowSpan={2} className="border border-gray-400 bg-emerald-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight">No WO</th>
                        <th colSpan={4} className="border border-gray-400 bg-emerald-300 text-black px-1 py-1.5 text-center font-bold">DEMAND (Hasil)</th>
                        <th rowSpan={2} className="border border-gray-400 bg-emerald-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight">Mesin ({judulMesin})</th>
                        {activeTab === 'carousel' && (
                          <th rowSpan={2} className="border border-gray-400 bg-purple-300 text-black px-1 py-1.5 text-center align-middle font-bold leading-tight">Isi Disk</th>
                        )}
                      </tr>
                      <tr>
                        <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold">P</th>
                        <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold">L</th>
                        <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold">T</th>
                        <th className="border border-gray-400 bg-yellow-300 text-black px-1 py-1 text-center font-bold leading-tight">Qty</th>

                        <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold">P</th>
                        <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold">L</th>
                        <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold">T</th>
                        <th className="border border-gray-400 bg-emerald-300 text-black px-1 py-1 text-center font-bold leading-tight">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => {
                        const trClass = `${isDark ? 'bg-[#1e293b]' : 'bg-white'} hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'}`;
                        return item.demand_list.map((wo, woIndex) => (
                          <tr key={'hor_' + item._raw.id + '_' + woIndex} className={trClass}>
                            {woIndex === 0 && (
                              <>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center font-bold whitespace-nowrap bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>
                                  {new Date(item._raw.tanggal).toLocaleDateString('id-ID')}
                                </td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center font-bold whitespace-nowrap bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>
                                  {item.summary_realisasi_horizontal.barcode_sb || '-'}
                                </td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`} title={item.summary_realisasi_horizontal.kualitas_busa}>
                                  {item.summary_realisasi_horizontal.kualitas_busa}
                                </td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.vertikal_p}</td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.vertikal_l}</td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.vertikal_t}</td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center font-bold bg-yellow-50 ${isDark ? 'border-gray-600 bg-slate-800/50' : ''}`}>{item._raw.vertikal_qty}</td>
                              </>
                            )}
                            <td className={`border border-gray-300 px-1 py-1 text-center font-medium text-emerald-700 whitespace-nowrap ${isDark ? 'border-gray-600 text-emerald-400' : ''}`}>
                              {wo.no_wo || '-'}
                            </td>
                            <td className={`border border-gray-300 px-1 py-1 text-center ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_p}</td>
                            <td className={`border border-gray-300 px-1 py-1 text-center ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_l}</td>
                            <td className={`border border-gray-300 px-1 py-1 text-center ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_t}</td>
                            <td className={`border border-gray-300 px-1 py-1 text-center font-bold ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_qty}</td>
                            <td className={`border border-gray-300 px-1 py-1 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{wo.no_mesin || '-'}</td>
                            {activeTab === 'carousel' && (
                              <td className={`border border-gray-300 px-1 py-1 text-center font-bold text-purple-700 bg-purple-50 ${isDark ? 'border-gray-600 bg-purple-900/20 text-purple-400' : ''}`}>{wo.no_disk || '-'}</td>
                            )}
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SECTION 2 HORIZONTAL CT */}
            {filteredData.length > 0 && (
              <section className="space-y-4 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-black text-indigo-700 tracking-tight flex items-center gap-2">
                    <Clock size={24} className="text-indigo-600" />
                    {judulMesin} Production Data Analyzer (Olahan CT)
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Hasil olahan Matriks Cycle Time (CT) untuk mesin {judulMesin.toLowerCase()}.
                  </p>
                </div>

                <div className="overflow-x-auto pb-4">
                  <table className={`w-full border-collapse text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    <thead>
                      <tr>
                        <th rowSpan={2} className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold align-middle w-24">Tanggal</th>
                        <th rowSpan={2} className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold align-middle">No WO</th>
                        <th rowSpan={2} className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold align-middle">Quality<br />(Description)</th>
                        <th rowSpan={2} className="border border-gray-400 bg-indigo-200 text-black px-2 py-2 text-center font-bold align-middle w-16">VARIANT</th>
                        <th colSpan={4} className="border border-gray-400 bg-emerald-300 text-black px-2 py-1 text-center font-bold">DEMAND (Hasil)</th>
                        <th colSpan={activeTab === 'carousel' ? 5 : 6} className="border border-gray-400 bg-yellow-300 text-black px-2 py-1 text-center font-bold">SUMMARY CT</th>
                        <th rowSpan={2} className="border border-gray-400 bg-yellow-400 text-black px-2 py-2 text-center font-bold align-middle text-lg">TOTAL CT<br /><span className="text-xs font-semibold">(Menit)</span></th>
                      </tr>
                      <tr>
                        <th className="border border-gray-400 bg-emerald-200 text-black px-1 py-1 text-center font-bold w-12">P</th>
                        <th className="border border-gray-400 bg-emerald-200 text-black px-1 py-1 text-center font-bold w-12">L</th>
                        <th className="border border-gray-400 bg-emerald-200 text-black px-1 py-1 text-center font-bold w-12">T</th>
                        <th className="border border-gray-400 bg-emerald-200 text-black px-1 py-1 text-center font-bold w-10">Qty</th>

                        <th className="border border-gray-400 bg-yellow-100 text-black px-1 py-1 text-center font-bold w-10">C1</th>
                        <th className="border border-gray-400 bg-yellow-100 text-black px-1 py-1 text-center font-bold w-10">C2</th>
                        <th className="border border-gray-400 bg-yellow-100 text-black px-1 py-1 text-center font-bold w-10">PTU</th>
                        <th className="border border-gray-400 bg-yellow-100 text-black px-1 py-1 text-center font-bold w-10">PMA</th>
                        {activeTab !== 'carousel' && (
                          <th className="border border-gray-400 bg-yellow-100 text-black px-1 py-1 text-center font-bold w-10">PMU</th>
                        )}
                        <th className="border border-gray-400 bg-yellow-100 text-black px-1 py-1 text-center font-bold w-10">C3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => {
                        const trClass = `${isDark ? 'bg-[#1e293b]' : 'bg-white'} hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'}`;
                        return item.demand_list.map((wo, woIndex) => (
                          <tr key={'hor_ct_' + item._raw.id + '_' + index + '_' + woIndex} className={trClass}>
                            {woIndex === 0 && (
                              <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap ${isDark ? 'border-gray-600' : ''}`}>
                                {new Date(item._raw.tanggal).toLocaleDateString('id-ID')}
                              </td>
                            )}
                            <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold text-emerald-700 ${isDark ? 'border-gray-600 text-emerald-400' : ''}`}>
                              {wo.no_wo || '-'}
                            </td>
                            {woIndex === 0 && (
                              <>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-2 py-1.5 text-center bg-indigo-50 ${isDark ? 'border-gray-600 bg-indigo-900/20' : ''}`} title={item.summary_realisasi_horizontal.kualitas_busa}>
                                  {item.summary_realisasi_horizontal.kualitas_busa}
                                </td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-2 py-1.5 text-center text-indigo-700 font-bold ${isDark ? 'border-gray-600 text-indigo-400' : ''}`}>
                                  {(item.summary_realisasi_horizontal.varians_potong || '').replace(/Varians\s*/i, '')}
                                </td>
                              </>
                            )}

                            <td className={`border border-gray-300 px-1 py-1.5 text-center ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_p}</td>
                            <td className={`border border-gray-300 px-1 py-1.5 text-center ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_l}</td>
                            <td className={`border border-gray-300 px-1 py-1.5 text-center ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_t}</td>
                            <td className={`border border-gray-300 px-1 py-1.5 text-center font-bold ${isDark ? 'border-gray-600' : ''}`}>{wo.hasil_qty}</td>

                            {woIndex === 0 && (
                              <>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.summary_realisasi_horizontal.summary_ct?.c1 ?? '-'}</td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.summary_realisasi_horizontal.summary_ct?.c2 ?? '-'}</td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.summary_realisasi_horizontal.summary_ct?.ptu ?? '-'}</td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.summary_realisasi_horizontal.summary_ct?.pma ?? '-'}</td>
                                {activeTab !== 'carousel' && (
                                  <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.summary_realisasi_horizontal.summary_ct?.pmu ?? '-'}</td>
                                )}
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-medium ${isDark ? 'border-gray-600' : ''}`}>{item.summary_realisasi_horizontal.summary_ct?.c3 ?? '-'}</td>

                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-2 py-1.5 text-center font-bold text-base bg-yellow-50 ${isDark ? 'border-gray-600 bg-yellow-900/20' : ''}`}>
                                  {item.summary_realisasi_horizontal.total_sum_ct}
                                </td>
                              </>
                            )}
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* SECTION 3 HORIZONTAL KUBIKASI */}
            {filteredData.length > 0 && (
              <section className="space-y-4 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-black text-amber-700 tracking-tight flex items-center gap-2">
                    <Database size={24} className="text-amber-600" />
                    {judulMesin} Kubikasi Data Analyzer (M³)
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Hasil perhitungan Matematis Kubikasi dan Validasi Tinggi Horizontal.
                  </p>
                </div>

                <div className="overflow-x-auto pb-4">
                  <table className={`w-full border-collapse text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    <thead>
                      <tr>
                        <th className="border border-gray-400 bg-blue-200 text-black px-2 py-1.5 text-center font-bold align-middle w-24">Tanggal</th>
                        <th className="border border-gray-400 bg-blue-200 text-black px-2 py-1.5 text-center font-bold align-middle w-24">Barcode</th>
                        <th className="border border-gray-400 bg-indigo-200 text-black px-2 py-1.5 text-center font-bold align-middle w-24">No WO</th>
                        <th className="border border-gray-400 bg-amber-100 text-black px-2 py-1.5 text-center font-bold align-middle">Asal (M³)</th>
                        <th className="border border-gray-400 bg-emerald-200 text-black px-2 py-1 text-center font-bold">Hasil Cutting (M³)</th>
                        <th className="border border-gray-400 bg-orange-200 text-black px-2 py-1 text-center font-bold">Waste Kulit (M³)</th>
                        <th className="border border-gray-400 bg-red-200 text-black px-2 py-1 text-center font-bold">Sisa Potong (M³)</th>
                        <th className="border border-gray-400 bg-purple-200 text-black px-2 py-1 text-center font-bold">Waste Potong D (M³)</th>
                        <th className="border border-gray-400 bg-pink-200 text-black px-2 py-1 text-center font-bold">Waste Produksi E (M³)</th>
                        <th className="border border-gray-400 bg-gray-200 text-black px-2 py-1.5 text-center font-bold align-middle w-32">Validasi Ketinggian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => {
                        const trClass = `${isDark ? 'bg-[#1e293b]' : 'bg-white'} hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'}`;
                        return item.demand_list.map((wo, woIndex) => (
                          <tr key={'hor_kubikasi_' + item._raw.id + '_' + index + '_' + woIndex} className={trClass}>
                            {woIndex === 0 && (
                              <>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap bg-blue-50 ${isDark ? 'border-gray-600 bg-blue-900/20' : ''}`}>
                                  {new Date(item._raw.tanggal).toLocaleDateString('id-ID')}
                                </td>
                                <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap bg-blue-50 ${isDark ? 'border-gray-600 bg-blue-900/20' : ''}`}>
                                  {item.summary_realisasi_horizontal.barcode_sb || '-'}
                                </td>
                              </>
                            )}

                            <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap bg-indigo-50 ${isDark ? 'border-gray-600 bg-indigo-900/10 text-indigo-300' : 'text-indigo-700'}`}>
                              {wo.no_wo || '-'}
                            </td>

                            {woIndex === 0 && (
                              <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1.5 text-center font-bold text-amber-700 bg-amber-50 ${isDark ? 'border-gray-600 bg-amber-900/20 text-amber-400' : ''}`}>
                                {item.rincian_kubikasi.m3_asal}
                              </td>
                            )}

                            {/* HASIL CUTTING */}
                            <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium bg-emerald-50 ${isDark ? 'border-gray-600 bg-emerald-900/10' : ''}`}>{wo.m3_wo ?? 0}</td>

                            {/* WASTE KULIT */}
                            <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium bg-orange-50 ${isDark ? 'border-gray-600 bg-orange-900/10' : ''}`}>{wo.m3_wk ?? 0}</td>

                            {/* SISA POTONG */}
                            <td className={`border border-gray-300 px-1 py-1.5 text-center font-bold text-red-600 bg-red-50 ${isDark ? 'border-gray-600 bg-red-900/10 text-red-400' : ''}`}>{wo.m3_sp ?? 0}</td>

                            {/* WASTE POTONG */}
                            <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium bg-purple-50 ${isDark ? 'border-gray-600 bg-purple-900/10' : ''}`}>{wo.m3_wp ?? 0}</td>

                            {/* WASTE PRODUKSI */}
                            <td className={`border border-gray-300 px-1 py-1.5 text-center font-medium bg-pink-50 ${isDark ? 'border-gray-600 bg-pink-900/10' : ''}`}>{wo.m3_wpr ?? 0}</td>

                            {/* VALIDASI */}
                            {woIndex === 0 && (
                              <td rowSpan={item.demand_list.length} className={`border border-gray-300 px-1 py-1 text-center align-middle bg-gray-50 ${isDark ? 'border-gray-600 bg-[#1e293b]' : ''}`}>
                                {item.status_validasi === "PASS" ? (
                                  <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded border border-green-300 text-[10px]">PASS</span>
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-300 text-[9px] leading-tight">
                                      WARNING
                                    </span>
                                    <span className="text-[8px] leading-tight text-red-600 dark:text-red-400 max-w-[120px] text-center">
                                      {item.status_validasi.replace('WARNING - ', '')}
                                    </span>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default HasilRealisasi;
