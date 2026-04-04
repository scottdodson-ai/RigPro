import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = __dirname;
const outputFilePath = path.join(__dirname, 'consolidated_quotes.json');

const pdfFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.pdf'));

const consolidatedData = pdfFiles.map(async (file) => {
    try {
        const filePath = path.join(inputDir, file);
        const fileData = new Uint8Array(fs.readFileSync(filePath));

        const loadingTask = pdfjsLib.getDocument({ data: fileData, useSystemFonts: true });
        const pdfDocument = await loadingTask.promise;
        
        // Basic text extraction
        const numPages = pdfDocument.numPages;
        let text = '';
        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            text += pageText + ' ';
        }

        // Regular expressions
        const customerRegex = /Customer(?:[:\s]+)(.*?)(?:Vendor|Total|$)/i;
        const vendorRegex = /Vendor(?:[:\s]+)(.*?)(?:Customer|Total|$)/i;
        const totalRegex = /Total(?:[:\s]+)\$?([\d,]+\.?\d*)/i;

        const customerMatch = customerRegex.exec(text);
        const vendorMatch = vendorRegex.exec(text);
        const totalMatch = totalRegex.exec(text);

        return {
            filename: file,
            customer: customerMatch?.[1]?.trim() || 'N/A',
            vendor: vendorMatch?.[1]?.trim() || 'N/A',
            total: totalMatch?.[1]?.trim() ? totalMatch[1] : 'N/A'
        };
    } catch (error) {
        return {
            filename: file,
            error: error.message
        };
    }
});

Promise.all(consolidatedData)
    .then(data => {
        fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
        console.log(`Successfully processed ${data.length} files. Data saved to ${outputFilePath}`);
    })
    .catch(error => {
        console.error('Error during processing:', error);
    });
