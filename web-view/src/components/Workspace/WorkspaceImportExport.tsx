import { useRef, useState } from "react";
import { Check, Cloud, Loader2 } from "lucide-react";
import { useFileImport } from "../FileImport/FileImportContext";
<<<<<<< HEAD
import { useAppContext } from "../../hooks/useAppContext";
import { useWorkspace } from "../../hooks/useWorkspace";
import OwlImportDialog from "../OwlImportDialog";
import RmlExportDialog from "../RmlExportDialog";


export default function WorkspaceImportExport() {
  const { importFiles, importOntologyFromContent } = useFileImport();
  const { ontology, dataset, baseIri, setBaseIri } = useAppContext();
  const { updateWorkspaceData, activeWorkspaceId } = useWorkspace();
=======
import { useWorkspace } from "../../hooks/useWorkspace";
import { useLoginContext } from "../../api/LoginInfo";
import OwlImportDialog from "../OwlImportDialog";
import WorkspaceSaveErrorToast from "./WorkspaceSaveErrorToast";

export default function WorkspaceImportExport() {
  const { importFiles, importOntologyFromContent } = useFileImport();
  const { loginInfo } = useLoginContext();
  const { activeWorkspaceId, activeWorkspace, saveWorkspace, savingWorkspaceId } =
    useWorkspace();
>>>>>>> 8342477 (save limit 100mb, fix save workspace rough, add unit tests, fix user tests, add shared worspace types, new component for user settings, add new workspace logic, add local cache for reloading page)
  const csvInputRef = useRef<HTMLInputElement>(null);
  const owlInputRef = useRef<HTMLInputElement>(null);
  const rmlInputRef = useRef<HTMLInputElement>(null);
  const [owlDialogOpen, setOwlDialogOpen] = useState(false);
<<<<<<< HEAD
  const [rmlDialogOpen, setRmlDialogOpen] = useState(false);
  const [importingRml, setImportingRml] = useState(false);
=======
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const isSaving = savingWorkspaceId === activeWorkspaceId;
  const isLoggedIn = Boolean(loginInfo);

  const handleSave = async () => {
    if (!activeWorkspaceId) return;
    try {
      await saveWorkspace(activeWorkspaceId);
      setJustSavedId(activeWorkspaceId);
      setTimeout(() => setJustSavedId(null), 2000);
    } catch {
      // saveError from context already reflects the failure
    }
  };
>>>>>>> 8342477 (save limit 100mb, fix save workspace rough, add unit tests, fix user tests, add shared worspace types, new component for user settings, add new workspace logic, add local cache for reloading page)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importFiles([file]);
    event.target.value = "";
  };

  const handleRmlSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeWorkspaceId) return;
    setImportingRml(true);
    try {
      const text = await file.text();
      // Lazy-loaded: keeps the RML parser (n3) out of the initial bundle.
      const { importRmlToCanvas } = await import("../../lib/importRml");
      // Attach onto the currently loaded ontology + dataset (merge mode) so
      // labels / hierarchy / sample values survive; falls back to a
      // self-contained import when nothing is loaded.
      const { data, warnings } = importRmlToCanvas(text, { ontology, dataset });
      updateWorkspaceData(activeWorkspaceId, (prev) => ({ ...prev, ...data }));
      if (warnings.length > 0) {
        window.alert(`RML imported with ${warnings.length} warning(s):\n\n` + warnings.join("\n"));
      }
    } catch (error) {
      console.error("RML import failed:", error);
      window.alert("RML import failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setImportingRml(false);
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
      <button
        type="button"
        onClick={() => rmlInputRef.current?.click()}
        disabled={importingRml}
        className={actionClass}
      >
        {importingRml ? "…" : "rml"}
      </button>
      <span className="text-gray-300 dark:text-gray-700">|</span>
      <span className="text-gray-500 select-none dark:text-gray-600">export</span>
      <button
        type="button"
        onClick={() => setRmlDialogOpen(true)}
        className={actionClass}
      >
        (yarr)rml
      </button>

<<<<<<< HEAD
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
=======
      {isLoggedIn && (
        <>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !activeWorkspaceId}
            title={
              activeWorkspace?.savedAt
                ? `Zuletzt gespeichert: ${new Date(activeWorkspace.savedAt).toLocaleString("de-DE")}`
                : "Aktuellen Workspace im Account speichern"
            }
            className={`flex items-center gap-1 ${actionClass}`}
          >
            {isSaving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : justSavedId === activeWorkspaceId ? (
              <Check size={12} />
            ) : (
              <Cloud size={12} />
            )}
            save
          </button>
        </>
      )}

      <WorkspaceSaveErrorToast />
>>>>>>> 8342477 (save limit 100mb, fix save workspace rough, add unit tests, fix user tests, add shared worspace types, new component for user settings, add new workspace logic, add local cache for reloading page)

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
      <input
        ref={rmlInputRef}
        type="file"
        accept=".ttl,.rml,.rml.ttl"
        aria-label="RML importieren"
        onChange={handleRmlSelect}
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
