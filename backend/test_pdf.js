const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

async function testPdf() {
    // Cari file pdf di direktori uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        console.log("No uploads dir");
        return;
    }
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
    if (files.length === 0) {
        console.log("No pdf files found");
        return;
    }
    
    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        console.log("Parsing", file);
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        
        const lines = pdfData.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        // Tampilkan beberapa baris yang mengandung 'LBR'
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('LBR')) {
                console.log(`\nLine ${i - 1}: ${lines[i - 1]}`);
                console.log(`Line ${i}: ${lines[i]}`);
                console.log(`Line ${i + 1}: ${lines[i + 1]}`);
            }
        }
    }
}

testPdf();
