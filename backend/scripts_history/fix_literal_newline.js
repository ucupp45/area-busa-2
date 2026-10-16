const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/InsertSPK.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\n\\n/g, '\r\n\r\n');

fs.writeFileSync(file, content);
console.log("Replaced literal backslash n with real newlines");
