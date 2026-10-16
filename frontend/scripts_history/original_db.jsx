import React from 'react';
import { Database, GitMerge, Clock } from 'lucide-react';

const DatabaseCycle = () => {
  // ==========================================
  // DATA OPC + CYCLE TIME PER OPERASI (Detik)
  // Sesuai tabel referensi update 14 Juli 2026
  // ==========================================
  const operasiData = [
    { kode: 'O - 1',  nama: 'LOADING MATERIAL',      i: 8.1,  ii: 8.4,  iii: 8.7,  iv: 14.0, v: 13.3, vi: 10.5 },
    { kode: 'O - 2',  nama: 'POSITIONING MATERIAL',  i: 7.3,  ii: 9.9,  iii: 8.5,  iv: 11.0, v: 9.5,  vi: 12.7 },
    { kode: 'O - 3',  nama: 'POTONG SISI PERTAMA',   i: 12.1, ii: 13.5, iii: 14.2, iv: 18.5, v: 18.9, vi: 24.6 },
    { kode: 'O - 4',  nama: 'POSITIONING MATERIAL',  i: 10.8, ii: 15.4, iii: 13.9, iv: 13.0, v: 15.5, vi: 17.0 },
    { kode: 'O - 5',  nama: 'POTONG SISI KEDUA',     i: 14.7, ii: 16.1, iii: 18.1, iv: 19.5, v: 15.8, vi: 28.4 },
    { kode: 'O - 6',  nama: 'POSITIONING MATERIAL',  i: 10.3, ii: 11.2, iii: 12.4, iv: 13.0, v: 15.5, vi: 29.9 },
    { kode: 'O - 7',  nama: 'POTONG SISI KETIGA',    i: 13.2, ii: 11.9, iii: 13.9, iv: 13.7, v: 17.3, vi: 28.6 },
    { kode: 'O - 8',  nama: 'POSITIONING MATERIAL',  i: 10.3, ii: 10.4, iii: 13.5, iv: 12.0, v: 15.5, vi: 25.1 },
    { kode: 'O - 9',  nama: 'POTONG SISI KEEMPAT',   i: 11.7, ii: 10.0, iii: 14.3, iv: 11.0, v: 13.8, vi: 16.4 },
    { kode: 'O - 10', nama: 'UNLOADING',             i: 11.7, ii: 11.5, iii: 12.8, iv: 14.5, v: 16.7, vi: 24.4 },
  ];

  // Total Cycle Time (Detik) & konversi ke Menit
  const totalData = { i: 110.2, ii: 118.3, iii: 130.4, iv: 140.1, v: 151.8, vi: 217.5 };

  // Konversi ke menit (dibulatkan 2 desimal) — dipakai backend
  const mnitData = {
    i:   (110.2 / 60).toFixed(2),
    ii:  (118.3 / 60).toFixed(2),
    iii: (130.4 / 60).toFixed(2),
    iv:  (140.1 / 60).toFixed(2),
    v:   (151.8 / 60).toFixed(2),
    vi:  (217.5 / 60).toFixed(2),
  };

  const varians = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const varKeys = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];

  // ==========================================
  // DATA OPC (10 Langkah)
  // ==========================================
  const opcSteps = operasiData.map(o => o.nama);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Alert Banner */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center gap-3 text-blue-800 shadow-sm">
        <Database size={20} className="text-accent-blue shrink-0" />
        <span className="text-sm font-semibold">
          Halaman ini Menampilkan referensi Total Cycle Time dan Operation Process Chart (OPC) untuk area Mesin Vertikal.
        </span>
      </div>

      {/* ========================================== */}
      {/* TABEL PENUH — CYCLE TIME VARIANS (DETIK)  */}
      {/* ========================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
          <Clock size={18} className="text-accent-blue" />
          <h3 className="font-bold text-navy-dark">Cycle Time Varians (Detik)</h3>
          <span className="text-xs text-gray-400 font-medium ml-1">— Data Referensi Mesin Vertikal</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="p-3 font-semibold border-r border-gray-200 w-48">Detail Operations</th>
                <th className="p-3 font-semibold text-center border-r border-gray-200 w-24">Code Operations</th>
                {varians.map(v => (
                  <th key={v} className="p-3 font-semibold text-center border-r border-gray-100 last:border-r-0">{v}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {operasiData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 font-semibold text-navy-dark border-r border-gray-200 text-xs tracking-wide uppercase">
                    {row.nama}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-gray-500 border-r border-gray-200 text-xs">
                    {row.kode}
                  </td>
                  {varKeys.map(key => (
                    <td key={key} className="p-3 text-center text-gray-700 font-medium border-r border-gray-100 last:border-r-0">
                      {row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {/* BARIS TOTAL CYCLE TIME — highlight kuning */}
            <tfoot>
              <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                <td colSpan={2} className="p-3 font-black text-center text-navy-dark text-xs uppercase tracking-wider border-r border-yellow-300">
                  Total Cycle Time
                </td>
                {varKeys.map(key => (
                  <td key={key} className="p-3 text-center font-black text-navy-dark border-r border-yellow-200 last:border-r-0">
                    <div className="flex flex-col items-center">
                      <span className="text-base">{totalData[key]}</span>
                      <span className="text-xs font-semibold text-gray-500">{mnitData[key]} mnt</span>
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 font-medium">
          *CT (Menit/Pcs) di bawah total adalah nilai yang digunakan sistem backend untuk kalkulasi prediksi waktu produksi.
        </div>
      </div>

      {/* ========================================== */}
      {/* OPERATION PROCESS CHART (OPC)             */}
      {/* ========================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
          <GitMerge size={18} className="text-accent-blue" />
          <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
        </div>

        <div className="p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
            {opcSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                {/* Lingkaran Nomor */}
                <div className="w-10 h-10 bg-navy-dark text-white rounded-full flex items-center justify-center font-bold shadow-sm border-[3px] border-white group-hover:bg-accent-blue group-hover:border-blue-100 transition-colors shrink-0 text-sm">
                  {idx + 1}
                </div>
                {/* Box Teks */}
                <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-lg flex-1 font-bold text-gray-700 shadow-sm group-hover:border-accent-blue/50 transition-colors text-sm flex items-center justify-between">
                  <span>{step}</span>
                  <span className="text-gray-300 text-xs font-mono font-normal">O-{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DatabaseCycle;