import { useCallback, useEffect, useState } from "react";

function inferDestinationView(result) {
  const collection = result?.collection;
  const payload = result?.payload || {};

  if (collection === "quotes") {
    return "reports";
  }

  if (collection === "rigpro_tables") {
    const worksheet = String(payload.worksheet || "").toLowerCase();
    if (worksheet.includes("equip")) return "equipment";
    if (worksheet.includes("labor")) return "labor";
    if (worksheet.includes("customer")) return "customers";
    if (worksheet.includes("rfq") || worksheet.includes("request")) return "rfqs";
    if (worksheet.includes("job")) return "jobs";
  }

  return "dash";
}

export default function VectorSearchPanel({ token, setView, C, inp, sel, mkBtn, Card, Sec }) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("all");
  const [limit, setLimit] = useState(8);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [searchedCollections, setSearchedCollections] = useState([]);
  const [autoSearch, setAutoSearch] = useState(true);

  const runSearch = useCallback(async () => {
    if (!token) {
      setError("You must be logged in to run semantic search.");
      return;
    }

    const q = query.trim();
    if (!q) {
      setError("Enter a search phrase first.");
      setResults([]);
      setSearchedCollections([]);
      return;
    }

    setIsSearching(true);
    setError("");
    try {
      const resp = await fetch("/api/search/vector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: q,
          collection,
          limit: Number(limit) || 8,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || data?.details || `Search failed (${resp.status})`);
      }

      setResults(Array.isArray(data.results) ? data.results : []);
      setSearchedCollections(Array.isArray(data.searchedCollections) ? data.searchedCollections : []);
    } catch (err) {
      setResults([]);
      setSearchedCollections([]);
      setError(err?.message || "Vector search failed.");
    } finally {
      setIsSearching(false);
    }
  }, [collection, limit, query, token]);

  useEffect(() => {
    if (!autoSearch || !query.trim() || !token) return;

    const timer = setTimeout(() => {
      runSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [autoSearch, collection, limit, query, runSearch, token]);

  const summarizePayload = (payload = {}) => {
    if (payload.text) {
      return String(payload.text).slice(0, 260);
    }
    if (Array.isArray(payload.fields) && payload.fields.length) {
      return payload.fields.slice(0, 4).join(" | ").slice(0, 260);
    }
    return "No text preview available for this item.";
  };

  const resultTitle = (result) => {
    const p = result?.payload || {};
    if (p.filename) return p.filename;
    if (p.relPath) return p.relPath;
    if (p.worksheet) return `${p.worksheet} row ${p.rowNumber || ""}`.trim();
    return String(result?.id || "Result");
  };

  const sourceLabel = (result) => {
    const p = result?.payload || {};
    if (result?.collection === "quotes") {
      return p.relPath || p.filename || "quotes";
    }
    if (result?.collection === "rigpro_tables") {
      return `${p.worksheet || "worksheet"}${p.rowNumber ? ` • row ${p.rowNumber}` : ""}`;
    }
    return result?.collection || "unknown";
  };

  const openResultContext = (result) => {
    const destination = inferDestinationView(result);
    setView(destination);
  };

  return (
    <Card>
      <Sec c="Semantic Search"/>
      <div style={{ fontSize:12, color:C.txtS, marginBottom:10 }}>
        Search indexed quote files and imported table rows using vector similarity.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(240px,1fr) 150px 110px auto", gap:8, alignItems:"center" }}>
        <input
          style={{ ...inp, width:"100%" }}
          value={query}
          onChange={e=>setQuery(e.target.value)}
          placeholder="Try: General Aluminum quote"
          onKeyDown={e=>{ if (e.key === "Enter" && !isSearching) runSearch(); }}
        />
        <select style={{ ...sel, width:"100%" }} value={collection} onChange={e=>setCollection(e.target.value)}>
          <option value="all">All collections</option>
          <option value="quotes">Quotes</option>
          <option value="rigpro_tables">RigPro tables</option>
        </select>
        <select style={{ ...sel, width:"100%" }} value={limit} onChange={e=>setLimit(Number(e.target.value))}>
          {[5, 8, 10, 15].map(n=><option key={n} value={n}>{n} results</option>)}
        </select>
        <button
          style={{ ...mkBtn("primary"), justifyContent:"center", minWidth:120 }}
          onClick={runSearch}
          disabled={isSearching}
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.txtM, cursor:"pointer" }}>
          <input
            type="checkbox"
            checked={autoSearch}
            onChange={e=>setAutoSearch(e.target.checked)}
            style={{ width:14, height:14 }}
          />
          Auto-search while typing
        </label>
      </div>

      {error && (
        <div style={{ marginTop:10, background:C.redB, border:`1px solid ${C.redBdr}`, color:C.red, borderRadius:6, padding:"8px 10px", fontSize:12 }}>
          {error}
        </div>
      )}

      {!error && searchedCollections.length > 0 && (
        <div style={{ marginTop:10, fontSize:11, color:C.txtS }}>
          Collections searched: {searchedCollections.join(", ")}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
          {results.map((r, idx) => (
            <div key={`${r.id || idx}-${idx}`} style={{ border:`1px solid ${C.bdr}`, borderRadius:8, padding:"10px 12px", background:C.sur }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:4, alignItems:"baseline" }}>
                <div style={{ fontWeight:700, color:C.txt, fontSize:13 }}>{resultTitle(r)}</div>
                <div style={{ fontSize:11, color:C.acc, fontWeight:700 }}>{Number(r.score || 0).toFixed(3)}</div>
              </div>
              <div style={{ fontSize:11, color:C.txtS, marginBottom:5 }}>
                {r.collection} • {sourceLabel(r)}
              </div>
              <div style={{ fontSize:12, color:C.txtM, lineHeight:1.45 }}>
                {summarizePayload(r.payload)}
              </div>
              <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end" }}>
                <button style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 10px" }} onClick={()=>openResultContext(r)}>
                  Open Context
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isSearching && !error && query.trim() && results.length === 0 && searchedCollections.length > 0 && (
        <div style={{ marginTop:10, fontSize:12, color:C.txtS }}>
          No matches found. Try a different phrase or switch collections.
        </div>
      )}
    </Card>
  );
}
