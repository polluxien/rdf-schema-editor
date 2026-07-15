import { useRef, useState } from "react";
import { Check, Cloud, Loader2, Trash2 } from "lucide-react";
import { useFileImport } from "../FileImport/FileImportContext";
import { useAppContext } from "../../hooks/useAppContext";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useLoginContext } from "../../api/LoginInfo";
import OwlImportDialog from "../OwlImportDialog";
import RmlExportDialog from "../RmlExportDialog";
import RdfExportDialog from "../RdfExportDialog/RdfExportDialog";
import WorkspaceSaveErrorToast from "./WorkspaceSaveErrorToast";

export default function WorkspaceImportExport() {
  const { importFiles, importOntologyFromContent } = useFileImport();
  const { ontology, dataset, baseIri, setBaseIri } = useAppContext();
  const { loginInfo } = useLoginContext();
  const {
    workspaces,
    updateWorkspaceData,
    activeWorkspaceId,
    activeWorkspace,
    saveWorkspace,
    savingWorkspaceId,
    deleteWorkspace,
    deletingWorkspaceId,
    deleteError,
    clearDeleteError,
  } = useWorkspace();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const owlInputRef = useRef<HTMLInputElement>(null);
  const rmlInputRef = useRef<HTMLInputElement>(null);
  const [owlDialogOpen, setOwlDialogOpen] = useState(false);
  const [rmlDialogOpen, setRmlDialogOpen] = useState(false);
  const [rdfDialogOpen, setRdfDialogOpen] = useState(false);
  const [importingRml, setImportingRml] = useState(false);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const isSaving = savingWorkspaceId === activeWorkspaceId;
  const isDeleting = deletingWorkspaceId === activeWorkspaceId;
  const canDelete = workspaces.length > 1 && !!activeWorkspaceId;
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

  const handleConfirmDelete = async () => {
    if (!activeWorkspaceId) return;
    try {
      await deleteWorkspace(activeWorkspaceId);
      setConfirmDeleteOpen(false);
    } catch {
      // deleteError from context already reflects the failure; keep dialog open
    }
  };

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
      <button
        type="button"
        onClick={() => setRdfDialogOpen(true)}
        className={actionClass}
      >
        rdf
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

      {isLoggedIn && (
        <>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !activeWorkspaceId}
            title={
              activeWorkspace?.savedAt
                ? `Last saved: ${new Date(activeWorkspace.savedAt).toLocaleString()}`
                : "Save the current workspace to your account"
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
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={!canDelete}
            title={
              canDelete
                ? "Delete workspace"
                : "The last workspace cannot be deleted"
            }
            className={`flex items-center gap-1 ${actionClass} hover:text-red-600 dark:hover:text-red-400`}
          >
            <Trash2 size={12} />
            delete
          </button>
        </>
      )}

      <WorkspaceSaveErrorToast />

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Delete workspace "{activeWorkspace?.name}"?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Are you sure to delete this workspace? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  clearDeleteError();
                }}
                className="rounded px-3 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={12} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        aria-label="Import CSV"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={owlInputRef}
        type="file"
        accept=".owl,.rdf,.xml"
        aria-label="Import OWL"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={rmlInputRef}
        type="file"
        accept=".ttl,.rml,.rml.ttl"
        aria-label="Import RML"
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
      <RdfExportDialog
        isOpen={rdfDialogOpen}
        onClose={() => setRdfDialogOpen(false)}
      />
    </div>
  );
}
