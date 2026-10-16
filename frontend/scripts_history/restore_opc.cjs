const fs = require('fs');
let code = fs.readFileSync('./src/pages/DatabaseCycle.jsx', 'utf8');

// Function to generate OPC block
const getOpcBlock = (dataVar, colorClass) => `
      {/* ========================================== */}
      {/* OPERATION PROCESS CHART (OPC)             */}
      {/* ========================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
          <GitMerge size={18} className="\${colorClass}" />
          <h3 className="font-bold text-navy-dark">Operation Process Chart (OPC)</h3>
        </div>

        <div className="p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
            {\${dataVar}.map((row, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-10 h-10 bg-navy-dark text-white rounded-full flex items-center justify-center font-bold shadow-sm border-[3px] border-white group-hover:bg-blue-500 group-hover:border-blue-100 transition-colors shrink-0 text-sm">
                  {idx + 1}
                </div>
                <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-lg flex-1 font-bold text-gray-700 shadow-sm group-hover:border-blue-300 transition-colors text-sm flex items-center justify-between">
                  <span>{row.nama}</span>
                  <span className="text-gray-300 text-xs font-mono font-normal">{row.kode}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
`;

// Vertikal Replace
const endVertikal = \`        </div>
      </div>
      )}

      {/* ========================================== */}
      {/* TABEL CYCLE TIME — HORIZONTAL MACHINE      */}
\`;
const repVertikal = \`        </div>
      </div>
\${getOpcBlock('operasiData', 'text-accent-blue')}
      )}

      {/* ========================================== */}
      {/* TABEL CYCLE TIME — HORIZONTAL MACHINE      */}
\`;
code = code.replace(endVertikal, repVertikal);

// Horizontal Replace
const endHorizontal = \`        </div>
      </div>
      )}

      {/* ========================================== */}
      {/* TABEL CYCLE TIME — CAROUSEL MACHINE        */}
\`;
const repHorizontal = \`        </div>
      </div>
\${getOpcBlock('horizontalOpcData', 'text-blue-500')}
      )}

      {/* ========================================== */}
      {/* TABEL CYCLE TIME — CAROUSEL MACHINE        */}
\`;
code = code.replace(endHorizontal, repHorizontal);

// Carousel Replace
const endCarousel = \`        </div>
      </div>
      )}
    </div>
  );
};

export default DatabaseCycle;\`;

const repCarousel = \`        </div>
      </div>
\${getOpcBlock('carouselOpcData', 'text-green-500')}
      )}
    </div>
  );
};

export default DatabaseCycle;\`;
code = code.replace(endCarousel, repCarousel);

fs.writeFileSync('./src/pages/DatabaseCycle.jsx', code);
console.log('OPC tables restored!');
