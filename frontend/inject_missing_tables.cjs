const fs = require('fs');
let code = fs.readFileSync('./src/pages/DatabaseCycle.jsx', 'utf8');

const matriksHorizontalUI = `
              {/* ========================================== */}
              {/* MATRIKS SHORT BLOCK                       */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-blue-500" />
                    <h3 className="font-bold text-navy-dark">Matriks Short Block</h3>
                    <span className="text-xs text-blue-600 font-bold ml-1">— Horizontal Machine Area</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 uppercase border-b border-gray-200 font-bold tracking-wider">
                        <th className="p-2 border-r border-gray-200">Varians</th>
                        <th className="p-2 border-r border-gray-200">Short Block Based</th>
                        <th className="p-2 border-r border-gray-200">C1</th>
                        <th className="p-2 border-r border-gray-200">C2</th>
                        <th className="p-2 border-r border-gray-200">PTU</th>
                        <th className="p-2 border-r border-gray-200">PMA</th>
                        <th className="p-2 border-r border-gray-200">PMU</th>
                        <th className="p-2 border-r border-gray-200">C3</th>
                        <th className="p-2 border-r border-gray-200" colSpan={13}>Equivalent Short Block Product</th>
                        <th className="p-2">Dummy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriksHorizontal.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 bg-white hover:bg-gray-50">
                          <td className="p-2 font-bold border-r border-gray-200">{row.varians}</td>
                          <td className="p-2 font-semibold border-r border-gray-200">{row.base}</td>
                          <td className="p-2 border-r border-gray-100">{row.c1.toFixed(2)}</td>
                          <td className="p-2 border-r border-gray-100">{row.c2.toFixed(2)}</td>
                          <td className="p-2 border-r border-gray-100">{row.ptu.toFixed(2)}</td>
                          <td className="p-2 border-r border-gray-100">{row.pma.toFixed(2)}</td>
                          <td className="p-2 border-r border-gray-100">{row.pmu.toFixed(2)}</td>
                          <td className="p-2 border-r border-gray-100">{row.c3.toFixed(2)}</td>
                          {[...Array(13)].map((_, i) => {
                            const val = row.products[i];
                            if (val) {
                              return <td key={i} className="p-1 border-r border-gray-100 whitespace-nowrap min-w-[35px] text-gray-700 font-medium">{val}</td>;
                            } else {
                              return <td key={i} className="p-1 border-r border-gray-100 bg-gray-400 min-w-[35px]"></td>;
                            }
                          })}
                          <td className="p-2 font-bold bg-gray-50 border-l border-gray-200">{row.dummy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
`;

const opcHorizontalUI = `
              {/* ========================================== */}
              {/* OPERATION PROCESS CHART (OPC)             */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
                  <GitMerge size={18} className="text-blue-500" />
                  <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
                </div>
                <div className="p-8 bg-white flex justify-center">
                  <div className="relative flex flex-col items-center w-full max-w-sm">
                    {/* Top Horizontal Line + Label */}
                    <div className="w-48 h-[2px] bg-[#1f2937] mb-6 relative mt-4">
                       <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-600 text-center uppercase tracking-wider">
                          Bagian<br/>Atas
                       </div>
                    </div>
                    <div className="w-[3px] h-6 bg-[#1f2937] -mt-6 mb-1"></div>
                    {opcHorizontalData.map((row, idx) => (
                      <React.Fragment key={idx}>
                        <div className="relative z-10 w-full flex items-center justify-center group">
                          <div className="w-1/2 pr-6 text-right">
                            <span className="text-[10px] font-mono font-medium text-gray-700">{row.totalCT}</span>
                          </div>
                          <div className="w-[60px] h-[60px] rounded-full border-[3px] border-[#1f2937] bg-white flex items-center justify-center font-bold text-[#1f2937] shadow-sm z-10 shrink-0 text-sm">
                            {row.kode.replace(/\\s+/g, ' ')}
                          </div>
                          <div className="w-1/2 pl-6 text-left flex flex-col justify-center">
                            <div className="text-[9px] font-bold text-gray-700 uppercase tracking-wide leading-tight">{row.nama}</div>
                            <div className="text-[8px] font-semibold text-gray-500 mt-1">{row.mesin}</div>
                          </div>
                        </div>
                        {idx < opcHorizontalData.length - 1 && (
                          <div className="flex flex-col items-center w-full my-0.5">
                            <div className="w-[3px] h-7 bg-[#1f2937]"></div>
                            <svg width="12" height="10" viewBox="0 0 12 10" fill="#1f2937" className="-mt-[1px]">
                              <polygon points="0,0 12,0 6,10" />
                            </svg>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    <div className="flex flex-col items-center w-full my-0.5">
                      <div className="w-[3px] h-7 bg-[#1f2937]"></div>
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="#1f2937" className="-mt-[1px]">
                        <polygon points="0,0 12,0 6,10" />
                      </svg>
                    </div>
                    <div className="mt-1 z-10">
                      <svg width="48" height="40" viewBox="0 0 48 40" fill="white" stroke="#1f2937" strokeWidth="3">
                        <polygon points="2,2 46,2 24,38" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
`;

const matriksCarouselUI = `
              {/* ========================================== */}
              {/* MATRIKS SHORT BLOCK                       */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-purple-500" />
                    <h3 className="font-bold text-navy-dark">Matriks Short Block</h3>
                    <span className="text-xs text-purple-600 font-bold ml-1">— Carousel Machine Area</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 uppercase border-b border-gray-200 font-bold tracking-wider">
                        <th className="p-2 border-r border-gray-200">Varians</th>
                        <th className="p-2 border-r border-gray-200">Short Block Based</th>
                        <th className="p-2 border-r border-gray-200">C1</th>
                        <th className="p-2 border-r border-gray-200">C2</th>
                        <th className="p-2 border-r border-gray-200">PTU</th>
                        <th className="p-2 border-r border-gray-200">PMA</th>
                        <th className="p-2 border-r border-gray-200">C3</th>
                        <th className="p-2 border-r border-gray-200" colSpan={23}>Equivalent Short Block Product</th>
                        <th className="p-2">Dummy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriksCarousel.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100 bg-white hover:bg-gray-50">
                          <td className="p-2 font-bold border-r border-gray-200">{row.varians}</td>
                          <td className="p-2 font-semibold border-r border-gray-200">{row.base}</td>
                          <td className="p-2 border-r border-gray-100">{row.c1.toFixed(1)}</td>
                          <td className="p-2 border-r border-gray-100">{row.c2}</td>
                          <td className="p-2 border-r border-gray-100">{row.ptu.toFixed(1)}</td>
                          <td className="p-2 border-r border-gray-100">{row.pma.toFixed(1)}</td>
                          <td className="p-2 border-r border-gray-100">{row.c3.toFixed(1)}</td>
                          {[...Array(23)].map((_, i) => {
                            const val = row.products[i];
                            if (val) {
                              return <td key={i} className="p-1 border-r border-gray-100 whitespace-nowrap min-w-[35px] text-gray-700 font-medium">{val}</td>;
                            } else {
                              return <td key={i} className="p-1 border-r border-gray-100 bg-gray-400 min-w-[35px]"></td>;
                            }
                          })}
                          <td className="p-2 font-bold bg-gray-50 border-l border-gray-200">{row.dummy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
`;

const opcCarouselUI = `
              {/* ========================================== */}
              {/* OPERATION PROCESS CHART (OPC)             */}
              {/* ========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
                  <GitMerge size={18} className="text-purple-500" />
                  <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
                </div>
                <div className="p-8 bg-white flex justify-center">
                  <div className="relative flex flex-col items-center w-full max-w-sm">
                    {/* Top Horizontal Line + Label */}
                    <div className="w-48 h-[2px] bg-[#1f2937] mb-6 relative mt-4">
                       <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-600 text-center uppercase tracking-wider">
                          Bagian<br/>Atas
                       </div>
                    </div>
                    <div className="w-[3px] h-6 bg-[#1f2937] -mt-6 mb-1"></div>
                    {opcCarouselData.map((row, idx) => (
                      <React.Fragment key={idx}>
                        <div className="relative z-10 w-full flex items-center justify-center group">
                          <div className="w-1/2 pr-6 text-right">
                            <span className="text-[10px] font-mono font-medium text-gray-700">{row.totalCT}</span>
                          </div>
                          <div className="w-[60px] h-[60px] rounded-full border-[3px] border-[#1f2937] bg-white flex items-center justify-center font-bold text-[#1f2937] shadow-sm z-10 shrink-0 text-sm">
                            {row.kode.replace(/\\s+/g, ' ')}
                          </div>
                          <div className="w-1/2 pl-6 text-left flex flex-col justify-center">
                            <div className="text-[9px] font-bold text-gray-700 uppercase tracking-wide leading-tight">{row.nama}</div>
                            <div className="text-[8px] font-semibold text-gray-500 mt-1">{row.mesin}</div>
                          </div>
                        </div>
                        {idx < opcCarouselData.length - 1 && (
                          <div className="flex flex-col items-center w-full my-0.5">
                            <div className="w-[3px] h-7 bg-[#1f2937]"></div>
                            <svg width="12" height="10" viewBox="0 0 12 10" fill="#1f2937" className="-mt-[1px]">
                              <polygon points="0,0 12,0 6,10" />
                            </svg>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    <div className="flex flex-col items-center w-full my-0.5">
                      <div className="w-[3px] h-7 bg-[#1f2937]"></div>
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="#1f2937" className="-mt-[1px]">
                        <polygon points="0,0 12,0 6,10" />
                      </svg>
                    </div>
                    <div className="mt-1 z-10">
                      <svg width="48" height="40" viewBox="0 0 48 40" fill="white" stroke="#1f2937" strokeWidth="3">
                        <polygon points="2,2 46,2 24,38" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
`;

// Replace Horizontal OPC
const oldHorizontalOPCStart = code.indexOf('{/* OPERATION PROCESS CHART (OPC)', code.indexOf("activeMachine === 'horizontal'"));
const oldHorizontalOPCEnd = code.indexOf('</>', oldHorizontalOPCStart);

if (oldHorizontalOPCStart > -1 && oldHorizontalOPCEnd > -1) {
  const oldHorizontalSection = code.substring(oldHorizontalOPCStart, oldHorizontalOPCEnd);
  code = code.replace(oldHorizontalSection, matriksHorizontalUI + '\\n' + opcHorizontalUI + '\\n            ');
}

// Replace Carousel OPC
const oldCarouselOPCStart = code.indexOf('{/* OPERATION PROCESS CHART (OPC)', code.indexOf("activeMachine === 'carousel'"));
const oldCarouselOPCEnd = code.indexOf('</>', oldCarouselOPCStart);

if (oldCarouselOPCStart > -1 && oldCarouselOPCEnd > -1) {
  const oldCarouselSection = code.substring(oldCarouselOPCStart, oldCarouselOPCEnd);
  code = code.replace(oldCarouselSection, matriksCarouselUI + '\\n' + opcCarouselUI + '\\n            ');
}

fs.writeFileSync('./src/pages/DatabaseCycle.jsx', code);
console.log('Successfully injected UI for Horizontal and Carousel');
