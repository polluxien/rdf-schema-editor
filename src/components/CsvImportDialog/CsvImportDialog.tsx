import { useState } from "react";
import { X, FileSpreadsheet } from "lucide-react";
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

export default function CsvImportDialog({
  isOpen,
  file,
  onClose,
  onConfirm,
}: CsvImportDialogProps) {
  const [delimiter, setDelimiter] = useState(",");
  const [charset, setCharset] = useState("UTF-8");
  const [hasHeader, setHasHeader] = useState(true);
  const [quoteChar, setQuoteChar] = useState('"');

  if (!isOpen || !file) return null;

  const handleConfirm = () => {
    onConfirm({ delimiter, charset, hasHeader, quoteChar });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <FileSpreadsheet size={20} className="text-blue-400" />
            <h2 className="font-semibold">Import CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-900 rounded px-3 py-2 text-sm">
            <span className="text-gray-400">File:</span>{" "}
            <span className="text-white">{file.name}</span>
            <span className="text-gray-500 ml-2">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Delimiter
              </label>
              <select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {DELIMITERS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Character Set
              </label>
              <select
                value={charset}
                onChange={(e) => setCharset(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {CHARSETS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Quote Character
              </label>
              <select
                value={quoteChar}
                onChange={(e) => setQuoteChar(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {QUOTE_CHARS.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasHeader"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <label htmlFor="hasHeader" className="text-sm text-gray-300">
                First row contains column headers
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
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
