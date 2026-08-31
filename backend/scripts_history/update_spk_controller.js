const fs = require('fs');
let code = fs.readFileSync('./controllers/spkController.js', 'utf8');

const matchAndCalculateReplacement = `// ============================================================
// FUNGSI PENCOCOKAN & KALKULASI (digunakan oleh Excel & PDF)
// ============================================================
async function matchAndCalculate(rawRows) {
    const [matrixData] = await db.query('SELECT id, nama_item, cycle_time_menit, tipe_mesin, tinggi_balokan_standar FROM cycle_time_matrix');

    let parsedData = [];
    let summaryPerMesin = {
        'Vertikal': { totalWaktu: 0, totalQty: 0 },
        'Horizontal': { totalWaktu: 0, totalQty: 0 },
        'Carousel': { totalWaktu: 0, totalQty: 0 },
        'CNC': { totalWaktu: 0, totalQty: 0 }
    };

    const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);

    // TAHAP 1: Hitung Kebutuhan SB per baris, biarkan array utuh (agar detail T tidak hilang di UI)
    for (const row of rawRows) {
        const p = Number(row.bahanBakuP) || 0;
        const l = Number(row.bahanBakuL) || 0;
        const t = Number(row.bahanBakuT) || 0;
        const actualQty = row.qtyBB !== undefined ? row.qtyBB : row.qty;
        
        row.p = p;
        row.l = l;
        row.t = t;
        row.actualQty = actualQty;

        const cleanItemName = row.item.replace(/\\s*\\([\\d.x]+\\)\\s*$/, '').trim();
        const cleanItemNoSpace = cleanItemName.replace(/\\s+/g, '').toLowerCase();
        
        row.cleanItemNoSpace = cleanItemNoSpace;
        row.tinggiBalokan = null;
        row.prediksiSB = null;

        const matchedTinggi = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\\s+/g, '').toLowerCase();
            return cleanItemNoSpace.includes(dbNameNoSpace) && m.tinggi_balokan_standar > 0;
        });

        if (matchedTinggi) {
            row.tinggiBalokan = Number(matchedTinggi.tinggi_balokan_standar);
            if (row.tinggiBalokan > 0 && t > 0) {
                row.prediksiSB = (t * actualQty) / row.tinggiBalokan;
            }
        }
    }

    // TAHAP 2: Agregasi (Grouping) P dan L untuk mendapatkan Total SB dari grup tersebut
    const groupSbMap = new Map();
    for (const row of rawRows) {
        const key = \`\${row.cleanItemNoSpace}_\${row.p}_\${row.l}\`;
        const currentSb = groupSbMap.get(key) || 0;
        groupSbMap.set(key, currentSb + (row.prediksiSB || 0));
    }

    // TAHAP 3: Penentuan Routing & Hitung Cycle Time
    for (const row of rawRows) {
        const key = \`\${row.cleanItemNoSpace}_\${row.p}_\${row.l}\`;
        const totalSbGroup = groupSbMap.get(key) || 0;
        
        let targetMachine = 'Horizontal'; // Default
        
        if (row.p > 0 && row.l > 0 && (row.p < 50 || row.l < 50)) {
            targetMachine = 'CNC';
        } else if (totalSbGroup >= 5) {
            targetMachine = 'Carousel';
        } else {
            targetMachine = 'Horizontal';
        }

        // Cari Match Item dengan DB
        let matchedItem = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\\s+/g, '').toLowerCase();
            return dbNameNoSpace === row.cleanItemNoSpace && m.tipe_mesin === targetMachine;
        });

        if (!matchedItem) {
            matchedItem = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\\s+/g, '').toLowerCase();
                return row.cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === targetMachine;
            });
        }
        
        let isMatched = !!matchedItem;
        let ct = 0;
        let estimasiWaktu = 0;

        if (targetMachine === 'CNC') {
            ct = 0; estimasiWaktu = 0; isMatched = true;
        } else {
            // Horizontal / Carousel CT diset ke 0 karena hanya diiris ketebalannya
            ct = 0;
            estimasiWaktu = 0;
        }

        // Evaluasi tambahan untuk Vertikal (Pembelahan)
        if (row.p > 0 && row.l > 0 && (row.p < 200 || row.l < 200) && targetMachine !== 'CNC') {
            // Cari CT Vertikal untuk kualitas ini
            let matchedItemVertikal = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\\s+/g, '').toLowerCase();
                return dbNameNoSpace === row.cleanItemNoSpace && m.tipe_mesin === 'Vertikal';
            });
            if (!matchedItemVertikal) {
                matchedItemVertikal = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\\s+/g, '').toLowerCase();
                    return row.cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === 'Vertikal';
                });
            }
            if (matchedItemVertikal) {
                const ctVertikalDetik = Number(matchedItemVertikal.cycle_time_menit);
                const ctVertikalMenit = ctVertikalDetik / 60;
                const sbMultiplier = row.prediksiSB !== null ? row.prediksiSB : row.actualQty;
                const waktuVertikal = Number((sbMultiplier * ctVertikalMenit).toFixed(2));
                summaryPerMesin['Vertikal'].totalWaktu += waktuVertikal;
                summaryPerMesin['Vertikal'].totalQty += row.actualQty;
            }
        }

        summaryPerMesin[targetMachine].totalWaktu += estimasiWaktu;
        summaryPerMesin[targetMachine].totalQty += row.actualQty;

        parsedData.push({ 
            noWo: row.noWo || row['WO Number'] || row['No WO'] || '-', 
            customer: row.customer, 
            item: row.item, 
            qty: row.actualQty, 
            qtyCut: row.qtyCut || 0,
            bahanBakuP: row.p || null,
            bahanBakuL: row.l || null,
            bahanBakuT: row.t || null,
            ukuranP: row.p || null, 
            ukuranL: row.l || null,
            ukuranT: row.t || null, 
            match: isMatched, 
            ct: ct, 
            waktu: estimasiWaktu,
            mesinTujuan: targetMachine,
            tinggi_balokan: row.tinggiBalokan,
            prediksi_sb: row.prediksiSB !== null ? Number(row.prediksiSB.toFixed(4)) : null
        });
    }

    let totalEstimasiWaktu = 0;
    Object.values(summaryPerMesin).forEach(s => totalEstimasiWaktu += s.totalWaktu);
    totalEstimasiWaktu = Number(totalEstimasiWaktu.toFixed(2));

    return { parsedData, totalEstimasiWaktu, summaryPerMesin };
}`;

const exactComment = "// ============================================================\n// FUNGSI PENCOCOKAN & KALKULASI (digunakan oleh Excel & PDF)\n// ============================================================";
const startReplace = code.indexOf(exactComment);
const endReplace = code.indexOf('// ============================================================', startReplace + 100);

if (startReplace !== -1 && endReplace !== -1) {
  code = code.substring(0, startReplace) + matchAndCalculateReplacement + '\n\n' + code.substring(endReplace);
  
  // also need to update saveSPK to insert new columns (if not already done by previous agent)
  if (!code.includes('item.tinggi_balokan || null,\n            item.prediksi_sb || null')) {
      code = code.replace(
          'item.mesinTujuan || null',
          'item.mesinTujuan || null,\n            item.tinggi_balokan || null,\n            item.prediksi_sb || null'
      );
      code = code.replace(
          'keterangan, tipe_mesin',
          'keterangan, tipe_mesin, tinggi_balokan, prediksi_sb'
      );
      code = code.replace(
          '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
  }
  fs.writeFileSync('./controllers/spkController.js', code);
  console.log('spkController.js updated successfully!');
} else {
  console.log('Could not find matchAndCalculate block.');
}
