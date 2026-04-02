import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const QUOTES_DIR = path.resolve("import_data/quotes");
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text:latest";
const COLLECTION = process.env.QDRANT_COLLECTION || "quotes";
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 25);
const MAX_TEXT_CHARS = Number(process.env.MAX_TEXT_CHARS || 6000);

function quoteIdForFile(relPath) {
  const hex = crypto.createHash("sha256").update(relPath).digest("hex").slice(0, 32);
  const chars = hex.split("");
  chars[12] = "5";
  chars[16] = ["8", "9", "a", "b"][Number.parseInt(chars[16], 16) % 4];
  const normalized = chars.join("");
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function normalizeWhitespace(input) {
  return input.replace(/\s+/g, " ").trim();
}

function rtfToText(rtf) {
  const noControls = rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, " ");
  return normalizeWhitespace(noControls);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function buildDocument(filePath) {
  const relPath = path.relative(QUOTES_DIR, filePath);
  const ext = path.extname(filePath).toLowerCase();
  const stat = await fs.stat(filePath);

  let extracted = "";
  if (ext === ".json") {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      extracted = normalizeWhitespace(JSON.stringify(parsed));
    } catch {
      extracted = normalizeWhitespace(await fs.readFile(filePath, "utf8"));
    }
  } else if (ext === ".rtf") {
    extracted = rtfToText(await fs.readFile(filePath, "utf8"));
  }

  const filename = path.basename(filePath);
  const textBase = [
    `Quote file: ${filename}`,
    `Relative path: ${relPath}`,
    `Extension: ${ext || "(none)"}`,
    `Size bytes: ${stat.size}`,
    extracted ? `Extracted content: ${extracted}` : "Extracted content: (not extracted for this file type)",
  ].join("\n");

  const text = textBase.slice(0, MAX_TEXT_CHARS);
  return {
    id: quoteIdForFile(relPath),
    relPath,
    filename,
    extension: ext,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    text,
  };
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
  if (getRes.ok) {
    return;
  }

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

async function main() {
  const allFiles = await walk(QUOTES_DIR);
  const quoteFiles = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ext === ".pdf" || ext === ".rtf" || ext === ".json";
  });

  if (quoteFiles.length === 0) {
    console.log("No quote files found to import.");
    return;
  }

  quoteFiles.sort((a, b) => a.localeCompare(b));
  console.log(`Preparing ${quoteFiles.length} quote files...`);

  const docs = [];
  for (const file of quoteFiles) {
    docs.push(await buildDocument(file));
  }

  const firstEmbedding = await embedText(docs[0].text);
  await ensureCollection(firstEmbedding.length);

  let imported = 0;
  let batch = [
    {
      id: docs[0].id,
      vector: firstEmbedding,
      payload: {
        relPath: docs[0].relPath,
        filename: docs[0].filename,
        extension: docs[0].extension,
        sizeBytes: docs[0].sizeBytes,
        modifiedAt: docs[0].modifiedAt,
        text: docs[0].text,
      },
    },
  ];

  for (let i = 1; i < docs.length; i += 1) {
    const d = docs[i];
    const embedding = await embedText(d.text);
    batch.push({
      id: d.id,
      vector: embedding,
      payload: {
        relPath: d.relPath,
        filename: d.filename,
        extension: d.extension,
        sizeBytes: d.sizeBytes,
        modifiedAt: d.modifiedAt,
        text: d.text,
      },
    });

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

  console.log(`Done. Imported ${imported} quote files into collection '${COLLECTION}'.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
