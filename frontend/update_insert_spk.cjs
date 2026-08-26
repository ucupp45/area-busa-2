const fs = require('fs');
let code = fs.readFileSync('./src/pages/InsertSPK.jsx', 'utf8');

// 1. Add state
code = code.replace(
  "const [editMesinValue, setEditMesinValue] = useState('');",
  "const [editMesinValue, setEditMesinValue] = useState('');\n  const [editPrediksiSbValue, setEditPrediksiSbValue] = useState('');"
);

// 2. Update saveInlineEdit
code = code.replace(
  /if \(editMesinValue\) \{\s*newData\[idx\]\.mesinTujuan = editMesinValue;\s*\}/,
  \`if (editMesinValue) {
        newData[idx].mesinTujuan = editMesinValue;
    }
    if (editPrediksiSbValue !== '') {
        newData[idx].prediksi_sb = Number(editPrediksiSbValue);
    }\`
);

// 3. Remove option Perforasi
code = code.replace(
  '<option value="Perforasi">Perforasi</option>',
  ''
);

// 4. Update editing init
code = code.replace(
  "setEditMesinValue(row.mesinTujuan || 'Vertikal');",
  "setEditMesinValue(row.mesinTujuan || 'Vertikal'); \n                                setEditPrediksiSbValue(row.prediksi_sb || '');"
);

// 5. Add table header
code = code.replace(
  '<th className="p-4 font-semibold text-center">Qty Ordered</th>',
  '<th className="p-4 font-semibold text-center">Qty Ordered</th>\n                  <th className="p-4 font-semibold text-center">Kebutuhan SB</th>'
);

// 6. Update Description column to show T. Balokan
code = code.replace(
  '<div className="font-bold text-gray-800">{row.item}</div>',
  \`<div className="font-bold text-gray-800">{row.item}</div>
                      {row.tinggi_balokan && (
                          <div className="text-[10px] font-bold text-gray-400 mt-0.5">T. Balokan: {row.tinggi_balokan} cm</div>
                      )}\`
);

// 7. Add Kebutuhan SB cell
const originalQtyTd = \`                    <td className="p-4 text-center font-bold text-blue-600">
                      {editingRowIndex === idx ? (
                        <input
                          type="number"
                          step="0.01"
                          className="w-20 px-2 py-1 border border-blue-400 rounded text-center text-sm font-bold text-navy-dark focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={editQtyValue}
                          onChange={(e) => setEditQtyValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(idx);
                            if (e.key === 'Escape') setEditingRowIndex(null);
                          }}
                        />
                      ) : (
                        <>
                          {row.qty} PC
                        </>
                      )}
                    </td>\`;

const newSbTd = \`                    <td className="p-4 text-center font-bold text-purple-600">
                      {editingRowIndex === idx && row.mesinTujuan === 'Vertikal' ? (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="SB"
                          className="w-16 px-2 py-1 border border-purple-400 rounded text-center text-sm font-bold text-navy-dark focus:outline-none focus:ring-2 focus:ring-purple-200"
                          value={editPrediksiSbValue}
                          onChange={(e) => setEditPrediksiSbValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(idx);
                            if (e.key === 'Escape') setEditingRowIndex(null);
                          }}
                        />
                      ) : (
                        row.mesinTujuan === 'Vertikal' ? (
                          row.prediksi_sb ? \`\${row.prediksi_sb} SB\` : '-'
                        ) : '-'
                      )}
                    </td>\`;

code = code.replace(originalQtyTd, originalQtyTd + '\n' + newSbTd);

fs.writeFileSync('./src/pages/InsertSPK.jsx', code);
console.log('InsertSPK.jsx updated successfully!');
