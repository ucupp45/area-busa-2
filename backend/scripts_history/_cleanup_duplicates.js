const fs = require('fs');
const lines = fs.readFileSync('./controllers/spkController.js', 'utf8').split('\n');

// Lines 287-446 are garbage (1-indexed), so remove indices 286-445 (0-indexed)
// Keep line 285 ("}") and line 286 ("") which properly end the first function
// Then line 447 starts "// ============================================================" for getCT
const cleanedLines = [
    ...lines.slice(0, 286),  // lines 1-286 (first matchAndCalculate + closing brace + blank)
    ...lines.slice(446)       // lines 447+ (getCT and onwards)
];

fs.writeFileSync('./controllers/spkController.js', cleanedLines.join('\n'));
console.log(`Removed ${lines.length - cleanedLines.length} garbage lines`);
console.log(`File now has ${cleanedLines.length} lines`);
