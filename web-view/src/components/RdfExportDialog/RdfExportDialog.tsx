import { useState } from "react";
import { X, Download, FileText, Loader2, AlertTriangle } from "lucide-react";
import { useAppContext } from "../../hooks/useAppContext";

type OutputFormat = "turtle" | "ntriples" | "jsonld";

interface RdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL as string;

function datasetToCsv(
  columns: { name: string }[],
  rows: string[][],
): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const header = columns.map((c) => escape(c.name)).join(",");
  const dataRows = rows.map((r) => r.map(escape).join(","));
  return [header, ...dataRows].join("\n");
}

export default function RdfExportDialog({ isOpen, onClose }: RdfExportDialogProps) {
  const { ontology, dataset, mappings, relations, flowNodes, baseIri } = useAppContext();
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("turtle");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("");

  if (!isOpen) return null;

  const canExport = !!dataset && dataset.rows.length > 0;

  const handleExport = async () => {
    setStatus("loading");
    setErrorMsg(null);
    setPhase("Building RML mapping…");

    try {
      const { buildMappingExport } = await import("../../lib/exportMapping");
      const { rml, warnings } = await buildMappingExport({
        ontology,
        dataset,
        mappings,
        relations,
        flowNodes,
        baseIri,
      });

      if (!rml.trim()) {
        throw new Error(
          "The RML mapping is empty. Add at least one class and column mapping before exporting RDF.",
        );
      }

      if (warnings.length > 0) {
        console.warn("[RdfExport] mapping warnings:", warnings);
      }

      const csv = datasetToCsv(dataset!.columns, dataset!.rows);

      setPhase("Pulling latest rdf-transform service & starting container… (first run may take ~30 s)");

      const res = await fetch(`${API_BASE_URL}/api/export/rdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rml, csv, outputFormat }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        let detail = text;
        try {
          const json = JSON.parse(text);
          detail = json?.error ?? json?.errors?.[0]?.msg ?? text;
        } catch {
          // not JSON
        }
        throw new Error(detail);
      }

      const blob = await res.blob();
      const ext = outputFormat === "jsonld" ? "jsonld" : outputFormat === "ntriples" ? "nt" : "ttl";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `output.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
      setPhase("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
      setPhase("");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setErrorMsg(null);
    setPhase("");
    onClose();
  };

  const selectClass =
    "rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 " +
    "px-2 py-1 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-2xl w-full max-w-md mx-4 dark:bg-gray-800 dark:border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileText size={20} className="text-green-500" />
            <h2 className="font-semibold">Export RDF</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!canExport && (
            <div className="flex items-start gap-2 rounded border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>No dataset loaded. Import a CSV file before exporting RDF.</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400 w-28 shrink-0">
              Output format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
              className={selectClass}
              disabled={status === "loading"}
            >
              <option value="turtle">Turtle (.ttl)</option>
              <option value="ntriples">N-Triples (.nt)</option>
              <option value="jsonld">JSON-LD (.jsonld)</option>
            </select>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            On first use the backend will pull the latest{" "}
            <code className="font-mono bg-gray-100 dark:bg-gray-900 px-1 rounded">
              rdf-transform
            </code>{" "}
            service and build its Docker image (~30 s). Subsequent exports
            reuse the running container and are fast.
          </p>

          {/* Status */}
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>{phase}</span>
            </div>
          )}
          {status === "done" && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Download started successfully.
            </p>
          )}
          {status === "error" && errorMsg && (
            <div className="rounded border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-3 py-2 text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap break-words">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-950 transition-colors dark:text-gray-300 dark:hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={!canExport || status === "loading"}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-40"
          >
            {status === "loading" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {status === "loading" ? "Exporting…" : "Export RDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
