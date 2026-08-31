const fs = require('fs');
const path = require('path');

const data = [
  { name: 'BC 21', height: 105 },
  { name: 'BC 25', height: 95 },
  { name: 'D 11', height: 110 },
  { name: 'D 14', height: 110 },
  { name: 'D 15', height: 99 },
  { name: 'D 16', height: 110 },
  { name: 'D 18', height: 110 },
  { name: 'D 20', height: 110 },
  { name: 'D 22', height: 110 },
  { name: 'D 23', height: 105 },
  { name: 'D 24', height: 110 },
  { name: 'D 25', height: 105 },
  { name: 'D 26', height: 100 },
  { name: 'D 28', height: 105 },
  { name: 'D 30', height: 100 },
  { name: 'D 32', height: 80 },
  { name: 'D 33', height: 100 },
  { name: 'D 35', height: 70 },
  { name: 'D 40', height: 75 },
  { name: 'D 55', height: 100 },
  { name: 'FR 20', height: 100 },
  { name: 'HR 32', height: 70 },
  { name: 'R 40', height: 75 },
  { name: 'R 50', height: 80 },
  { name: 'R 100', height: 48 },
  { name: 'R 70', height: 68 },
  { name: 'R 90', height: 52 },
  { name: 'RF', height: 110 },
  { name: 'RH 3', height: 110 },
  { name: 'RK 2', height: 105 },
  { name: 'TF 2', height: 110 },
  { name: 'TF 3', height: 110 },
  { name: 'TF 5', height: 110 },
];

const dataMap = new Map();
data.forEach(item => {
  dataMap.set(item.name, item.height);
  // Also add map for specific variations if needed
  if (item.name === 'RF') {
    dataMap.set('RF GR', 110);
    dataMap.set('RF LI', 110);
    dataMap.set('RF YE', 110);
  }
});

const file = path.join(__dirname, '../frontend/src/pages/DatabaseCycle.jsx');
let content = fs.readFileSync(file, 'utf8');

// The array starts at `const tinggiShortBlockData = [` and ends at `];`
// We will parse the array, update it, and write it back.
const match = content.match(/const tinggiShortBlockData = \[([\s\S]*?)\];/);
if (match) {
  const arrayContent = match[1];
  const items = [];
  const regex = /\{\s*busa:\s*'([^']+)',\s*tinggi:\s*(\d+)\s*\}/g;
  let itemMatch;
  while ((itemMatch = regex.exec(arrayContent)) !== null) {
    items.push({ busa: itemMatch[1], tinggi: parseInt(itemMatch[2], 10) });
  }

  // Update items
  items.forEach(item => {
    if (dataMap.has(item.busa)) {
      item.tinggi = dataMap.get(item.busa);
    }
  });

  // Reconstruct string
  let newArrayContent = '\n';
  for (let i = 0; i < items.length; i += 4) {
    const chunk = items.slice(i, i + 4);
    const chunkStr = chunk.map(c => `{ busa: '${c.busa}', tinggi: ${c.tinggi} }`).join(', ');
    newArrayContent += `    ${chunkStr}${i + 4 < items.length ? ',\n' : '\n'}`;
  }
  newArrayContent += '  ';

  const newContent = content.replace(match[0], `const tinggiShortBlockData = [${newArrayContent}];`);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log("DatabaseCycle.jsx updated successfully.");
} else {
  console.log("Could not find array in DatabaseCycle.jsx");
}
