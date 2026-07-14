import { describe, expect, it } from "vitest";
import {
  csvGridToDataset,
  getCsvNonEmptyLines,
  normalizeCsvNewlines,
  parseCsvLine,
  parseCsvTextToDataset,
  parseCsvTextToGrid,
} from "./csvParse";
import type { CsvImportOptions } from "../types/csvImport";

const opts = (
  overrides: Partial<CsvImportOptions> = {}
): CsvImportOptions => ({
  delimiter: ",",
  charset: "UTF-8",
  hasHeader: true,
  quoteChar: '"',
  ...overrides,
});

function seqIds(prefix = "id") {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

describe("normalizeCsvNewlines", () => {
  it("converts CRLF and lone CR to LF", () => {
    expect(normalizeCsvNewlines("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("leaves plain LF unchanged", () => {
    expect(normalizeCsvNewlines("x\ny")).toBe("x\ny");
  });
});

describe("getCsvNonEmptyLines", () => {
  it("drops blank lines and trims-only lines", () => {
    expect(getCsvNonEmptyLines("  \n\na,b\n  \n")).toEqual(["a,b"]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(getCsvNonEmptyLines(" \t \n")).toEqual([]);
  });
});

describe("parseCsvLine", () => {
  it("splits on delimiter with no quotes", () => {
    expect(parseCsvLine("a,b, c ", ",", '"')).toEqual(["a", "b", "c"]);
  });

  it("ignores delimiter inside double-quoted fields", () => {
    expect(parseCsvLine('"a,b",c', ",", '"')).toEqual(["a,b", "c"]);
  });

  it("with empty quoteChar, does not treat quotes specially", () => {
    expect(parseCsvLine('"a","b"', ",", "")).toEqual(['"a"', '"b"']);
  });

  it("handles tab delimiter", () => {
    expect(parseCsvLine("x\ty\tz", "\t", "")).toEqual(["x", "y", "z"]);
  });

  it("empty string yields one empty field", () => {
    expect(parseCsvLine("", ",", '"')).toEqual([""]);
  });

  it("unclosed quote keeps delimiter characters inside field", () => {
    expect(parseCsvLine('"open,still', ",", '"')).toEqual(["open,still"]);
  });
});

describe("parseCsvTextToGrid", () => {
  it("returns null for empty content", () => {
    expect(parseCsvTextToGrid("", opts())).toBeNull();
    expect(parseCsvTextToGrid("\n\n", opts())).toBeNull();
  });

  it("with header: first row is headers, rest are data", () => {
    const g = parseCsvTextToGrid("h1,h2\nv1,v2\nv3,v4", opts({ hasHeader: true }));
    expect(g).toEqual({
      headers: ["h1", "h2"],
      rows: [
        ["v1", "v2"],
        ["v3", "v4"],
      ],
    });
  });

  it("with header only: rows array is empty", () => {
    const g = parseCsvTextToGrid("h1,h2", opts({ hasHeader: true }));
    expect(g?.headers).toEqual(["h1", "h2"]);
    expect(g?.rows).toEqual([]);
  });

  it("without header: synthetic column names from first row width", () => {
    const g = parseCsvTextToGrid("a,b", opts({ hasHeader: false }));
    expect(g?.headers).toEqual(["Column 1", "Column 2"]);
    expect(g?.rows).toEqual([["a", "b"]]);
  });

  it("normalizes CRLF before parsing", () => {
    const g = parseCsvTextToGrid("h1,h2\r\nv1,v2", opts({ hasHeader: true }));
    expect(g?.rows).toEqual([["v1", "v2"]]);
  });
});

describe("csvGridToDataset / parseCsvTextToDataset", () => {
  it("pads sampleValues when row has fewer cells than headers", () => {
    const ds = csvGridToDataset(
      "f.csv",
      { headers: ["A", "B", "C"], rows: [["1", "2"]] },
      seqIds()
    );
    expect(ds.columns[2].sampleValues).toEqual([""]);
  });

  it("parseCsvTextToDataset returns null when no rows", () => {
    expect(parseCsvTextToDataset("   \n", "x.csv", opts(), seqIds())).toBeNull();
  });

  it("uses injected ids for deterministic output", () => {
    const ids = seqIds("i");
    const ds = parseCsvTextToDataset(
      "A\n1",
      "t.csv",
      opts({ hasHeader: true }),
      ids
    );
    expect(ds?.id).toBe("i-1");
    expect(ds?.columns[0].id).toBe("i-2");
  });
});

describe("parseCsvTextToGrid — maxRows", () => {
  const text = "A,B\n1,2\n3,4\n5,6\n7,8";

  it("keeps only the first N data rows when maxRows is set", () => {
    const g = parseCsvTextToGrid(text, opts({ maxRows: 2 }));
    expect(g?.headers).toEqual(["A", "B"]);
    expect(g?.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("imports all rows when maxRows is undefined", () => {
    const g = parseCsvTextToGrid(text, opts());
    expect(g?.rows).toHaveLength(4);
  });

  it("imports all rows when maxRows is non-positive", () => {
    expect(parseCsvTextToGrid(text, opts({ maxRows: 0 }))?.rows).toHaveLength(4);
  });

  it("returns all rows when maxRows exceeds the row count", () => {
    expect(parseCsvTextToGrid(text, opts({ maxRows: 99 }))?.rows).toHaveLength(4);
  });

  it("counts data rows (not the header) when hasHeader is false", () => {
    const g = parseCsvTextToGrid(text, opts({ hasHeader: false, maxRows: 2 }));
    // First line becomes a data row here → first 2 lines kept.
    expect(g?.rows).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});
