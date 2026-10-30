const ExcelJS = require('exceljs');
const { SaxesParser } = require('saxes');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Service untuk parsing berkas SPK (Excel .xlsx, .xls SpreadsheetML XML, dan PDF)
 * Memastikan proteksi terhadap Prototype Pollution dan ReDoS.
 */

// ============================================================
// PARSING PDF SPK (Fallback legacy)
// ============================================================
function parseSPKPdf(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const shiftMatch = rawText.match(/Shift\s*Group.*?Tanggal\s*(\d)/i) || rawText.match(/Shift\s*Group[^\d]*(\d)[A-Za-z]?/i);
    const parsedShift = shiftMatch && shiftMatch[1] ? parseInt(shiftMatch[1]) : 1;

    const ITEM_PATTERN = /(\d+\.\d)(\d+\.\d)(\d+\.\d{2})(\d+\.\d{2})(\d*\.\d{2})(\d+)(LBR.+?)SH/i;
    const ROW_HEADER_PATTERN = /^(\d{1,3})\s{2,}(\d{7})(.*)/;

    let items = [];
    let currentItem = null;

    for (const line of lines) {
        const headerMatch = line.match(ROW_HEADER_PATTERN);
        if (headerMatch) {
            if (currentItem) items.push(currentItem);

            const cleanCustomer = headerMatch[3].replace(/\d+\.\d+.*$/, '').trim();
            currentItem = {
                noWo: headerMatch[2],
                customer: cleanCustomer ? [cleanCustomer] : [],
                lines: [line]
            };
        } else if (currentItem) {
            if (!/^\d+\.\d/.test(line) && !/^\d{5,}-/.test(line) && !/^\//.test(line) && !line.match(ITEM_PATTERN)) {
                currentItem.customer.push(line);
            }
            currentItem.lines.push(line);
        }
    }
    if (currentItem) items.push(currentItem);

    const rows = [];
    for (const item of items) {
        const fullText = item.lines.join(' ');
        const itemMatch = fullText.match(ITEM_PATTERN);
        if (itemMatch) {
            let p = parseFloat(itemMatch[1]);
            let l = parseFloat(itemMatch[2]);
            const t = parseFloat(itemMatch[4]); // T Bahan Baku

            const qtyBB = parseFloat(itemMatch[5]);
            const qtyCut = parseInt(itemMatch[6]);
            const baseName = itemMatch[7].trim();
            const junkPatterns = [
                /Dibuat Oleh/i, /Disetujui Oleh/i, /SURAT PERINTAH KERJA/i,
                /Shift Group/i, /Kode Mesin/i, /PLPLTT/i, /QtySPK/i, /Tanggal/i, /Mesin Vertikal/i,
                /No WONoUkuran/i, /Bahan Baku/i
            ];
            const validCustomerParts = item.customer.filter(part => !junkPatterns.some(regex => regex.test(part)));
            let customerStr = validCustomerParts.join(' ').trim() || '-';
            if (customerStr.length > 140) {
                customerStr = customerStr.substring(0, 140);
            }

            // Ekstrak P dan L dari Bahan Baku
            const bbMatch = fullText.match(/(\d{2,3}\.\d)\s*(\d{2,3}\.\d)/g);
            if (bbMatch && bbMatch.length > 0) {
                const lastMatch = bbMatch[bbMatch.length - 1];
                const parts = lastMatch.match(/(\d{2,3}\.\d)\s*(\d{2,3}\.\d)/);
                if (parts) {
                    let bb_l = parseFloat(parts[1]);
                    let bb_p = parseFloat(parts[2]);
                    p = bb_p;
                    l = bb_l;
                }
            }

            const namaItem = `${baseName} (${p}x${l}x${t})`;

            if (qtyBB > 0 && baseName) {
                rows.push({
                    noWo: item.noWo,
                    customer: customerStr,
                    item: namaItem,
                    qtyBB,
                    qtyCut,
                    bahanBakuP: p,
                    bahanBakuL: l,
                    bahanBakuT: t
                });
            }
        }
    }

    return { rows, shift: parsedShift };
}

// ============================================================
// PARSING SPREADSHEETML 2003 XML (.xls) SECURELY
// ============================================================
function parseSpreadsheetMLXml(filePath) {
    const xmlContent = fs.readFileSync(filePath, 'utf8');
    const parser = new SaxesParser();
    const rows = [];
    let currentRow = null;
    let currentCell = null;
    let currentData = null;
    let inData = false;

    parser.on('opentag', tag => {
        const name = tag.name.replace(/^.*:/, '');
        if (name === 'Row') {
            currentRow = [];
        } else if (name === 'Cell') {
            currentCell = { value: '' };
        } else if (name === 'Data') {
            inData = true;
            currentData = '';
        }
    });

    parser.on('text', text => {
        if (inData) {
            currentData += text;
        }
    });

    parser.on('closetag', tag => {
        const name = tag.name.replace(/^.*:/, '');
        if (name === 'Data') {
            inData = false;
            if (currentCell) currentCell.value = currentData.trim();
        } else if (name === 'Cell') {
            if (currentRow && currentCell) currentRow.push(currentCell.value);
            currentCell = null;
        } else if (name === 'Row') {
            if (currentRow && currentRow.length > 0) rows.push(currentRow);
            currentRow = null;
        }
    });

    parser.write(xmlContent).close();

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => String(h).trim());
    const sheetData = [];

    for (let r = 1; r < rows.length; r++) {
        const rowCells = rows[r];
        const rowObj = Object.create(null);
        let hasVal = false;
        headers.forEach((h, idx) => {
            if (h && h !== '__proto__' && h !== 'constructor' && h !== 'prototype') {
                const cellVal = rowCells[idx] !== undefined ? rowCells[idx] : '';
                rowObj[h] = cellVal;
                if (cellVal !== '') hasVal = true;
            }
        });
        if (hasVal) sheetData.push(rowObj);
    }

    return sheetData;
}

// ============================================================
// PARSING MODERN XLSX WITH EXCELJS
// ============================================================
async function parseXLSXWithExcelJS(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        const val = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
        headers[colNumber] = val;
    });

    const sheetData = [];
    for (let r = 2; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        let hasValue = false;
        const rowData = Object.create(null);
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header && header !== '__proto__' && header !== 'constructor' && header !== 'prototype') {
                let cellVal = cell.value;
                if (cellVal && typeof cellVal === 'object') {
                    if ('result' in cellVal) cellVal = cellVal.result;
                    else if ('text' in cellVal) cellVal = cellVal.text;
                }
                rowData[header] = cellVal;
                hasValue = true;
            }
        });
        if (hasValue) {
            sheetData.push(rowData);
        }
    }
    return sheetData;
}

// ============================================================
// FUNGSI UTAMA: PARSE SPK EXCEL (.xlsx / .xls)
// ============================================================
async function parseSPKExcel(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let sheetData = [];

    if (ext === '.xlsx') {
        sheetData = await parseXLSXWithExcelJS(filePath);
    } else if (ext === '.xls') {
        const fd = fs.openSync(filePath, 'r');
        const headerBuf = Buffer.alloc(16);
        fs.readSync(fd, headerBuf, 0, 16, 0);
        fs.closeSync(fd);

        const isXml = headerBuf.toString('utf8').trim().startsWith('<?xml');
        if (isXml) {
            sheetData = parseSpreadsheetMLXml(filePath);
        } else {
            throw new Error('Format binary XLS legacy tidak didukung, silakan simpan sebagai .xlsx');
        }
    }

    const rows = sheetData.map(row => {
        let p = parseFloat(row['Panjang'] || row['P']) || 0;
        let l = parseFloat(row['Lebar'] || row['L']) || 0;
        let t = parseFloat(row['Tinggi'] || row['T']) || 0;

        const baseItem = row['Description'] || row['Nama Item'] || row['Bahan Baku'] || '';

        // Fallback: Extract from baseItem if P, L, or T is missing
        if ((p === 0 || l === 0 || t === 0) && baseItem) {
            const dimMatch = baseItem.match(/\(([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\)/i);
            if (dimMatch) {
                p = p || parseFloat(dimMatch[1]);
                l = l || parseFloat(dimMatch[2]);
                t = t || parseFloat(dimMatch[3]);
            }
        }

        const hasDim = p > 0 || l > 0 || t > 0;
        const finalItemName = hasDim && !baseItem.includes(`${p}x${l}x${t}`) && !baseItem.match(/\([\d.x\s]+\)/)
            ? `${baseItem.trim()} (${p}x${l}x${t})`
            : baseItem.trim();

        // Customer string safety
        const customerRaw = row['Customer Name'] || row['Customer'] || '-';
        let customerName = String(customerRaw).trim();
        if (customerName.length > 140) customerName = customerName.substring(0, 140);

        return {
            noWo: row['WO Number'] || row['No WO'] || '-',
            customer: customerName,
            item: finalItemName,
            qty: parseFloat(row['Quantity Ordered'] || row['Qty Cutting'] || row['Qty'] || 0),
            qtyBB: parseFloat(row['Quantity Ordered'] || row['Qty Bahan Baku'] || row['Qty BB'] || 0),
            qtyCut: parseInt(row['Quantity Ordered'] || row['Qty Cutting'] || row['Qty'] || 0),
            bahanBakuP: p,
            bahanBakuL: l,
            bahanBakuT: t
        };
    }).filter(r => r.item && (r.qty > 0 || r.qtyBB > 0));

    return { rows, shift: 1 };
}

module.exports = {
    parseSPKExcel,
    parseXLSXWithExcelJS,
    parseSpreadsheetMLXml,
    parseSPKPdf
};
