import type { Dataset } from "../types";
import type { CsvImportOptions } from "../types/csvImport";

/** Normalizes Windows / old-Mac newlines so line-based parsing is stable. */
export function normalizeCsvNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function getCsvNonEmptyLines(text: string): string[] {
  return normalizeCsvNewlines(text)
    .split("\n")
    .filter((line) => line.trim());
}

/**
 * Parses a single CSV record line respecting an optional quote character.
 * Does not implement RFC 4180 escaped quotes (`""` inside quoted fields).
 */
export function parseCsvLine(
  line: string,
  delimiter: string,
  quoteChar: string
): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === quoteChar && quoteChar) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ParsedCsvGrid {
  headers: string[];
  rows: string[][];
}

/**
 * Parses raw CSV text into headers and row matrix. Returns `null` when there is no row data.
 */
export function parseCsvTextToGrid(
  text: string,
  options: Pick<CsvImportOptions, "delimiter" | "quoteChar" | "hasHeader">
): ParsedCsvGrid | null {
  const lines = getCsvNonEmptyLines(text);
  if (lines.length === 0) return null;

  const parseLine = (line: string) =>
    parseCsvLine(line, options.delimiter, options.quoteChar);

  const startIndex = options.hasHeader ? 1 : 0;
  const headers = options.hasHeader
    ? parseLine(lines[0])
    : parseLine(lines[0]).map((_, i) => `Column ${i + 1}`);
  const rows = lines.slice(startIndex).map(parseLine);

  return { headers, rows };
}

export type CreateId = () => string;

export function csvGridToDataset(
  name: string,
  grid: ParsedCsvGrid,
  createId: CreateId
): Dataset {
  const { headers, rows } = grid;
  return {
    id: createId(),
    name,
    columns: headers.map((header, index) => ({
      id: createId(),
      name: header,
      sampleValues: rows.slice(0, 5).map((row) => row[index] ?? ""),
    })),
    rows,
  };
}

/** Full pipeline: CSV text → dataset, or `null` if there is nothing to import. */
export function parseCsvTextToDataset(
  text: string,
  fileName: string,
  options: CsvImportOptions,
  createId: CreateId = () => crypto.randomUUID()
): Dataset | null {
  const grid = parseCsvTextToGrid(text, options);
  if (!grid) return null;
  return csvGridToDataset(fileName, grid, createId);
}
