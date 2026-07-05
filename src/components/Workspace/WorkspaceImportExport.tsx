import { useRef, useState } from "react";
import { useFileImport } from "../FileImport/FileImportContext";
import { useAppContext } from "../../hooks/useAppContext";
import OwlImportDialog from "../OwlImportDialog";
import RmlExportDialog from "../RmlExportDialog";

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WorkspaceImportExport() {
  const { importFiles, importOntologyFromContent } = useFileImport();
  const { ontology, dataset, mappings, relations, flowNodes, baseIri, setBaseIri } =
    useAppContext();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const owlInputRef = useRef<HTMLInputElement>(null);
  const [owlDialogOpen, setOwlDialogOpen] = useState(false);
  const [rmlDialogOpen, setRmlDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importFiles([file]);
    event.target.value = "";
  };

  const runExport = async (format: "yarrrml" | "ttl") => {
    setIsExporting(true);
    try {
      // Lazy-loaded: keeps the YARRRML→RML parser (n3 etc.) out of the initial bundle.
      const { buildMappingExport } = await import("../../lib/exportMapping");
      const { yarrrml, rml, warnings } = await buildMappingExport({
        ontology,
        dataset,
        mappings,
        relations,
        flowNodes,
        baseIri,
      });

      if (format === "yarrrml") {
        downloadFile(yarrrml, "mapping.yarrrml.yml", "text/yaml");
      } else {
        downloadFile(rml, "mapping.ttl", "text/turtle");
      }

      if (warnings.length > 0) {
        window.alert(
          `Mapping exported with ${warnings.length} warning(s):\n\n` + warnings.join("\n"),
        );
      }
    } catch (error) {
      console.error("Mapping export failed:", error);
      window.alert("Mapping export failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  const actionClass =
    "text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40 dark:hover:text-gray-200";

  return (
    <div className="flex items-center gap-3 px-3 py-1 text-xs border-b border-gray-200 dark:border-gray-800">
      <span className="text-gray-500 select-none dark:text-gray-600">import</span>
      <button
        type="button"
        onClick={() => csvInputRef.current?.click()}
        className={actionClass}
      >
        csv
      </button>
      <button
        type="button"
        onClick={() => setOwlDialogOpen(true)}
        className={actionClass}
      >
        owl
      </button>
      <span className="text-gray-300 dark:text-gray-700">|</span>
      <span className="text-gray-500 select-none dark:text-gray-600">export</span>
      <button
        type="button"
        onClick={() => runExport("yarrrml")}
        disabled={isExporting}
        className={actionClass}
      >
        yarrrml
      </button>

      <button
        type="button"
        onClick={() => runExport("ttl")}
        disabled={isExporting}
        className={actionClass}
      >
        {isExporting ? "…" : "ttl"}
      </button>

      <span className="text-gray-300 dark:text-gray-700">|</span>
      <label className="flex items-center gap-1.5 text-gray-500 select-none dark:text-gray-600">
        base IRI
        <input
          type="text"
          value={baseIri}
          onChange={(e) => setBaseIri(e.target.value)}
          placeholder="http://example.org"
          aria-label="Base IRI"
          className="w-48 rounded border border-gray-300 bg-white px-2 py-0.5 text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        />
      </label>

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        aria-label="CSV importieren"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={owlInputRef}
        type="file"
        accept=".owl,.rdf,.xml"
        aria-label="OWL importieren"
        onChange={handleFileSelect}
        className="hidden"
      />

      <OwlImportDialog
        isOpen={owlDialogOpen}
        onClose={() => setOwlDialogOpen(false)}
        onImportFromFile={() => owlInputRef.current?.click()}
        onImportFromContent={importOntologyFromContent}
      />
      <RmlExportDialog
        isOpen={rmlDialogOpen}
        onClose={() => setRmlDialogOpen(false)}
      />
    </div>
  );
}
