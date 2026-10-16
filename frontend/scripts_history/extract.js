const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/ASUS/.gemini/antigravity-ide/brain/71bdfaca-eb88-45b2-b070-155fb5729b82/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let fileContent = '';

  for await (const line of rl) {
    if (line.includes('"toolAction":"Viewing DatabaseCycle.jsx"') && line.includes('"output":"')) {
      const parsed = JSON.parse(line);
      const output = parsed.output;
      // Extract the lines
      if (output) {
          // This might be the output of view_file
          // It's a huge string. We can find the file content inside.
          console.log("Found read!");
      }
    }
  }
}

processLineByLine();
