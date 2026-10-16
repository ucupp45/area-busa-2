const fs = require('fs');
let file = fs.readFileSync('src/pages/Realisasi.jsx', 'utf8');
file = file.replace(/step="0\.01"/g, 'step="any"');
file = file.replace(/\.toFixed\(2\)/g, '.toFixed(1)');
fs.writeFileSync('src/pages/Realisasi.jsx', file);
console.log('Replaced successfully');
