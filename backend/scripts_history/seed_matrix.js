const db = require('./config/db');

const matriksShortBlock = [
    { varians: 'Varians I', products: ['D 16', 'D 11', 'D 12', 'D 13', 'D 14', 'D 15', 'RF', 'TF 1', 'TF 2', 'TF 3', 'TFP', 'GR 1', 'GR 2', 'GR 3', 'RK 2'], ct: 1.8 },
    { varians: 'Varians II', products: ['D 18', 'D 19', 'D 20', 'D 22', 'D 23', 'FR 18', 'FR 20', 'FR 22', 'BC 16', 'BC 18', 'BC 21', 'RH 3', 'TF 4', 'TF 5', 'TF 6', 'GR 4', 'GR 5'], ct: 2.0 },
    { varians: 'Varians III', products: ['D 24', 'D 25', 'D 26', 'FR 24', 'HR 24', 'FR 25', 'RHL 25', 'RHL 26', 'RHL 28', 'BC 25', 'HR 26'], ct: 2.2 },
    { varians: 'Varians IV', products: ['D 40', 'D 28', 'D 30', 'D 32', 'D 33', 'D 35', 'D 42', 'D 50', 'D 55', 'FR 30', 'FR 40', 'FRH 40', 'FR 5 - 40', 'FR 8 - 50', 'HR 30', 'HR 35', 'RHL 32', 'RHL 35', 'RHL 50', 'RHL 55', 'GH 55'], ct: 2.3 },
    { varians: 'Varians V', products: ['R 50', 'R 40', 'R 55'], ct: 2.5 },
    { varians: 'Varians VI', products: ['R 100', 'R 70', 'R 90'], ct: 3.6 },
];

async function seed() {
    try {
        console.log('Mulai seeding data matrix...');
        for (const m of matriksShortBlock) {
            for (const prod of m.products) {
                // Gunakan LBR sebagai prefix seperti nama item pada umumnya, atau gunakan langsung
                // Biasanya nama item pada SPK punya prefix. Kita masukkan saja nama persisnya dan dengan prefix LBR
                const itemsToInsert = [
                    prod,
                    `LBR ${prod}`
                ];
                
                for (const itemName of itemsToInsert) {
                    await db.query(`
                        INSERT INTO cycle_time_matrix (nama_item, varians, cycle_time_menit)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE varians = ?, cycle_time_menit = ?
                    `, [itemName, m.varians, m.ct, m.varians, m.ct]);
                }
            }
        }
        console.log('Selesai seeding data matrix!');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
