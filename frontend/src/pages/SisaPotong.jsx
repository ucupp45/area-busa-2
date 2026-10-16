import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Filter, Calendar, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SisaPotong = () => {
  const { prefs } = useSettings();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const isSuperadmin = user?.role === 'Superadmin';

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('tersedia'); // 'semua', 'tersedia', 'terpakai'
  const [filterDate, setFilterDate] = useState('');

  // Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formSispot, setFormSispot] = useState({
    id: null, no_barcode: '', kualitas: '', sumber_potong: 'Manual', p: '', l: '', t: '', qty: 1
  });

  const openForm = (item = null) => {
    if (!isSuperadmin) {
      alert('Akses Ditolak: Fitur Tambah/Edit Sisa Potong hanya bisa dilakukan oleh Superadmin.');
      return;
    }
    if (item) {
      setFormSispot({ ...item });
    } else {
      setFormSispot({ id: null, no_barcode: '', kualitas: '', sumber_potong: 'Manual', p: '', l: '', t: '', qty: 1 });
    }
    setIsFormModalOpen(true);
  };

  const handleSaveSispot = async (e) => {
    e.preventDefault();
    if (!isSuperadmin) {
      alert('Akses Ditolak: Hanya Superadmin yang berwenang menyimpan data Stok Sisa Potong.');
      return;
    }
    try {
      const config = { headers: { 'x-user-role': user?.role || '' } };
      if (formSispot.id) {
        await axios.put(`http://localhost:5000/api/realisasi/sisa-potong/${formSispot.id}`, formSispot, config);
      } else {
        await axios.post('http://localhost:5000/api/realisasi/sisa-potong', formSispot, config);
      }
      setIsFormModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving sisa potong:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan data sisa potong');
    }
  };

  const confirmDelete = (id) => {
    if (!isSuperadmin) {
      alert('Akses Ditolak: Fitur Hapus Sisa Potong hanya bisa dilakukan oleh Superadmin.');
      return;
    }
    setSelectedId(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedId) return;
    if (!isSuperadmin) {
      alert('Akses Ditolak: Hanya Superadmin yang berwenang menghapus data Stok Sisa Potong.');
      return;
    }
    try {
      const config = { headers: { 'x-user-role': user?.role || '' } };
      await axios.delete(`http://localhost:5000/api/realisasi/sisa-potong/${selectedId}`, config);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting sisa potong:', error);
      alert(error.response?.data?.message || 'Gagal menghapus data sisa potong');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/realisasi/sisa-potong/all');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching sisa potong data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateAging = (dateString) => {
    const createdDate = new Date(dateString);
    const now = new Date();
    
    const createdMidnight = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = Math.abs(nowMidnight - createdMidnight);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hari ini";
    return `${diffDays} hari`;
  };

  const filteredData = data.filter(item => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.no_barcode && item.no_barcode.toLowerCase().includes(searchLower)) ||
      (item.kualitas && item.kualitas.toLowerCase().includes(searchLower));

    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'tersedia') {
      matchesStatus = item.is_used === 0;
    } else if (filterStatus === 'terpakai') {
      matchesStatus = item.is_used === 1;
    }

    // Date filter
    let matchesDate = true;
    if (filterDate) {
        const itemDateStr = new Date(item.created_at).toISOString().split('T')[0];
        matchesDate = itemDateStr === filterDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Chart Data Processing
  const chartData = React.useMemo(() => {
    // 1. Status Proportion
    const available = filteredData.filter(d => d.is_used === 0).length;
    const used = filteredData.filter(d => d.is_used === 1).length;
    const statusData = [
        { name: 'Tersedia', value: available, color: '#10b981' }, 
        { name: 'Terpakai', value: used, color: '#64748b' }
    ];

    // 2. Kualitas Terbanyak (Tersedia saja)
    const availableData = filteredData.filter(d => d.is_used === 0);
    const qualityMap = {};
    availableData.forEach(item => {
        const k = item.kualitas || 'Unknown';
        qualityMap[k] = (qualityMap[k] || 0) + 1;
    });
    const topKualitas = Object.keys(qualityMap)
        .map(k => ({ name: k, jumlah: qualityMap[k] }))
        .sort((a, b) => b.jumlah - a.jumlah)
        .slice(0, 5); // top 5

    // 3. Aging (Tersedia saja)
    let ageToday = 0;
    let age1to3 = 0;
    let age4to7 = 0;
    let ageOver7 = 0;
    
    availableData.forEach(item => {
        const ageText = calculateAging(item.created_at);
        if (ageText === "Hari ini") {
            ageToday++;
        } else {
            const days = parseInt(ageText);
            if (days >= 1 && days <= 3) age1to3++;
            else if (days >= 4 && days <= 7) age4to7++;
            else ageOver7++;
        }
    });
    const agingData = [
        { name: 'Hari ini', count: ageToday, fill: '#3b82f6' },
        { name: '1-3 Hari', count: age1to3, fill: '#eab308' },
        { name: '4-7 Hari', count: age4to7, fill: '#f97316' },
        { name: '> 7 Hari', count: ageOver7, fill: '#ef4444' }
    ];

    return { statusData, topKualitas, agingData };
  }, [filteredData]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className={`px-6 py-4 rounded-xl shadow flex flex-col md:flex-row justify-between items-center gap-4 ${prefs.darkMode ? 'bg-[#1e293b] text-white' : 'bg-navy-dark text-white'}`}>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package size={24} className="text-accent-blue" />
            Stok Sisa Potong
          </h2>
          <p className="text-accent-blue text-sm mt-1">
            Pantau ketersediaan Sisa Potong Vertical dan Horizontal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperadmin && (
            <button 
              onClick={() => openForm()}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus size={16} /> Tambah Manual
            </button>
          )}
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* DASHBOARD CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart 1: Proporsi Status */}
          <div className={`p-5 rounded-xl shadow-sm border ${prefs.darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
              <h3 className="font-bold mb-4 text-sm">Status Sisa Potong</h3>
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={chartData.statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                              label={({name, value}) => `${value}`}
                          >
                              {chartData.statusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{fontSize: '12px'}} />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 2: Top 5 Kualitas Tersedia */}
          <div className={`p-5 rounded-xl shadow-sm border ${prefs.darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
              <h3 className="font-bold mb-4 text-sm">Top 5 Kualitas (Tersedia)</h3>
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.topKualitas} layout="vertical" margin={{top: 0, right: 20, left: 20, bottom: 0}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={prefs.darkMode ? '#334155' : '#e5e7eb'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: prefs.darkMode ? '#334155' : '#f3f4f6'}} />
                          <Bar dataKey="jumlah" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15}>
                              {chartData.topKualitas.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill="#8b5cf6" />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 3: Aging Sisa Potong */}
          <div className={`p-5 rounded-xl shadow-sm border ${prefs.darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
              <h3 className="font-bold mb-4 text-sm">Aging Sisa Potong (Tersedia)</h3>
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.agingData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={prefs.darkMode ? '#334155' : '#e5e7eb'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} allowDecimals={false} />
                          <Tooltip cursor={{fill: prefs.darkMode ? '#334155' : '#f3f4f6'}} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                              {chartData.agingData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      <div className={`p-6 rounded-xl shadow-sm border ${prefs.darkMode ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-gray-100 text-gray-800'}`}>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Barcode atau Kualitas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                prefs.darkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200'
              }`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={18} />
            <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`border rounded-lg pl-3 pr-4 py-2 outline-none focus:ring-2 focus:ring-accent-blue/50 ${prefs.darkMode ? 'bg-[#0f172a] border-slate-600 text-white' : 'bg-white border-gray-300'}`}
            />
            {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-gray-400 hover:text-red-500">
                    <X size={18} />
                </button>
            )}
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`pl-10 pr-8 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all cursor-pointer ${
                prefs.darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <option value="tersedia">Status: Tersedia Saja</option>
              <option value="terpakai">Status: Sudah Terpakai</option>
              <option value="semua">Status: Tampilkan Semua</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase ${prefs.darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>
              <tr>
                <th className="px-4 py-3 font-semibold">No Barcode Induk</th>
                <th className="px-4 py-3 font-semibold">Kualitas</th>
                <th className="px-4 py-3 font-semibold">Sumber Sisa</th>
                <th className="px-4 py-3 font-semibold text-center">Ukuran (P x L x T)</th>
                <th className="px-4 py-3 font-semibold text-center">Qty</th>
                <th className="px-4 py-3 font-semibold">Tgl Potong</th>
                <th className="px-4 py-3 font-semibold text-center">Umur (Aging)</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                {isSuperadmin && <th className="px-4 py-3 font-semibold text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isSuperadmin ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Memuat data sisa potong...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data sisa potong yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                      prefs.darkMode ? 'border-slate-700' : 'border-gray-100'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {item.no_barcode}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.kualitas}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                        item.sumber_potong === 'Vertical' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {item.sumber_potong}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {item.p} <span className="text-gray-400">x</span> {item.l} <span className="text-gray-400">x</span> {item.t}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {item.qty}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <Calendar size={14} />
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md text-xs">
                        {calculateAging(item.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.is_used === 1 ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 text-xs font-bold rounded-md">
                          Terpakai
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-md flex items-center justify-center gap-1 w-max mx-auto">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Tersedia
                        </span>
                      )}
                    </td>
                    {isSuperadmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openForm(item)}
                            className={`p-1.5 rounded-md transition-colors ${prefs.darkMode ? 'bg-slate-700 hover:bg-blue-900/50 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => confirmDelete(item.id)}
                            className={`p-1.5 rounded-md transition-colors ${prefs.darkMode ? 'bg-slate-700 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 ${prefs.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${prefs.darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <h3 className={`font-bold text-lg ${prefs.darkMode ? 'text-white' : 'text-gray-800'}`}>
                {formSispot.id ? 'Edit Sisa Potong' : 'Tambah Sisa Potong Manual'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className={`p-1 rounded-md transition-colors ${prefs.darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSispot} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Kualitas *</label>
                  <input required type="text" value={formSispot.kualitas} onChange={e => setFormSispot({...formSispot, kualitas: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Contoh: D 16 HARD YELLOW" />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Barcode Induk (Opsional)</label>
                  <input type="text" value={formSispot.no_barcode || ''} onChange={e => setFormSispot({...formSispot, no_barcode: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Boleh dikosongkan" />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Sumber Sisa</label>
                  <select value={formSispot.sumber_potong} onChange={e => setFormSispot({...formSispot, sumber_potong: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`}>
                    <option value="Manual">Manual</option>
                    <option value="Vertical">Vertical</option>
                    <option value="Horizontal">Horizontal</option>
                  </select>
                </div>
                <div className="col-span-2 grid grid-cols-4 gap-2">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Panjang</label>
                    <input type="number" step="any" required value={formSispot.p} onChange={e => setFormSispot({...formSispot, p: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="P" />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Lebar</label>
                    <input type="number" step="any" required value={formSispot.l} onChange={e => setFormSispot({...formSispot, l: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="L" />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tinggi</label>
                    <input type="number" step="any" required value={formSispot.t} onChange={e => setFormSispot({...formSispot, t: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="T" />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 uppercase ${prefs.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Qty</label>
                    <input type="number" required value={formSispot.qty} onChange={e => setFormSispot({...formSispot, qty: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 ${prefs.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Qty" />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 font-bold text-sm rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 font-bold text-sm bg-accent-blue text-white rounded-lg hover:bg-blue-600 shadow transition-colors">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertTriangle size={24} /></div>
              <h3 className="font-bold text-lg text-gray-800">Hapus Sisa Potong</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">Apakah Anda yakin ingin menghapus data sisa potong ini? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={executeDelete} className="px-4 py-2 text-sm font-bold rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SisaPotong;
