import { useState, useEffect } from "react";
import { X, Download, Copy, Check, FileCode } from "lucide-react";
import { useAppContext } from "../../hooks/useAppContext";
import { exportRml } from "../../lib/rmlExport";

interface RmlExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RmlExportDialog({
  isOpen,
  onClose,
}: RmlExportDialogProps) {
  const { ontology, dataset, mappings } = useAppContext();
  const [rmlContent, setRmlContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const result = exportRml({ ontology, dataset, mappings });
      setRmlContent(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRmlContent("");
    }
  }, [isOpen, ontology, dataset, mappings]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const blob = new Blob([rmlContent], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapping.rml.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-2xl w-full max-w-2xl mx-4 dark:bg-gray-800 dark:border-gray-600 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileCode size={20} className="text-blue-400" />
            <h2 className="font-semibold">Export RML</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error ? (
            <div className="rounded border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : (
            <pre className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-xs text-gray-800 dark:text-gray-200 overflow-auto whitespace-pre font-mono">
              {rmlContent || <span className="text-gray-400 italic">No output</span>}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-950 transition-colors dark:text-gray-300 dark:hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            disabled={!rmlContent}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!rmlContent}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
