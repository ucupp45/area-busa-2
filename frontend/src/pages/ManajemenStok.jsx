import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Loader } from 'lucide-react';

const ManajemenStok = () => {
  const [stokData, setStokData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Menarik data dari Backend saat halaman pertama kali dibuka
  useEffect(() => {
    const fetchStok = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/spk/rekap-stok');
        setStokData(response.data);
      } catch (error) {
        console.error("Gagal mengambil data stok:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStok();
  }, []);

  // Filter pencarian berdasarkan Nama Item atau Varians
  const filteredData = stokData.filter(item =>
    item.nama_item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.varians && item.varians.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Fungsi untuk memformat tanggal (Contoh: 17/07/2026 07:00)
  const formatTanggal = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* HEADER TABEL & SEARCH BAR */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-accent-blue border border-blue-100 shadow-sm">
               <Package size={20} />
            </div>
            <h3 className="font-bold text-navy-dark text-lg">Request Sheet</h3>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Cari nama item atau varians..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue bg-white transition-all"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* TABEL DATA STOK */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-accent-blue">
               <Loader size={32} className="animate-spin mb-3" />
               <p className="font-semibold text-navy-dark">Memuat Data Stok...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-gray-400 text-xs font-bold uppercase border-b border-gray-100">
                  <th className="p-5">Nama Item</th>
                  <th className="p-5">Varians</th>
                  <th className="p-5 text-center">Quantity Request</th>
                  <th className="p-5">Waktu Pemotongan</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-600">
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-5 font-extrabold text-navy-dark">{row.nama_item}</td>
                      <td className="p-5 font-medium text-gray-500">{row.varians || '-'}</td>
                      <td className="p-5 text-center font-extrabold text-lg text-navy-dark">{Number(row.total_qty)}</td>
                      <td className="p-5 font-medium text-gray-600">{formatTanggal(row.waktu_pemotongan)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-400 font-semibold">
                      Tidak ada data request item ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default ManajemenStok;