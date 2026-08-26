const db = require('./config/db');
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function parseSPKPdf(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const ITEM_PATTERN = /(\d+\.\d)(\d+\.\d)(\d+\.\d{2})(\d+\.\d{2})(\d*\.\d{2})(\d+)(LBR.+?)SH/i;
    const ROW_HEADER_PATTERN = /^(\d{1,3})\s{2,}(\d{7})(.*)/;

    let items = [];
    let currentItem = null;

    for (const line of lines) {
        const headerMatch = line.match(ROW_HEADER_PATTERN);
        if (headerMatch) {
            if (currentItem) items.push(currentItem);
            const cleanCustomer = headerMatch[3].replace(/\d+\.\d+.*$/, '').trim();
            currentItem = { noWo: headerMatch[2], customer: cleanCustomer ? [cleanCustomer] : [], lines: [line] };
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
            const t = parseFloat(itemMatch[4]); 
            const qtyBB = parseFloat(itemMatch[5]);
            const qtyCut = parseInt(itemMatch[6]);
            const baseName = itemMatch[7].trim();
            const customerStr = item.customer.join(' ').trim() || '-';
            
            const bbMatch = fullText.match(/(\d{2,3}\.\d)\s*(\d{2,3}\.\d)/g);
            if (bbMatch && bbMatch.length > 0) {
                const parts = bbMatch[bbMatch.length - 1].match(/(\d{2,3}\.\d)\s*(\d{2,3}\.\d)/);
                if (parts) {
                    let bb_l = parseFloat(parts[1]); let bb_p = parseFloat(parts[2]);
                    if (bb_l > bb_p) { const temp = bb_p; bb_p = bb_l; bb_l = temp; }
                    p = bb_p; l = bb_l;
                }
            } else {
                if (l > p) { const temp = p; p = l; l = temp; }
            }
            const namaItem = `${baseName} (${p}x${l}x${t})`;
            if (qtyBB > 0 && baseName) {
                rows.push({ noWo: item.noWo, customer: customerStr, item: namaItem, qtyBB, qtyCut });
            }
        }
    }
    return rows;
}

async function testInsert() {
    try {
        const rawText = (await pdfParse(fs.readFileSync('./uploads/1786065875042.pdf'))).text;
        const rawRows = await parseSPKPdf(rawText);
        
        let parsedData = [];
        for (const row of rawRows) {
            parsedData.push({
                noWo: row.noWo,
                customer: row.customer,
                item: row.item,
                qty: row.qtyBB,
                qtyCut: row.qtyCut,
                match: true,
                ct: 2.5,
                waktu: row.qtyBB * 2.5
            });
        }

        const itemsData = parsedData.map(item => [
            9999, // dummy history_id
            item.noWo,
            item.customer,
            item.item, 
            item.qty,
            item.waktu, 
            item.match ? 1 : 0
        ]);

        await db.query(`INSERT INTO spk_items (history_id, no_wo, customer, nama_item, qty, estimasi_waktu_menit, match_db) VALUES ?`, [itemsData]);
        console.log("Insert successful!");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
testInsert();
