const fs = require('fs');
let code = fs.readFileSync('./src/pages/DatabaseCycle.jsx', 'utf8');

if (!code.includes('useState')) {
  code = code.replace("import React from 'react';", "import React, { useState } from 'react';");
}

code = code.replace(
  "const { mesin } = useParams();\n  const activeMachine = mesin || 'vertikal';",
  "const { mesin } = useParams();\n  const activeMachine = mesin || 'vertikal';\n  const [activeTab, setActiveTab] = useState('cycle_time');"
);

// Add the arrays
const dataArrays = `
  const tinggiShortBlockData = [
    { busa: 'BC 16', tinggi: 115 }, { busa: 'BC 18', tinggi: 115 }, { busa: 'BC 21', tinggi: 115 }, { busa: 'BC 25', tinggi: 105 },
    { busa: 'D 11', tinggi: 115 }, { busa: 'D 12', tinggi: 115 }, { busa: 'D 13', tinggi: 115 }, { busa: 'D 14', tinggi: 115 },
    { busa: 'D 15', tinggi: 105 }, { busa: 'D 16', tinggi: 115 }, { busa: 'D 18', tinggi: 115 }, { busa: 'D 19', tinggi: 115 },
    { busa: 'D 20', tinggi: 115 }, { busa: 'D 22', tinggi: 115 }, { busa: 'D 23', tinggi: 115 }, { busa: 'D 24', tinggi: 115 },
    { busa: 'D 25', tinggi: 115 }, { busa: 'D 26', tinggi: 80 }, { busa: 'D 28', tinggi: 105 }, { busa: 'D 30', tinggi: 105 },
    { busa: 'D 32', tinggi: 115 }, { busa: 'D 33', tinggi: 100 }, { busa: 'D 35', tinggi: 100 }, { busa: 'D 40', tinggi: 60 },
    { busa: 'D 42', tinggi: 65 }, { busa: 'D 50', tinggi: 45 }, { busa: 'D 55', tinggi: 45 }, { busa: 'FR 18', tinggi: 105 },
    { busa: 'FR 20', tinggi: 105 }, { busa: 'FR 22', tinggi: 105 }, { busa: 'FR 24', tinggi: 105 }, { busa: 'FR 25', tinggi: 105 },
    { busa: 'FR 30', tinggi: 70 }, { busa: 'FR 40', tinggi: 65 }, { busa: 'FR 5 - 40', tinggi: 65 }, { busa: 'FR 8 - 50', tinggi: 65 },
    { busa: 'FRH 40', tinggi: 65 }, { busa: 'GH 55', tinggi: 60 }, { busa: 'HR 24', tinggi: 75 }, { busa: 'HR 26', tinggi: 75 },
    { busa: 'HR 30', tinggi: 75 }, { busa: 'HR 35', tinggi: 75 }, { busa: 'R 100', tinggi: 45 }, { busa: 'R 40', tinggi: 85 },
    { busa: 'R 50', tinggi: 85 }, { busa: 'R 55', tinggi: 85 }, { busa: 'R 70', tinggi: 70 }, { busa: 'R 90', tinggi: 45 },
    { busa: 'RF GR', tinggi: 115 }, { busa: 'RF LI', tinggi: 115 }, { busa: 'RF YE', tinggi: 115 }, { busa: 'RH 3', tinggi: 115 },
    { busa: 'RHL 25', tinggi: 75 }, { busa: 'RHL 26', tinggi: 75 }, { busa: 'RHL 28', tinggi: 75 }, { busa: 'RHL 32', tinggi: 75 },
    { busa: 'RHL 35', tinggi: 75 }, { busa: 'RHL 50', tinggi: 60 }, { busa: 'RHL 55', tinggi: 60 }, { busa: 'RK 2', tinggi: 115 }
  ];

  const matriksProductData = [
    { base: 'D 11', setara: ['D 12'] },
    { base: 'D 14', setara: ['D 13'] },
    { base: 'D 15', setara: ['RF GR', 'RF LI', 'RF YE'] },
    { base: 'D 16', setara: [] },
    { base: 'D 18', setara: ['D 19', 'FR 18', 'BC 16', 'BC 18', 'RH 3'] },
    { base: 'D 20', setara: ['FR 20'] },
    { base: 'D 22', setara: ['D 23', 'FR 22'] },
    { base: 'D 24', setara: ['D 26', 'D 25', 'FR 24', 'HR 24', 'FR 25', 'RHL 25', 'RHL 26', 'RHL 28', 'BC 25', 'HR 26'] },
    { base: 'D 32', setara: ['D 28', 'D 30', 'D 33', 'D 35', 'FR 30', 'RHL 32', 'HR 30', 'RHL 35', 'HR 35'] },
    { base: 'D 55', setara: ['D 40', 'D 50', 'FRH 40', 'FR 40', 'FR 5 - 40', 'D 42', 'FR 8 - 50', 'RHL 50', 'RHL 55', 'GH 55'] },
    { base: 'RK 2', setara: [] },
    { base: 'R 50', setara: ['R 40', 'R 55'] },
    { base: 'R 100', setara: ['R 70', 'R 90'] },
    { base: 'BC 21', setara: [] }
  ];
`;

code = code.replace("const UPDATE_DATE = '14 JULI 2026';", dataArrays + "\n  const UPDATE_DATE = '14 JULI 2026';");

const tabsUI = `
      {/* TABS NAVIGATION */}
      <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm w-fit mb-2">
        <button
          onClick={() => setActiveTab('cycle_time')}
          className={\`px-6 py-2.5 rounded-md text-sm font-bold transition-all \${activeTab === 'cycle_time' ? 'bg-navy-dark text-white shadow' : 'text-gray-500 hover:text-navy-dark hover:bg-gray-50'}\`}
        >
          Data Cycle Time
        </button>
        <button
          onClick={() => setActiveTab('matriks_ketinggian')}
          className={\`px-6 py-2.5 rounded-md text-sm font-bold transition-all \${activeTab === 'matriks_ketinggian' ? 'bg-navy-dark text-white shadow' : 'text-gray-500 hover:text-navy-dark hover:bg-gray-50'}\`}
        >
          Matriks Ketinggian Short Block
        </button>
      </div>

      {activeTab === 'matriks_ketinggian' ? (
        <div className="flex flex-col gap-6 animate-in fade-in">
          {/* TABEL TINGGI SHORT BLOCK */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
            <div className="p-5 border-b border-gray-200 bg-gray-50/50">
              <h3 className="font-bold text-navy-dark">Tinggi Short Block (CM)</h3>
            </div>
            <div className="p-5 overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr className="bg-navy-dark text-white text-xs uppercase">
                    <th className="p-3 font-semibold border-r border-blue-800">Quality Busa</th>
                    <th className="p-3 font-semibold text-center">Tinggi Short Block (CM)</th>
                  </tr>
                </thead>
                <tbody>
                  {tinggiShortBlockData.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3 border-r border-gray-100 font-bold text-navy-dark">{item.busa}</td>
                      <td className="p-3 text-center text-blue-600 font-bold">{item.tinggi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL MATRIKS PRODUCT */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
            <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-1">
              <h3 className="font-bold text-navy-dark text-lg uppercase">Matriks Product</h3>
              <div className="text-xs text-gray-500 font-bold">PRODUCT TYPE : <span className="text-red-500">SHORT BLOCK (FOAM)</span></div>
              <div className="text-xs text-gray-500 font-bold">PLANT LOCATION : <span className="text-navy-dark">ROYAL 1</span></div>
              <div className="text-xs text-gray-500 font-bold">PLANT AREA : <span className="text-red-500">BUSA 2</span></div>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-dark text-white text-xs uppercase">
                    <th className="p-3 font-semibold border-r border-blue-800" rowSpan="2">Quality Busa</th>
                    <th className="p-3 font-semibold text-center" colSpan="10">Produk Setara</th>
                  </tr>
                  <tr className="bg-gray-100 text-gray-500 text-xs">
                    {[...Array(10)].map((_, i) => (
                      <th key={i} className="p-2 border border-gray-200 text-center font-bold">{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matriksProductData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3 border-r border-gray-100 font-bold text-navy-dark bg-gray-50">{row.base}</td>
                      {[...Array(10)].map((_, i) => (
                        <td key={i} className={\`p-2 border border-gray-100 text-center text-xs font-semibold \${row.setara[i] ? 'text-gray-700' : 'bg-gray-800'}\`}>
                          {row.setara[i] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
`;

code = code.replace(
  '{/* Alert Banner */}', 
  tabsUI + '\n      {/* Alert Banner */}'
);

const parts = code.split('return (');
const body = parts[1];
const endingIdx = body.lastIndexOf('</div>');
code = parts[0] + 'return (' + body.substring(0, endingIdx) + '        </>\n      )\n      }\n    </div>' + body.substring(endingIdx + 6);

fs.writeFileSync('./src/pages/DatabaseCycle.jsx', code);
console.log('Update finished.');
