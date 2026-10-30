const db = require('../config/db');

/**
 * Service untuk mengelola data dan validasi Work Order (WO)
 */

// ============================================================
// AMBIL SELURUH NOMOR WO YANG PERNAH DIUNGGAH DI DATABASE
// ============================================================
async function getExistingWOs(excludeHistoryId = null) {
    let query = `
        SELECT s.no_wo, s.wo_details, s.nama_item, s.qty, h.id as history_id, h.nama_file, h.tanggal_upload
        FROM spk_items s
        JOIN upload_history h ON s.history_id = h.id
    `;
    const params = [];
    if (excludeHistoryId) {
        query += ` WHERE h.id != ?`;
        params.push(excludeHistoryId);
    }
    const [rows] = await db.query(query, params);

    const woMap = new Map();
    for (const row of rows) {
        if (row.wo_details) {
            try {
                const details = typeof row.wo_details === 'string' ? JSON.parse(row.wo_details) : row.wo_details;
                if (Array.isArray(details)) {
                    for (const d of details) {
                        const w = String(d.wo || '').trim();
                        if (w && w !== '-' && !woMap.has(w)) {
                            woMap.set(w, {
                                noWo: w,
                                historyId: row.history_id,
                                fileName: row.nama_file,
                                tanggalUpload: row.tanggal_upload,
                                namaItem: row.nama_item,
                                qty: d.qty_cutting || row.qty
                            });
                        }
                    }
                }
            } catch (e) {}
        }
        if (row.no_wo) {
            const parts = String(row.no_wo).split(',').map(s => s.trim()).filter(Boolean);
            for (const w of parts) {
                if (w && w !== '-' && !woMap.has(w)) {
                    woMap.set(w, {
                        noWo: w,
                        historyId: row.history_id,
                        fileName: row.nama_file,
                        tanggalUpload: row.tanggal_upload,
                        namaItem: row.nama_item,
                        qty: row.qty
                    });
                }
            }
        }
    }
    return woMap;
}

// ============================================================
// EKSTRAK SEMUA WO DARI SUATU ITEM
// ============================================================
function extractWOsFromItem(item) {
    const wos = new Set();
    if (item.woDetails) {
        try {
            const details = typeof item.woDetails === 'string' ? JSON.parse(item.woDetails) : item.woDetails;
            if (Array.isArray(details)) {
                for (const d of details) {
                    const w = String(d.wo || '').trim();
                    if (w && w !== '-') wos.add(w);
                }
            }
        } catch (e) {}
    }
    if (item.noWo) {
        const parts = String(item.noWo).split(',').map(s => s.trim()).filter(Boolean);
        for (const w of parts) {
            if (w && w !== '-') wos.add(w);
        }
    }
    return Array.from(wos);
}

// ============================================================
// PERIKSA DUPLIKASI SINGLE WO
// ============================================================
async function checkWODuplication(noWo, excludeHistoryId = null) {
    if (!noWo || !String(noWo).trim()) {
        return { isDuplicate: false };
    }
    const trimmedWo = String(noWo).trim();
    const existingMap = await getExistingWOs(excludeHistoryId ? Number(excludeHistoryId) : null);

    if (existingMap.has(trimmedWo)) {
        return {
            isDuplicate: true,
            existing: existingMap.get(trimmedWo)
        };
    }
    return { isDuplicate: false };
}

// ============================================================
// AMBIL DAFTAR WO AKTIF (BELUM TERPENUHI)
// ============================================================
async function getActiveWOsList({ tanggal, startDate, endDate, include_fulfilled }) {
    let query = `
        SELECT 
            s.no_wo, 
            s.nama_item,
            s.ukuran_p,
            s.ukuran_l,
            s.ukuran_t, 
            s.qty_cutting,
            s.wo_details
        FROM spk_items s
        LEFT JOIN upload_history u ON s.history_id = u.id
        WHERE s.no_wo IS NOT NULL AND s.no_wo != ''
    `;
    const queryParams = [];

    if (startDate && endDate) {
        query += ` AND DATE(u.tanggal_upload) BETWEEN ? AND ?`;
        queryParams.push(startDate, endDate);
    } else if (tanggal) {
        query += ` AND DATE(u.tanggal_upload) = ?`;
        queryParams.push(tanggal);
    }

    query += `
        GROUP BY s.no_wo, s.nama_item, s.ukuran_p, s.ukuran_l, s.ukuran_t, s.qty_cutting, s.wo_details
    `;
    const [rows] = await db.query(query, queryParams);

    // Ambil WO yang terpenuhi dari realisasi
    let fulfilledQuery = `
        SELECT rc.no_wo, SUM(rc.hasil_qty) as fulfilled_qty 
        FROM realisasi_carousel rc
        LEFT JOIN realisasi_identitas ri ON rc.identitas_id = ri.id
        WHERE rc.status = 'OK'
    `;
    const fulfilledParams = [];
    if (startDate && endDate) {
        fulfilledQuery += ` AND COALESCE(DATE(rc.tanggal_wo), DATE(ri.tanggal)) BETWEEN ? AND ?`;
        fulfilledParams.push(startDate, endDate);
    } else if (tanggal) {
        fulfilledQuery += ` AND COALESCE(DATE(rc.tanggal_wo), DATE(ri.tanggal)) = ?`;
        fulfilledParams.push(tanggal);
    }
    fulfilledQuery += ` GROUP BY rc.no_wo`;
    const [fulfilled] = await db.query(fulfilledQuery, fulfilledParams);

    const fulfilledMap = {};
    for (const f of fulfilled) {
        fulfilledMap[f.no_wo] = Number(f.fulfilled_qty);
    }

    const splitRows = [];
    for (const row of rows) {
        if (row.wo_details) {
            try {
                const details = typeof row.wo_details === 'string' ? JSON.parse(row.wo_details) : row.wo_details;
                
                const woMap = new Map();
                for (const d of details) {
                    const w = String(d.wo || '').trim();
                    if (w && w !== '-') {
                        const prevQty = woMap.get(w) || 0;
                        woMap.set(w, prevQty + (Number(d.qty_cutting) || Number(d.qty) || 0));
                    }
                }

                if (woMap.size > 0) {
                    for (const [wo, qty] of woMap.entries()) {
                        const fQty = fulfilledMap[wo] || 0;
                        if (fQty < qty || include_fulfilled === 'true') {
                            splitRows.push({
                                ...row,
                                no_wo: wo,
                                qty_cutting: qty,
                                qty_terpenuhi: fQty
                            });
                        }
                    }
                    continue;
                }
            } catch (e) {
                console.error('Failed to parse wo_details', e);
            }
        }

        // Fallback data tanpa wo_details
        if (row.no_wo && row.no_wo.includes(',')) {
            const wos = row.no_wo.split(',').map(w => w.trim()).filter(Boolean);
            const qtyPerWo = Math.max(1, Math.round(row.qty_cutting / wos.length));
            
            for (const wo of wos) {
                const fQty = fulfilledMap[wo] || 0;
                if (fQty < qtyPerWo || include_fulfilled === 'true') {
                    splitRows.push({
                        ...row,
                        no_wo: wo,
                        qty_cutting: qtyPerWo,
                        qty_terpenuhi: fQty
                    });
                }
            }
        } else {
            const wo = row.no_wo ? row.no_wo.trim() : '';
            if (wo) {
                const fQty = fulfilledMap[wo] || 0;
                if (fQty < row.qty_cutting || include_fulfilled === 'true') {
                    splitRows.push({
                        ...row,
                        no_wo: wo,
                        qty_terpenuhi: fQty
                    });
                }
            }
        }
    }

    return splitRows;
}

module.exports = {
    getExistingWOs,
    extractWOsFromItem,
    checkWODuplication,
    getActiveWOsList
};
