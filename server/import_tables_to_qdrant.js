import crypto from "node:crypto";
import path from "node:path";
import ExcelJS from "exceljs";

const XLSX_PATH = path.resolve("import_data/rigpro_tables_export.xlsx");
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text:latest";
const COLLECTION = process.env.QDRANT_COLLECTION || "rigpro_tables";
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 20);
const MAX_TEXT_CHARS = Number(process.env.MAX_TEXT_CHARS || 7000);

function toUuidFromKey(key) {
  const hex = crypto.createHash("sha256").update(key).digest("hex").slice(0, 32);
  const chars = hex.split("");
  chars[12] = "5";
  chars[16] = ["8", "9", "a", "b"][Number.parseInt(chars[16], 16) % 4];
  const normalized = chars.join("");
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function cleanValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text;
    return JSON.stringify(v);
  }
  return String(v);
}

function normalizeWhitespace(input) {
  return input.replace(/\s+/g, " ").trim();
}

async function embedText(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error("Embedding response missing vector");
  }
  return data.embedding;
}

async function ensureCollection(vectorSize) {
  const getRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`);
  if (getRes.ok) return;

  const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Collection create failed (${createRes.status}): ${body}`);
  }
}

async function upsertBatch(points) {
  const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upsert failed (${res.status}): ${body}`);
  }
}

function buildRowDoc(sheetName, headers, rowNumber, rowValues) {
  const fields = [];
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i] || `column_${i + 1}`;
    const value = rowValues[i] ?? "";
    if (value !== "") {
      fields.push(`${key}: ${value}`);
    }
  }

  if (fields.length === 0) return null;

  const text = normalizeWhitespace(
    [
      `Worksheet: ${sheetName}`,
      `Row: ${rowNumber}`,
      ...fields,
    ].join("\n"),
  ).slice(0, MAX_TEXT_CHARS);

  return {
    id: toUuidFromKey(`${sheetName}:${rowNumber}:${fields.join("|")}`),
    payload: {
      worksheet: sheetName,
      rowNumber,
      fields,
      text,
    },
    text,
  };
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const docs = [];
  for (const worksheet of workbook.worksheets) {
    if (worksheet.rowCount < 2) continue;

    const headerRow = worksheet.getRow(1);
    const headers = [];
    for (let c = 1; c <= worksheet.columnCount; c += 1) {
      headers.push(normalizeWhitespace(cleanValue(headerRow.getCell(c).value || `column_${c}`)));
    }

    for (let r = 2; r <= worksheet.rowCount; r += 1) {
      const row = worksheet.getRow(r);
      const rowValues = [];
      for (let c = 1; c <= worksheet.columnCount; c += 1) {
        rowValues.push(normalizeWhitespace(cleanValue(row.getCell(c).value)));
      }
      const doc = buildRowDoc(worksheet.name, headers, r, rowValues);
      if (doc) docs.push(doc);
    }
  }

  if (docs.length === 0) {
    console.log("No non-empty rows found in workbook.");
    return;
  }

  console.log(`Preparing ${docs.length} table rows...`);

  const firstEmbedding = await embedText(docs[0].text);
  await ensureCollection(firstEmbedding.length);

  let imported = 0;
  const first = docs[0];
  let batch = [
    {
      id: first.id,
      vector: firstEmbedding,
      payload: first.payload,
    },
  ];

  for (let i = 1; i < docs.length; i += 1) {
    const d = docs[i];
    const embedding = await embedText(d.text);
    batch.push({ id: d.id, vector: embedding, payload: d.payload });

    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch);
      imported += batch.length;
      console.log(`Imported ${imported}/${docs.length}...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await upsertBatch(batch);
    imported += batch.length;
  }

  console.log(`Done. Imported ${imported} rows into collection '${COLLECTION}'.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
