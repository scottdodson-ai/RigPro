const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const inputDir = __dirname;
const outputFilePath = path.join(__dirname, 'consolidated_quotes.json');

// Read all PDF files from the directory
const pdfFiles = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.pdf'));

const consolidatedData = pdfFiles.map(async (file) => {
    try {
        const filePath = path.join(inputDir, file);
        const fileData = fs.readFileSync(filePath);

        // Parse PDF using pdf-parse
        const pdfText = await pdf(fileData);

        // Basic text extraction
        const text = pdfText.text || '';

        // Regular expressions (adjust patterns based on your PDF structure)
        const customerRegex = /Customer: ([^\n]+)/;
        const vendorRegex = /Vendor: ([^\n]+)/;
        const totalRegex = /Total: ([\d,]+)/;

        const customerMatch = customerRegex.exec(text);
        const vendorMatch = vendorRegex.exec(text);
        const totalMatch = totalRegex.exec(text);

        return {
            filename: file,
            customer: customerMatch?.[1] || 'N/A',
            vendor: vendorMatch?.[1] || 'N/A',
            total: totalRegex.test(text) ? totalMatch[0] : 'N/A',
            fullText: text
        };
    } catch (error) {
        console.error(`Error processing ${file}:`, error);
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
