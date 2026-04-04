import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFParser from 'pdf2json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = __dirname;
const outputFilePath = path.join(__dirname, 'consolidated_quotes.json');

const pdfFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.pdf'));
const consolidatedData = [];

console.log(`Processing ${pdfFiles.length} files...`);

let processed = 0;

function parseNext() {
    if (processed >= pdfFiles.length) {
        fs.writeFileSync(outputFilePath, JSON.stringify(consolidatedData, null, 2));
        console.log(`Successfully processed ${consolidatedData.length} files. Data saved to ${outputFilePath}`);
        return;
    }

    const file = pdfFiles[processed];
    const pdfParser = new PDFParser(this, 1);
    
    pdfParser.on("pdfParser_dataError", errData => {
        consolidatedData.push({ filename: file, error: errData.parserError });
        processed++;
        parseNext();
    });

    pdfParser.on("pdfParser_dataReady", pdfData => {
        const text = pdfParser.getRawTextContent();
        
        const customerRegex = /Customer(?:[:\s]+)(.*?)(?:Vendor|Total|$)/i;
        const vendorRegex = /Vendor(?:[:\s]+)(.*?)(?:Customer|Total|$)/i;
        const totalRegex = /Total(?:[:\s]+)\$?([\d,]+\.?\d*)/i;

        const customerMatch = customerRegex.exec(text);
        const vendorMatch = vendorRegex.exec(text);
        const totalMatch = totalRegex.exec(text);

        consolidatedData.push({
            filename: file,
            customer: customerMatch?.[1]?.trim() || 'N/A',
            vendor: vendorMatch?.[1]?.trim() || 'N/A',
            total: totalMatch?.[1]?.trim() ? totalMatch[1] : 'N/A'
        });

        processed++;
        parseNext();
    });

    pdfParser.loadPDF(path.join(inputDir, file));
}

if(pdfFiles.length > 0) {
    parseNext();
} else {
    console.log("No PDF files found.");
}
