const db = require('../config/db');
const { extractWOsFromItem } = require('./woService');

/**
 * Service untuk kalkulasi perencanaan manufaktur pemotongan busa:
 * - Pencocokan cycle time per item
 * - Estimasi jam kerja mesin (Vertikal, Horizontal, Carousel, Packing)
 * - Alokasi kapasitas mesin dan manpower
 * - Perhitungan Overall Equipment Effectiveness (OEE)
 */

// ============================================================
// AMBIL CYCLE TIME DARI CYCLE TIME MATRIX
// ============================================================
function findMatchedCT(cleanItemName, sortedMatrix) {
    let matchedItem = sortedMatrix.find(m =>
        m.nama_item.toLowerCase().trim() === cleanItemName.toLowerCase()
    );

    if (!matchedItem) {
        matchedItem = sortedMatrix.find(m =>
            cleanItemName.toLowerCase().includes(m.nama_item.toLowerCase().trim())
        );
    }
    return matchedItem ? Number(matchedItem.cycle_time_menit) : 0;
}

// ============================================================
// KALKULASI KAPASITAS MESIN & ALOKASI MANPOWER (DRY HELPER)
// ============================================================
function calculateCapacityAndManpower(summaryPerMesin, manpowerMap) {
    const kapasitasPerMesin = 420; // 7 jam shift (menit)
    const result = {};

    for (const [machineType, data] of Object.entries(summaryPerMesin)) {
        let maxCapacity = 1;
        let manpowerPerMachine = 1;

        if (manpowerMap[machineType]) {
            maxCapacity = manpowerMap[machineType].total_mesin;
            manpowerPerMachine = manpowerMap[machineType].manpower_per_mesin;
        } else if (machineType === 'CNC' || machineType === 'Perforasi') {
            maxCapacity = 1;
            manpowerPerMachine = 2;
        } else if (machineType === 'Packing') {
            maxCapacity = 1;
            manpowerPerMachine = 7;
        }

        let reqMachines = Math.ceil(data.totalWaktu / kapasitasPerMesin);
        const reqShifts = reqMachines || 1;
        if (reqMachines > maxCapacity) reqMachines = maxCapacity;

        if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
            reqMachines = 1;
        }

        let reqManpower = reqMachines * manpowerPerMachine;

        if (machineType === 'Packing') {
            reqMachines = 1; // 1 physical area
            reqManpower = 7; // Fixed 7 manpower per shift
        }

        const effectiveCapacity = (machineType === 'Packing' ? reqShifts : reqMachines) * kapasitasPerMesin;
        const utilisasi = effectiveCapacity > 0
            ? (data.totalWaktu / effectiveCapacity) * 100
            : 0;

        let status = 'Efisien';
        if (utilisasi < 50) status = 'Tidak Efisien';
        else if (utilisasi < 80) status = 'Cukup';

        if ((machineType === 'CNC' || machineType === 'Perforasi') && data.totalQty > 0) {
            status = 'Menunggu CT';
        }

        result[machineType] = {
            ...data,
            mesinDibutuhkan: reqMachines,
            manpowerDibutuhkan: reqManpower,
            kebutuhanShift: reqShifts,
            persentaseUtilisasi: Number(Math.min(utilisasi, 100).toFixed(2)),
            utilisasiStatus: status
        };
    }
    return result;
}

// ============================================================
// PENCOCOKAN & KALKULASI DETAIL (MATCH AND CALCULATE)
// ============================================================
async function matchAndCalculate(rawRows, existingWOMap = null) {
    const [matrixData] = await db.query('SELECT * FROM cycle_time_matrix');

    let parsedData = [];
    let summaryPerMesin = {
        'Vertikal': { totalWaktu: 0, totalQty: 0 },
        'Horizontal': { totalWaktu: 0, totalQty: 0 },
        'Carousel': { totalWaktu: 0, totalQty: 0 },
        'CNC': { totalWaktu: 0, totalQty: 0 },
        'Packing': { totalWaktu: 0, totalQty: 0 }
    };

    const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);

    // TAHAP 1: Hitung Kebutuhan SB per baris dan simpan di array sementara
    const parsedRows = [];
    for (const row of rawRows) {
        const p = Number(row.bahanBakuP) || 0;
        const l = Number(row.bahanBakuL) || 0;
        const t = Number(row.bahanBakuT) || 0;
        const actualQty = row.qtyBB !== undefined ? row.qtyBB : row.qty;

        row.p = p;
        row.l = l;
        row.t = t;
        row.actualQty = actualQty;

        let packingFrekuensiRow = 0;
        if (t > 0 && actualQty > 0) {
            packingFrekuensiRow = Math.ceil((t * actualQty) / 20);
        }
        row.packingFrekuensiRow = packingFrekuensiRow;

        const cleanItemName = row.item.replace(/\s*\([\d.x]+\)\s*$/, '').trim();
        const cleanItemNoSpace = cleanItemName.replace(/\s+/g, '').toLowerCase();

        row.cleanItemNoSpace = cleanItemNoSpace;
        row.tinggiBalokan = null;
        row.prediksiSB = null;

        const matchedTinggi = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
            return cleanItemNoSpace.includes(dbNameNoSpace) && m.tinggi_balokan_standar > 0;
        });

        if (matchedTinggi) {
            row.tinggiBalokan = Number(matchedTinggi.tinggi_balokan_standar);
            if (row.tinggiBalokan > 0 && t > 0) {
                row.prediksiSB = (t * actualQty) / row.tinggiBalokan;
            }
        }

        parsedRows.push(row);
    }

    // TAHAP 2: Agregasi (Grouping) L, T, serta Kualitas
    const groupedMap = new Map();
    for (const row of parsedRows) {
        const key = `${row.cleanItemNoSpace}_${row.l}_${row.t}`;

        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                woCustPairs: new Map(),
                woDetails: [],
                cleanItemNoSpace: row.cleanItemNoSpace,
                item: row.item,
                p: row.p,
                l: row.l,
                t: row.t,
                tinggiBalokan: row.tinggiBalokan,
                totalQty: 0,
                totalQtyCut: 0,
                totalPrediksiSB: 0,
                hasNullPrediksi: false,
                totalPackingFrekuensi: 0
            });
        }

        const group = groupedMap.get(key);
        const currentWo = row.noWo || row['WO Number'] || row['No WO'] || '-';
        const currentCust = row.customer || '-';
        group.woCustPairs.set(currentWo, currentCust);
        group.woDetails.push({ wo: currentWo, customer: currentCust, qty_cutting: row.qtyCut || row.actualQty || 0 });

        group.totalQty += row.actualQty;
        group.totalQtyCut += (row.qtyCut || 0);
        group.totalPackingFrekuensi += (row.packingFrekuensiRow || 0);

        if (row.prediksiSB !== null) {
            group.totalPrediksiSB += row.prediksiSB;
        } else {
            group.hasNullPrediksi = true;
        }
    }

    // TAHAP 3: Penentuan Routing & Hitung Cycle Time dari Data yang Dikelompokkan
    for (const group of groupedMap.values()) {
        let targetMachine = group.totalPrediksiSB >= 5 ? 'Carousel' : 'Horizontal';

        // Cari Match Item dengan DB
        let matchedItem = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
            return dbNameNoSpace === group.cleanItemNoSpace && m.tipe_mesin === targetMachine;
        });

        if (!matchedItem) {
            matchedItem = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return group.cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === targetMachine;
            });
        }

        let isMatched = !!matchedItem;

        if (group.hasNullPrediksi) {
            isMatched = false;
        }

        let ct = 0;
        let estimasiWaktu = 0;

        if (!isMatched) {
            targetMachine = null;
        }

        // Cari CT Vertikal untuk kualitas ini
        let matchedItemVertikal = sortedMatrix.find(m => {
            const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
            return dbNameNoSpace === group.cleanItemNoSpace && m.tipe_mesin === 'Vertikal';
        });
        if (!matchedItemVertikal) {
            matchedItemVertikal = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return group.cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === 'Vertikal';
            });
        }

        // Evaluasi Vertikal (Pembelahan)
        if (targetMachine !== 'CNC') {
            if (matchedItemVertikal) {
                const ctVertikalMenit = Number(matchedItemVertikal.cycle_time_menit);
                const sbMultiplier = !group.hasNullPrediksi ? group.totalPrediksiSB : group.totalQty;
                const waktuVertikal = Number((sbMultiplier * ctVertikalMenit).toFixed(2));
                summaryPerMesin['Vertikal'].totalWaktu += waktuVertikal;
                summaryPerMesin['Vertikal'].totalQty += sbMultiplier;
            }
        }

        if (targetMachine) {
            summaryPerMesin[targetMachine].totalWaktu += estimasiWaktu;
            summaryPerMesin[targetMachine].totalQty += group.totalQty;
        }

        const joinedWos = [];
        const joinedCustomers = [];
        for (const [wo, cust] of group.woCustPairs.entries()) {
            joinedWos.push(wo);
            joinedCustomers.push(cust);
        }

        // PACKING CALCULATION
        const joinedCustomersString = joinedCustomers.join(', ');
        const isRas = joinedCustomersString.toLowerCase().includes('ras');
        
        const packingVarians = isRas ? 'Varians III' : 'Varians I';
        let packingCt = isRas ? 0.15 : 0.47;
        const matchedPacking = matrixData.find(m => m.tipe_mesin === 'Packing' && m.varians === packingVarians);
        if (matchedPacking) {
            packingCt = Number(matchedPacking.cycle_time_menit);
        }

        const packingFrekuensi = group.totalPackingFrekuensi;
        const packingSummary = Number((packingCt * packingFrekuensi).toFixed(2));

        summaryPerMesin['Packing'].totalWaktu += packingSummary;
        summaryPerMesin['Packing'].totalQty += group.totalQty;
        summaryPerMesin['Packing'].totalFrekuensi = (summaryPerMesin['Packing'].totalFrekuensi || 0) + packingFrekuensi;

        let isDuplicate = false;
        let duplicateInfo = null;
        if (existingWOMap) {
            for (const wo of joinedWos) {
                if (existingWOMap.has(wo)) {
                    isDuplicate = true;
                    duplicateInfo = existingWOMap.get(wo);
                    break;
                }
            }
        }

        parsedData.push({
            noWo: joinedWos.join(', '),
            woDetails: JSON.stringify(group.woDetails),
            customer: joinedCustomers.join(', '),
            item: group.item,
            qty: group.totalQty,
            qtyCut: group.totalQtyCut,
            bahanBakuP: group.p || null,
            bahanBakuL: group.l || null,
            bahanBakuT: group.t || null,
            ukuranP: group.p || null,
            ukuranL: group.l || null,
            ukuranT: group.t || null,
            match: isMatched,
            ct: ct,
            ct_vertikal: matchedItemVertikal ? Number(matchedItemVertikal.cycle_time_menit) : 0,
            ct_c1: matchedItem ? Number(matchedItem.ct_c1) : 0,
            ct_c2: matchedItem ? Number(matchedItem.ct_c2) : 0,
            ct_ptu: matchedItem ? Number(matchedItem.ct_ptu) : 0,
            ct_pma: matchedItem ? Number(matchedItem.ct_pma) : 0,
            ct_pmu: matchedItem ? Number(matchedItem.ct_pmu) : 0,
            ct_c3: matchedItem ? Number(matchedItem.ct_c3) : 0,
            waktu: estimasiWaktu,
            mesinTujuan: targetMachine,
            tinggi_balokan: group.tinggiBalokan,
            prediksi_sb: !group.hasNullPrediksi ? Number(group.totalPrediksiSB.toFixed(4)) : null,
            originalQty: group.totalQty,
            originalT: group.t,
            packing_frekuensi_awal: group.totalPackingFrekuensi,
            packing_frekuensi: packingFrekuensi,
            packing_varians: packingVarians,
            packing_ct: packingCt,
            packing_summary: packingSummary,
            isDuplicate,
            duplicateInfo
        });
    }

    let totalEstimasiWaktu = 0;
    Object.values(summaryPerMesin).forEach(s => totalEstimasiWaktu += s.totalWaktu);
    totalEstimasiWaktu = Number(totalEstimasiWaktu.toFixed(2));

    const duplicateWOs = [];
    if (existingWOMap) {
        const seenDuplicates = new Set();
        for (const row of parsedData) {
            if (row.isDuplicate && row.duplicateInfo) {
                const wos = extractWOsFromItem(row);
                for (const wo of wos) {
                    if (existingWOMap.has(wo) && !seenDuplicates.has(wo)) {
                        seenDuplicates.add(wo);
                        duplicateWOs.push({
                            noWo: wo,
                            item: row.item,
                            customer: row.customer,
                            qty: row.qty,
                            existing: existingWOMap.get(wo)
                        });
                    }
                }
            }
        }
    }

    return { parsedData, totalEstimasiWaktu, summaryPerMesin, duplicateWOs };
}

// ============================================================
// KALKULASI SUMMARY PER MESIN LENGKAP (VERTIKAL, HORIZONTAL, CAROUSEL, PACKING)
// ============================================================
function calculateSummaryDetails(parsedData, matrixVertikal, matrixHorizontal, matrixCarousel, matrixPacking) {
    const sortedVertikal = [...matrixVertikal].sort((a, b) => b.nama_item.length - a.nama_item.length);
    const sortedHorizontal = [...matrixHorizontal].sort((a, b) => b.nama_item.length - a.nama_item.length);
    const sortedCarousel = [...matrixCarousel].sort((a, b) => b.nama_item.length - a.nama_item.length);

    let totalWaktuVertikal = 0;
    let totalWaktuHorizontal = 0;
    let totalWaktuCarousel = 0;
    let totalWaktuPacking = 0;

    let totalQtyHorizontal = 0;
    let totalQtyCarousel = 0;
    let totalFrekuensiPacking = 0;

    const vertikalData = [];
    const horizontalData = [];
    const carouselData = [];
    const packingData = [];

    parsedData.forEach(row => {
        const cleanItemNoSpace = (row.item || '').replace(/\s+/g, '').toLowerCase();
        const qty = parseFloat(row.qty) || 0;

        let t = Number(row.ukuranT) || Number(row.bahanBakuT) || 0;
        if (t === 0 && row.item) {
            const dimMatch = row.item.match(/\(([\d.]+)\s*[xX]\s*([\d.]+)\s*[xX]\s*([\d.]+)\)/);
            if (dimMatch) {
                t = Number(dimMatch[3]);
            }
        }

        const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

        // Kebutuhan SB
        let kebutuhanSB = 0;
        if (row.prediksi_sb !== null && row.prediksi_sb !== undefined) {
            kebutuhanSB = round2(parseFloat(row.prediksi_sb) || 0);
        } else {
            kebutuhanSB = round2(qty);
        }

        // Vertikal
        let ctVertikal = 0;
        let variansVertikal = '-';
        const matchedVertikal = sortedVertikal.find(m => cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
        if (matchedVertikal) {
            ctVertikal = parseFloat(matchedVertikal.cycle_time_menit) || 0;
            variansVertikal = matchedVertikal.varians || '-';
        }

        const subtotalWaktuVertikal = kebutuhanSB * ctVertikal;
        totalWaktuVertikal += subtotalWaktuVertikal;

        vertikalData.push({
            description: row.item,
            qty: qty,
            kebutuhanSB: kebutuhanSB.toFixed(2),
            varians: variansVertikal,
            ctVertikal: ctVertikal.toFixed(2),
            subtotalWaktu: subtotalWaktuVertikal.toFixed(2)
        });

        // Horizontal
        if (row.mesinTujuan === 'Horizontal') {
            totalQtyHorizontal += qty;
            let c1Matriks = 0, c2Matriks = 0, ptuMatriks = 0, pmaMatriks = 0, pmuMatriks = 0, c3Matriks = 0;
            let variansHorizontal = '-';

            const matched = sortedHorizontal.find(m => cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
            if (matched) {
                c1Matriks = parseFloat(matched.ct_c1) || 0;
                c2Matriks = parseFloat(matched.ct_c2) || 0;
                ptuMatriks = parseFloat(matched.ct_ptu) || 0;
                pmaMatriks = parseFloat(matched.ct_pma) || 0;
                pmuMatriks = parseFloat(matched.ct_pmu) || 0;
                c3Matriks = parseFloat(matched.ct_c3) || 0;
                variansHorizontal = matched.varians || '-';
            }

            const c1 = round2(c1Matriks * kebutuhanSB);
            const c2 = round2(c2Matriks * kebutuhanSB);
            const calcPtu = round2(ptuMatriks * t * qty);
            const calcPma = round2(pmaMatriks * qty);
            const calcPmu = round2(pmuMatriks * qty);
            const c3 = round2(c3Matriks * kebutuhanSB);

            const subtotalWaktu = round2(c1 + c2 + calcPtu + calcPma + calcPmu + c3);
            totalWaktuHorizontal += subtotalWaktu;

            horizontalData.push({
                description: row.item,
                qty: qty,
                kebutuhanSB: kebutuhanSB.toFixed(2),
                c1: c1.toFixed(2),
                c2: c2.toFixed(2),
                calcPtu: calcPtu.toFixed(2),
                calcPma: calcPma.toFixed(2),
                calcPmu: calcPmu.toFixed(2),
                c3: c3.toFixed(2),
                varians: variansHorizontal,
                subtotalWaktu: subtotalWaktu.toFixed(2)
            });
        }

        // Carousel
        if (row.mesinTujuan === 'Carousel') {
            totalQtyCarousel += qty;
            let c1Matriks = 0, c2Matriks = 0, ptuMatriks = 0, pmaMatriks = 0, c3Matriks = 0;
            let variansCarousel = '-';

            const matched = sortedCarousel.find(m => cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase()));
            if (matched) {
                c1Matriks = parseFloat(matched.ct_c1) || 0;
                c2Matriks = parseFloat(matched.ct_c2) || 0;
                ptuMatriks = parseFloat(matched.ct_ptu) || 0;
                pmaMatriks = parseFloat(matched.ct_pma) || 0;
                c3Matriks = parseFloat(matched.ct_c3) || 0;
                variansCarousel = matched.varians || '-';
            }

            const c1 = c1Matriks;
            const c2 = c2Matriks * kebutuhanSB;
            const faktorBagi = qty / 6;
            const calcPtu = ptuMatriks * t * faktorBagi;
            const calcPma = pmaMatriks * faktorBagi;
            const c3 = c3Matriks * kebutuhanSB;

            const subtotalWaktu = c1 + c2 + calcPtu + calcPma + c3;
            totalWaktuCarousel += subtotalWaktu;

            carouselData.push({
                description: row.item,
                qty: qty,
                kebutuhanSB: kebutuhanSB.toFixed(2),
                c1: c1.toFixed(2),
                calcC2: c2.toFixed(2),
                calcPtu: calcPtu.toFixed(2),
                calcPma: calcPma.toFixed(2),
                calcC3: c3.toFixed(2),
                varians: variansCarousel,
                subtotalWaktu: subtotalWaktu.toFixed(2)
            });
        }

        // Packing
        const cust = row.customer ? String(row.customer).toLowerCase() : '';
        const isRas = cust.includes('ras');
        const variansPacking = isRas ? 'Varians III' : 'Varians I';
        
        let ctPacking = isRas ? 0.15 : 0.47;
        const matchedPacking = matrixPacking.find(m => m.varians === variansPacking);
        if (matchedPacking) {
            ctPacking = Number(matchedPacking.cycle_time_menit);
        }

        let frekuensiPacking = 0;
        if (t > 0 && qty > 0) {
            if (row.originalQty !== undefined && qty === Number(row.originalQty) && t === Number(row.originalT) && row.packing_frekuensi_awal !== undefined) {
                frekuensiPacking = row.packing_frekuensi_awal;
            } else {
                frekuensiPacking = Math.ceil((t * qty) / 20);
            }
        }

        totalFrekuensiPacking += frekuensiPacking;
        const subtotalWaktuPacking = frekuensiPacking * ctPacking;
        totalWaktuPacking += subtotalWaktuPacking;

        packingData.push({
            description: row.item,
            qty: qty,
            kebutuhanSB: kebutuhanSB.toFixed(2),
            frekuensi: frekuensiPacking,
            varians: variansPacking,
            ctPacking: ctPacking.toFixed(2),
            subtotalWaktu: subtotalWaktuPacking.toFixed(2)
        });
    });

    const kapasitas1Shift = 420;

    const estBukaanVertikal = Math.ceil(totalWaktuVertikal / kapasitas1Shift);
    const utilVertikal = estBukaanVertikal > 0 ? (totalWaktuVertikal / (estBukaanVertikal * kapasitas1Shift)) * 100 : 0;
    const estOperatorVertikal = estBukaanVertikal * 3;

    const estBukaanHorizontal = Math.ceil(totalWaktuHorizontal / kapasitas1Shift);
    const utilHorizontal = estBukaanHorizontal > 0 ? (totalWaktuHorizontal / (estBukaanHorizontal * kapasitas1Shift)) * 100 : 0;
    const estOperatorHorizontal = estBukaanHorizontal * 1;

    const estBukaanCarousel = Math.ceil(totalWaktuCarousel / kapasitas1Shift);
    const utilCarousel = estBukaanCarousel > 0 ? (totalWaktuCarousel / (estBukaanCarousel * kapasitas1Shift)) * 100 : 0;
    const estOperatorCarousel = estBukaanCarousel * 1;

    const estBukaanPacking = Math.ceil(totalWaktuPacking / kapasitas1Shift) || 1;
    const totalKapasitasPacking = estBukaanPacking * kapasitas1Shift;
    const utilPacking = totalWaktuPacking > 0 ? (totalWaktuPacking / totalKapasitasPacking) * 100 : 0;

    return {
        vertikal: {
            data: vertikalData,
            summary: {
                totalWaktu: totalWaktuVertikal.toFixed(2),
                kapasitas1Shift: kapasitas1Shift,
                estimasiBukaanMesin: estBukaanVertikal,
                mesinTersedia: 3,
                utilisasiMesin: utilVertikal.toFixed(2),
                estimasiOperator: estOperatorVertikal
            }
        },
        horizontal: {
            data: horizontalData,
            summary: {
                totalQty: totalQtyHorizontal,
                totalWaktu: totalWaktuHorizontal.toFixed(2),
                kapasitas1Shift: kapasitas1Shift,
                estimasiBukaanMesin: estBukaanHorizontal,
                mesinTersedia: 3,
                utilisasiMesin: utilHorizontal.toFixed(2),
                estimasiOperator: estOperatorHorizontal
            }
        },
        carousel: {
            data: carouselData,
            summary: {
                totalQty: totalQtyCarousel,
                totalWaktu: totalWaktuCarousel.toFixed(2),
                kapasitas1Shift: kapasitas1Shift,
                estimasiBukaanMesin: estBukaanCarousel,
                mesinTersedia: 2,
                utilisasiMesin: utilCarousel.toFixed(2),
                estimasiOperator: estOperatorCarousel
            }
        },
        packing: {
            data: packingData,
            summary: {
                totalFrekuensi: totalFrekuensiPacking,
                totalWaktu: totalWaktuPacking.toFixed(2),
                kapasitas1Shift: kapasitas1Shift,
                estimasiBukaanMesin: estBukaanPacking,
                kebutuhanShift: estBukaanPacking,
                mesinTersedia: 1,
                utilisasiMesin: Math.min(utilPacking, 100).toFixed(2),
                estimasiOperator: 7
            }
        }
    };
}

// ============================================================
// KALKULASI OEE
// ============================================================
function calculateOEEScores({
    shift_time = 420,
    efficiency = 1.0,
    downtime = 0,
    machine_qty = 1,
    cycle_time_per_machine = 1,
    operating_time = 0,
    total_input = 0,
    defect_qty = 0
}) {
    if (shift_time === 0 || efficiency === 0 || machine_qty === 0 || cycle_time_per_machine === 0 || total_input === 0) {
        return {
            availability_pct: 0,
            performance_pct: 0,
            quality_pct: 0,
            oee_score_akhir: 0
        };
    }

    const availability_pct = ((shift_time - downtime) * efficiency) / (shift_time * efficiency);
    const performance_pct = operating_time / (machine_qty * cycle_time_per_machine);
    const quality_pct = 1 - (defect_qty / total_input);
    const oee_score_akhir = availability_pct * performance_pct * quality_pct;

    return {
        availability_pct: availability_pct * 100,
        performance_pct: performance_pct * 100,
        quality_pct: quality_pct * 100,
        oee_score_akhir: oee_score_akhir * 100
    };
}

// ============================================================
// RE-KALKULASI / REFRESH PREVIEW DATA
// ============================================================
async function recalculatePreviewData(parsedData, tinggiData = []) {
    if (!parsedData || !Array.isArray(parsedData)) {
        return [];
    }

    const [matrixData] = await db.query('SELECT * FROM cycle_time_matrix');
    const sortedMatrix = [...matrixData].sort((a, b) => b.nama_item.length - a.nama_item.length);

    // Buat map dari tinggiData (localStorage) untuk lookup cepat
    const tinggiMap = new Map();
    if (tinggiData && Array.isArray(tinggiData)) {
        tinggiData.forEach(item => {
            if (item.busa && item.tinggi > 0) {
                tinggiMap.set(item.busa.replace(/\s+/g, '').toLowerCase(), Number(item.tinggi));
            }
        });
    }

    return parsedData.map(row => {
        const cleanItemName = (row.item || '').replace(/\s*\([\d.x\s]+\)\s*$/, '').trim();
        const cleanItemNoSpace = cleanItemName.replace(/\s+/g, '').toLowerCase();

        let targetMachine = row.mesinTujuan;
        let ct = row.ct;
        let isMatched = row.match;

        // Cari match Tinggi Balokan dari tinggiData (localStorage) terlebih dahulu
        let foundTinggi = null;
        for (const [busaKey, tinggiVal] of tinggiMap.entries()) {
            if (cleanItemNoSpace.includes(busaKey)) {
                foundTinggi = tinggiVal;
                break;
            }
        }

        // Fallback ke cycle_time_matrix jika tidak ditemukan di tinggiData
        if (!foundTinggi) {
            const matchedTinggi = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return cleanItemNoSpace.includes(dbNameNoSpace) && m.tinggi_balokan_standar > 0;
            });
            if (matchedTinggi) {
                foundTinggi = Number(matchedTinggi.tinggi_balokan_standar);
            }
        }

        if (foundTinggi) {
            row.tinggi_balokan = foundTinggi;
            let t = Number(row.ukuranT) || Number(row.bahanBakuT) || 0;

            // Fallback: extract T from item string if not set (e.g. "LBR TF 2 BLACK (200x160x28)")
            if (t === 0 && row.item) {
                const dimMatch = row.item.match(/\([\d.]+\s*x\s*[\d.]+\s*x\s*([\d.]+)\)/i);
                if (dimMatch) {
                    t = Number(dimMatch[1]);
                }
            }

            if (row.tinggi_balokan > 0 && t > 0) {
                row.prediksi_sb = Number(((t * row.qty) / row.tinggi_balokan).toFixed(4));
            }
        }

        // Re-evaluate routing Horizontal/Carousel berdasarkan prediksi_sb
        // Rule: < 5 → Horizontal, >= 5 → Carousel
        if (row.prediksi_sb !== null && row.prediksi_sb !== undefined) {
            let newMachine = row.prediksi_sb >= 5 ? 'Carousel' : 'Horizontal';

            let matchedForMachine = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return dbNameNoSpace === cleanItemNoSpace && m.tipe_mesin === newMachine;
            });
            if (!matchedForMachine) {
                matchedForMachine = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === newMachine;
                });
            }

            if (matchedForMachine) {
                targetMachine = newMachine;
                row.mesinTujuan = newMachine;
                isMatched = true;
                row.match = true;
            }
        }

        // Jika awalnya tidak match, cek ulang
        if (!isMatched) {
            let tempMachine = 'Horizontal';
            if (row.prediksi_sb >= 5) tempMachine = 'Carousel';

            let matchedItem = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return dbNameNoSpace === cleanItemNoSpace && m.tipe_mesin === tempMachine;
            });
            if (!matchedItem) {
                matchedItem = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === tempMachine;
                });
            }

            if (matchedItem) {
                isMatched = true;
                targetMachine = tempMachine;
                row.match = true;
                row.mesinTujuan = targetMachine;
            }
        }

        // Recalculate CT dan waktu
        let estimasiWaktu = row.waktu || 0;
        if (targetMachine === 'Vertikal') {
            let matchedItemVertikal = sortedMatrix.find(m => {
                const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                return dbNameNoSpace === cleanItemNoSpace && m.tipe_mesin === 'Vertikal';
            });
            if (!matchedItemVertikal) {
                matchedItemVertikal = sortedMatrix.find(m => {
                    const dbNameNoSpace = m.nama_item.replace(/\s+/g, '').toLowerCase();
                    return cleanItemNoSpace.includes(dbNameNoSpace) && m.tipe_mesin === 'Vertikal';
                });
            }
            if (matchedItemVertikal) {
                ct = Number(matchedItemVertikal.cycle_time_menit);
                const sbMultiplier = row.prediksi_sb !== null ? row.prediksi_sb : row.qty;
                estimasiWaktu = Number((sbMultiplier * ct).toFixed(2));
            }
        } else if (targetMachine === 'Horizontal' || targetMachine === 'Carousel') {
            ct = 0; estimasiWaktu = 0;
        } else if (targetMachine === 'CNC' || targetMachine === 'Perforasi') {
            ct = 0; estimasiWaktu = 0;
        } else {
            estimasiWaktu = Number((row.qty * ct).toFixed(2));
        }

        if (row.prediksi_sb == null) {
            isMatched = false;
            row.match = false;
        }

        if (!isMatched) targetMachine = null;

        // Pastikan field CT di-populate agar frontend bisa recalculate
        let finalMatchedItem = sortedMatrix.find(m => m.tipe_mesin === targetMachine && (m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanItemNoSpace || cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase())));
        let finalMatchedVertikal = sortedMatrix.find(m => m.tipe_mesin === 'Vertikal' && (m.nama_item.replace(/\s+/g, '').toLowerCase() === cleanItemNoSpace || cleanItemNoSpace.includes(m.nama_item.replace(/\s+/g, '').toLowerCase())));

        row.ct_vertikal = finalMatchedVertikal ? Number(finalMatchedVertikal.cycle_time_menit) : 0;
        row.ct_c1 = finalMatchedItem ? Number(finalMatchedItem.ct_c1) : 0;
        row.ct_c2 = finalMatchedItem ? Number(finalMatchedItem.ct_c2) : 0;
        row.ct_ptu = finalMatchedItem ? Number(finalMatchedItem.ct_ptu) : 0;
        row.ct_pma = finalMatchedItem ? Number(finalMatchedItem.ct_pma) : 0;
        row.ct_pmu = finalMatchedItem ? Number(finalMatchedItem.ct_pmu) : 0;
        row.ct_c3 = finalMatchedItem ? Number(finalMatchedItem.ct_c3) : 0;

        row.ct = ct;
        row.waktu = estimasiWaktu;
        row.mesinTujuan = targetMachine;

        return row;
    });
}

module.exports = {
    findMatchedCT,
    calculateCapacityAndManpower,
    matchAndCalculate,
    calculateSummaryDetails,
    calculateOEEScores,
    recalculatePreviewData
};
