const fs = require('fs');
let code = fs.readFileSync('./src/pages/DatabaseCycle.jsx', 'utf8');

// Find the last `.reduce((sum, r) => sum + r[key], 0);`
const idx = code.lastIndexOf('.reduce((sum, r) => sum + r[key], 0);');

if (idx !== -1) {
  // We will truncate from this index and rebuild the rest
  code = code.substring(0, idx + 37);
  
  const restOfCode = `
                  return (
                    <td key={key} className="p-3 text-center font-bold text-navy-dark border-r border-yellow-300 last:border-r-0">
                      {total.toFixed(1)}
                    </td>
                  );
                })}
                <td className="p-3 text-center font-bold text-navy-dark border-l-2 border-yellow-300 bg-yellow-100">
                  {horizontalOpcData.reduce((sum, r) => sum + r.L, 0).toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* ========================================== */}
      {/* TABEL CYCLE TIME — CAROUSEL MACHINE        */}
      {/* ========================================== */}
      {activeMachine === 'carousel' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-purple-500" />
            <h3 className="font-bold text-navy-dark">Cycle Time Varians (Detik)</h3>
            <span className="text-xs text-purple-600 font-bold ml-1">— Carousel Machine Area</span>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Update: {UPDATE_DATE}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="p-3 font-semibold border-r border-gray-200 w-20">Code CT</th>
                <th className="p-3 font-semibold border-r border-gray-200 w-48">Detail Operations</th>
                <th className="p-3 font-semibold text-center border-r border-gray-200 w-24">Code Ops</th>
                {['I','II','III','IV','V'].map(v => (
                  <th key={v} className="p-3 font-semibold text-center border-r border-gray-100 last:border-r-0">{v}</th>
                ))}
                <th className="p-3 font-semibold text-center bg-purple-50 border-l-2 border-purple-200">L</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {carouselOpcData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                  <td className="p-3 font-bold text-navy-dark border-r border-gray-200 text-xs">{row.codeCT}</td>
                  <td className="p-3 font-semibold text-navy-dark border-r border-gray-200 text-xs tracking-wide uppercase">{row.nama}</td>
                  <td className="p-3 text-center font-mono font-bold text-gray-500 border-r border-gray-200 text-xs">{row.kode}</td>
                  {['i','ii','iii','iv','v'].map(key => (
                    <td key={key} className="p-3 text-center text-gray-700 font-medium border-r border-gray-100 last:border-r-0">{row[key] > 0 ? row[key].toFixed(1) : '0.0'}</td>
                  ))}
                  <td className="p-3 text-center font-bold text-purple-700 bg-purple-50 border-l-2 border-purple-200">{row.L.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                <td colSpan={3} className="p-3 font-black text-center text-navy-dark text-xs uppercase tracking-wider border-r border-yellow-300">
                  Total Cycle Time
                </td>
                {['i','ii','iii','iv','v'].map(key => {
                  const total = carouselOpcData.reduce((sum, r) => sum + r[key], 0);
                  return (
                    <td key={key} className="p-3 text-center font-bold text-navy-dark border-r border-yellow-300 last:border-r-0">
                      {total.toFixed(1)}
                    </td>
                  );
                })}
                <td className="p-3 text-center font-bold text-navy-dark border-l-2 border-yellow-300 bg-yellow-100">
                  {carouselOpcData.reduce((sum, r) => sum + r.L, 0).toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}
      </>
      )}
    </div>
  );
};

export default DatabaseCycle;
`;
  
  code = code + restOfCode;
  fs.writeFileSync('./src/pages/DatabaseCycle.jsx', code);
  console.log("Restored rest of DatabaseCycle.jsx!");
} else {
  console.log("Could not find anchor.");
}
