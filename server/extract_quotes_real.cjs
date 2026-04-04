const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const inputDir = path.join(__dirname, 'import_data/quotes');
const outputJson = path.join(__dirname, 'consolidated_quotes.json');
const pdfRegex = /\.pdf$/i;

const patterns = {
  customer: /customer\s+([^\n]+)/i,
  vendor: /vendor\s+([^\n]+)/i,
  total: /total[\s:]+\$?([\d,\.]+)/i
};

async function processPDF(filename) {
  try {
    const dataBuffer = fs.readFileSync(filename);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const extracted = {
      filename: path.basename(filename),
      customer: extractField(text, patterns.customer),
      vendor: extractField(text, patterns.vendor),
      total: extractField(text, patterns.total),
      raw_text_preview: text.substring(0, 200).replace(/\n/g, ' ')
    };

    return extracted;
  } catch (error) {
    console.error(`Error processing ${path.basename(filename)}:`, error.message);
    return null;
  }
}

function extractField(text, pattern) {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : 'N/A';
}

async function main() {
  const files = fs.readdirSync(inputDir);
  const results = [];
  let count = 0;

  console.log(`Found ${files.length} files. Processing PDFs...`);

  for (const file of files) {
    if (pdfRegex.test(file)) {
      const data = await processPDF(path.join(inputDir, file));
      if (data) {
        results.push(data);
      }
      count++;
      if (count % 10 === 0) console.log(`Processed ${count} PDFs...`);
    }
  }

  fs.writeFileSync(outputJson, JSON.stringify(results, null, 2));
  console.log(`Successfully processed ${results.length} quotes. Output saved to ${outputJson}`);
}

main();
