import { useState, useEffect } from "react";
import { X, Download, Copy, Check, FileCode, AlertTriangle } from "lucide-react";
import { useAppContext } from "../../hooks/useAppContext";

type Tab = "yarrrml" | "ttl";

interface RmlExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RmlExportDialog({
  isOpen,
  onClose,
}: RmlExportDialogProps) {
  const { ontology, dataset, mappings, relations, flowNodes, baseIri } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>("yarrrml");
  const [yarrrmlContent, setYarrrmlContent] = useState("");
  const [rmlContent, setRmlContent] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    import("../../lib/exportMapping")
      .then(({ buildMappingExport }) =>
        buildMappingExport({ ontology, dataset, mappings, relations, flowNodes, baseIri }),
      )
      .then(({ yarrrml, rml, warnings: w }) => {
        setYarrrmlContent(yarrrml);
        setRmlContent(rml);
        setWarnings(w);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [isOpen, ontology, dataset, mappings, relations, flowNodes, baseIri]);

  if (!isOpen) return null;

  const content = activeTab === "yarrrml" ? yarrrmlContent : rmlContent;
  const filename = activeTab === "yarrrml" ? "mapping.yarrrml.yml" : "mapping.rml.ttl";
  const mimeType = activeTab === "yarrrml" ? "text/yaml" : "text/turtle";

  const handleDownload = () => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabClass = (tab: Tab) =>
    `px-3 py-1.5 text-xs font-medium transition-colors ${
      activeTab === tab
        ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
    }`;

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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button className={tabClass("yarrrml")} onClick={() => setActiveTab("yarrrml")}>
            YARRRML
          </button>
          <button className={tabClass("ttl")} onClick={() => setActiveTab("ttl")}>
            RML / Turtle
          </button>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-start gap-2 mx-4 mt-3 rounded border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300 shrink-0">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-0.5">
                {warnings.length} warning{warnings.length > 1 ? "s" : ""}
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error ? (
            <div className="rounded border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400 dark:text-gray-500">
              Generating…
            </div>
          ) : (
            <pre className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-xs text-gray-800 dark:text-gray-200 overflow-auto whitespace-pre font-mono">
              {content || <span className="text-gray-400 italic">No output — add at least one class and column mapping.</span>}
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
            disabled={!content || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!content || loading}
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
