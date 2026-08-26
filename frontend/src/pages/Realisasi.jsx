import React from 'react';
import { Activity, Layers } from 'lucide-react';

const Realisasi = () => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="bg-navy-dark text-white px-6 py-4 rounded-xl shadow flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Realisasi Produksi
          </h2>
          <p className="text-accent-blue text-sm mt-1">
            Pantau kinerja dan kualitas hasil produksi secara real-time
          </p>
        </div>
      </div>

      {/* ===== KINERJA REALTIME PER SHIFT ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-bold text-navy-dark flex items-center gap-2">
            <Activity size={17} className="text-accent-blue" />
            Kinerja Realtime Per Shift
          </h3>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
            Live
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {[
            { shift: 'Shift 1', jam: '07:00 – 14:00', kinerja: 0, target: 0, realisasi: 0, status: 'Menunggu' },
            { shift: 'Shift 2', jam: '14:00 – 21:00', kinerja: 0, target: 0, realisasi: 0, status: 'Menunggu' },
            { shift: 'Shift 3', jam: '21:00 – 06:00', kinerja: 0, target: 0, realisasi: 0, status: 'Menunggu' },
          ].map((s, i) => (
            <div key={i} className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-navy-dark text-base">{s.shift}</div>
                  <div className="text-xs text-gray-400">{s.jam}</div>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                  {s.status}
                </span>
              </div>
              {/* Progress bar kinerja */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Kinerja</span>
                  <span className="font-bold text-navy-dark">{s.kinerja}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-accent-blue h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${s.kinerja}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 border-t pt-2 border-gray-100">
                <span>Target: <span className="font-bold text-gray-700">{s.target} pcs</span></span>
                <span>Realisasi: <span className="font-bold text-blue-600">{s.realisasi} pcs</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== QUALITY OF FOAM ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
          <Layers size={17} className="text-accent-blue" />
          <h3 className="font-bold text-navy-dark">Quality Of Foam</h3>
          <span className="text-xs text-gray-400 font-medium ml-1">(per jenis busa/foam)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="p-4 font-semibold">Jenis Foam</th>
                <th className="p-4 font-semibold text-center">Total Diproduksi</th>
                <th className="p-4 font-semibold text-center">Bagus (OK)</th>
                <th className="p-4 font-semibold text-center">Reject (NG)</th>
                <th className="p-4 font-semibold">Quality Rate</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {[
                { foam: 'LBR R 100', grade: 'R', ok: 0, ng: 0, total: 0 },
                { foam: 'LBR BC 21 WHITE', grade: 'BC', ok: 0, ng: 0, total: 0 },
                { foam: 'LBR D 16 HARD YELLOW', grade: 'D', ok: 0, ng: 0, total: 0 },
                { foam: 'LBR RF GREEN C', grade: 'RF', ok: 0, ng: 0, total: 0 },
                { foam: 'LBR D 22 LIGHT GREEN', grade: 'D', ok: 0, ng: 0, total: 0 },
              ].map((f, i) => {
                const qualityRate = f.total === 0 ? 0 : Math.round((f.ok / f.total) * 100);
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-navy-dark">{f.foam}</div>
                      <div className="text-xs text-gray-400">Grade {f.grade}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-gray-700">{f.total}</td>
                    <td className="p-4 text-center font-bold text-green-600">{f.ok}</td>
                    <td className="p-4 text-center font-bold text-red-500">{f.ng}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${qualityRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-8 text-right">{qualityRate}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        Menunggu Data
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Realisasi;
