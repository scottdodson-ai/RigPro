#!/usr/bin/env python3
"""
Extract Shoemaker Rigging quote data from every PDF in a folder and write JSON.

Usage:
  python extract_quotes.py /path/to/folder
  python extract_quotes.py /path/to/folder -o quotes.json

Notes:
- Designed for text-based PDFs like the sample quote documents.
- For scanned/image-only PDFs, you would need OCR added separately.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any

import pdfplumber


DATE_RE = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\s*,\s*\d{4}\b",
    re.I,
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b\d{3}[-.]\d{3}[-.]\d{4}\b")
MONEY_RE = re.compile(r"\$\s?[\d,]+\.\d{2}")


@dataclass
class Contact:
    name: str | None = None
    company: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None


@dataclass
class Sender:
    name: str | None = None
    company: str | None = None
    address: str | None = None
    phone: str | None = None
    fax: str | None = None
    email: str | None = None


@dataclass
class QuoteRecord:
    source_file: str
    quote_date_raw: str | None
    quote_date_iso: str | None
    recipient: dict[str, Any]
    work_scope: str | None
    scope_items: list[str]
    project_conditions: str | None
    total_price_raw: str | None
    total_price: float | None
    terms: str | None
    payment_terms: str | None
    proposal_valid_days: int | None
    sender: dict[str, Any]
    has_confidentiality_statement: bool
    raw_text_excerpt: str


def clean_text(text: str) -> str:
    text = text.replace("\u2022", "•")
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r" +([,.;:])", r"\1", text)
    return text.strip()


def normalize_spaces(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def normalize_date_str(value: str | None) -> str | None:
    if not value:
        return value
    value = value.replace("\n", " ")
    value = re.sub(r"\s+", " ", value)
    value = value.replace(" ,", ",")
    return value.strip()


def parse_date(value: str | None) -> str | None:
    if not value:
        return None
    value = normalize_date_str(value)
    value = re.sub(r"(\d{1,2})(st|nd|rd|th)", r"\1", value)
    for fmt in ("%B %d, %Y", "%B %d,%Y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def money_to_float(value: str | None) -> float | None:
    if not value:
        return None
    return float(value.replace("$", "").replace(",", "").strip())


def extract_pdf_text(pdf_path: str) -> str:
    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return normalize_spaces("\n".join(pages))


def extract_recipient(lines: list[str]) -> Contact:
    trigger_idx = next(
        (i for i, line in enumerate(lines) if "Shoemaker Rigging is pleased to provide pricing" in line),
        None,
    )
    if trigger_idx is None or trigger_idx < 2:
        return Contact()

    block = [line.strip() for line in lines[1:trigger_idx] if line.strip()]
    if not block:
        return Contact()

    first = block[0]
    name = company = None
    m = re.match(r"(?:(Mr\.|Mrs\.|Ms\.)\s+)?(.+?)\s*/\s*(.+)$", first)
    if m:
        prefix = (m.group(1) + " ") if m.group(1) else ""
        name = prefix + m.group(2).strip()
        company = m.group(3).strip()
    else:
        name = first

    email = phone = None
    if len(block) >= 2:
        last = block[-1]
        email_match = EMAIL_RE.search(last)
        phone_match = PHONE_RE.search(last)
        email = email_match.group(0) if email_match else None
        phone = phone_match.group(0) if phone_match else None

    address_lines = block[1:-1] if len(block) >= 3 else []
    address = ", ".join(address_lines) if address_lines else None

    return Contact(name=name, company=company, address=address, email=email, phone=phone)


def extract_sender(text: str) -> Sender:
    pattern = re.compile(
        r"Regards,\s*\n"
        r"(?P<name>.+?)\n"
        r"(?P<company>Shoemaker Rigging & Transport, LLC)\n"
        r"(?P<addr1>.+?)\n"
        r"(?P<addr2>Akron, Ohio \d{5})\n"
        r"(?P<phone>[\d\-.]+) phone\n"
        r"(?P<fax>[\d\-.]+) fax\n"
        r"(?P<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})",
        re.S,
    )
    m = pattern.search(text)
    if not m:
        return Sender()
    return Sender(
        name=m.group("name").strip(),
        company=m.group("company").strip(),
        address=f"{m.group('addr1').strip()}, {m.group('addr2').strip()}",
        phone=m.group("phone").strip(),
        fax=m.group("fax").strip(),
        email=m.group("email").strip(),
    )


def extract_scope_items(text: str) -> list[str]:
    items = re.findall(
        r"•\s*(.+?)(?=(?:\n•)|\nThis project is based upon|$)",
        text,
        re.S,
    )
    return [clean_text(item) for item in items]


def parse_quote(text: str, filename: str) -> QuoteRecord:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    quote_date_raw = normalize_date_str(lines[0]) if lines else None

    work_scope_match = re.search(
        r"Work Scope:\s*(.+?)(?=(?:\n•)|\nThis project is based upon)",
        text,
        re.S,
    )
    work_scope = clean_text(work_scope_match.group(1)) if work_scope_match else None

    conditions_match = re.search(
        r"(This project is based upon the scope of work listed above\..+?additional charges\.)",
        text,
        re.S,
    )
    project_conditions = clean_text(conditions_match.group(1)) if conditions_match else None

    total_price_raw = None
    price_match = re.search(r"Total Price.*?(\$\s?[\d,]+\.\d{2})", text, re.S)
    if price_match:
        total_price_raw = price_match.group(1).replace(" ", "")

    terms_match = re.search(r"Terms:\s*(.+)", text)
    terms = terms_match.group(1).strip() if terms_match else None

    payment_terms_match = re.search(r"(Net\s+\d+\s+days)", terms or "", re.I)
    proposal_valid_days_match = re.search(r"Proposal good for\s+(\d+)\s+days", terms or "", re.I)

    record = QuoteRecord(
        source_file=os.path.basename(filename),
        quote_date_raw=quote_date_raw,
        quote_date_iso=parse_date(quote_date_raw),
        recipient=asdict(extract_recipient(lines)),
        work_scope=work_scope,
        scope_items=extract_scope_items(text),
        project_conditions=project_conditions,
        total_price_raw=total_price_raw,
        total_price=money_to_float(total_price_raw),
        terms=terms,
        payment_terms=payment_terms_match.group(1) if payment_terms_match else None,
        proposal_valid_days=int(proposal_valid_days_match.group(1)) if proposal_valid_days_match else None,
        sender=asdict(extract_sender(text)),
        has_confidentiality_statement=("Confidentiality Statement:" in text),
        raw_text_excerpt=text[:500],
    )
    return record


def process_folder(folder: str) -> list[dict[str, Any]]:
    pdf_paths = sorted(glob.glob(os.path.join(folder, "*.pdf")))
    results: list[dict[str, Any]] = []
    for pdf_path in pdf_paths:
        try:
            text = extract_pdf_text(pdf_path)
            if not text.strip():
                results.append(
                    {
                        "source_file": os.path.basename(pdf_path),
                        "error": "No extractable text found. PDF may be scanned/image-only.",
                    }
                )
                continue
            record = parse_quote(text, pdf_path)
            results.append(asdict(record))
        except Exception as exc:
            results.append(
                {
                    "source_file": os.path.basename(pdf_path),
                    "error": f"Failed to parse PDF: {exc}",
                }
            )
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract quote fields from PDFs in a folder.")
    parser.add_argument("folder", help="Folder containing PDF quotes")
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Output JSON file path. Defaults to <folder>/quotes.json",
    )
    args = parser.parse_args()

    folder = os.path.abspath(args.folder)
    output = args.output or os.path.join(folder, "quotes.json")

    if not os.path.isdir(folder):
        raise SystemExit(f"Folder not found: {folder}")

    results = process_folder(folder)

    with open(output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Processed {len(results)} PDF file(s)")
    print(f"Wrote: {output}")


if __name__ == "__main__":
    main()
