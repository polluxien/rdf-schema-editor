import { useState, useEffect } from "react";
import { X, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import type { CsvImportOptions } from "../../types/csvImport";

export type { CsvImportOptions };

interface CsvImportDialogProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (options: CsvImportOptions) => void;
}

const DELIMITERS = [
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe (|)" },
  { value: " ", label: "Space" },
];

const CHARSETS = [
  { value: "UTF-8", label: "UTF-8" },
  { value: "ISO-8859-1", label: "ISO-8859-1 (Latin-1)" },
  { value: "Windows-1252", label: "Windows-1252" },
  { value: "ASCII", label: "ASCII" },
];

const QUOTE_CHARS = [
  { value: '"', label: 'Double Quote (")' },
  { value: "'", label: "Single Quote (')" },
  { value: "", label: "None" },
];

const PREVIEW_ROWS = 5;

function parsePreview(
  raw: string,
  delimiter: string,
  quoteChar: string,
  hasHeader: boolean,
  headerRow: number,
): { headers: string[]; rows: string[][] } {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");

  const splitLine = (line: string): string[] => {
    if (!quoteChar) return line.split(delimiter);
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === quoteChar) {
        inQuote = !inQuote;
      } else if (ch === delimiter && !inQuote) {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  };

  if (lines.length === 0) return { headers: [], rows: [] };

  if (hasHeader) {
    const headers = splitLine(lines[0]);
    const rows = lines.slice(1, 1 + PREVIEW_ROWS).map(splitLine);
    return { headers, rows };
  } else {
    // headerRow is 1-based
    const idx = Math.max(0, (headerRow ?? 1) - 1);
    const dataLines = lines.slice(idx);
    const colCount = dataLines.length > 0 ? splitLine(dataLines[0]).length : 0;
    const headers = Array.from(
      { length: colCount },
      (_, i) => `Column ${i + 1}`,
    );
    const rows = dataLines.slice(0, PREVIEW_ROWS).map(splitLine);
    return { headers, rows };
  }
}

export default function CsvImportDialog({
  isOpen,
  file,
  onClose,
  onConfirm,
}: CsvImportDialogProps) {
  const [delimiter, setDelimiter] = useState(",");
  const [charset, setCharset] = useState("UTF-8");
  const [hasHeader, setHasHeader] = useState(true);
  const [headerRow, setHeaderRow] = useState(1);
  const [quoteChar, setQuoteChar] = useState('"');
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [rawPreview, setRawPreview] = useState<string>("");

  // Read a chunk of the file for preview
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      setRawPreview(text);
    };
    // Read at most ~8KB for preview
    const blob = file.slice(0, 8192);
    reader.readAsText(blob, charset);
  }, [file, charset]);

  if (!isOpen || !file) return null;

  const { headers, rows } = parsePreview(
    rawPreview,
    delimiter,
    quoteChar,
    hasHeader,
    headerRow,
  );

  const handleConfirm = () => {
    onConfirm({ delimiter, charset, hasHeader, quoteChar });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-2xl w-full max-w-2xl mx-4 dark:bg-gray-800 dark:border-gray-600 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileSpreadsheet size={20} className="text-blue-400" />
            <h2 className="font-semibold">Import CSV</h2>
          </div>
          <button
            onClick={() => {
              setAccordionOpen(false);
              onClose();
            }}
            className="text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* File info */}
          <div className="bg-gray-100 rounded px-3 py-2 text-sm dark:bg-gray-900">
            <span className="text-gray-500 dark:text-gray-400">File:</span>{" "}
            <span className="text-gray-900 dark:text-white">{file.name}</span>
            <span className="text-gray-500 ml-2">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>

          {/* Preview table */}
          {headers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
                Live Preview{" "}
                <svg
                  className="inline-block  w-3 h-4 animate-pulse text-red-400"
                  fill="currentColor"
                  viewBox="0 0 8 8"
                >
                  <circle cx="4" cy="4" r="3" />
                </svg>
              </p>
              <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 dark:bg-gray-900">
                    <tr>
                      {headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-r last:border-r-0 border-gray-200 dark:border-gray-700 whitespace-nowrap max-w-[140px] truncate"
                          title={h}
                        >
                          {h || (
                            <span className="text-gray-400 italic">empty</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-t border-gray-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-900/40"
                      >
                        {headers.map((_, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-1.5 text-gray-800 dark:text-gray-200 border-r last:border-r-0 border-gray-200 dark:border-gray-700 whitespace-nowrap max-w-[140px] truncate"
                            title={row[ci] ?? ""}
                          >
                            {row[ci] ?? (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 && (
                <p className="text-xs text-gray-400 mt-1 text-center">
                  No data rows found
                </p>
              )}
            </div>
          )}

          {/* Delimiter — always visible */}
          <div>
            <label className="block text-sm text-gray-700 mb-1 dark:text-gray-300">
              Delimiter
            </label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            >
              {DELIMITERS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Has header + optional header row number */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasHeader"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 bg-white text-blue-500 focus:ring-blue-500 focus:ring-offset-white dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-offset-gray-800"
              />
              <label
                htmlFor="hasHeader"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                First row contains column headers
              </label>
            </div>

            {!hasHeader && (
              <div className="flex items-center gap-3 pl-6">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Start from row
                </label>
                <input
                  type="number"
                  min={1}
                  value={headerRow}
                  onChange={(e) =>
                    setHeaderRow(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-20 bg-white border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Advanced settings accordion */}
          <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setAccordionOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="font-medium">Advanced settings</span>
              {accordionOpen ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>

            {accordionOpen && (
              <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                <div>
                  <label className="block text-sm text-gray-700 mb-1 dark:text-gray-300">
                    Character Set
                  </label>
                  <select
                    value={charset}
                    onChange={(e) => setCharset(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  >
                    {CHARSETS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1 dark:text-gray-300">
                    Quote Character
                  </label>
                  <select
                    value={quoteChar}
                    onChange={(e) => setQuoteChar(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  >
                    {QUOTE_CHARS.map((q) => (
                      <option key={q.value} value={q.value}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => {
              setAccordionOpen(false);
              onClose();
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-950 transition-colors dark:text-gray-300 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
