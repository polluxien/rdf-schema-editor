import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { useWorkspace } from "../../hooks/useWorkspace";
import { parseCsvTextToDataset } from "../../lib/csvParse";
import { parseOwlToOntology } from "../../lib/owlParse";
import type { Dataset, Ontology } from "../../types";
import type { CsvImportOptions } from "../../types/csvImport";
import CsvImportDialog from "../CsvImportDialog";
import LoadingComponent from "../UI-NoPurpose/LoadingComp";

type SupportedFileKind = "csv" | "ontology";
type ImportDestination = "current" | "new-workspace";

interface PendingConflict {
  kind: SupportedFileKind;
  file: File;
}

interface PendingCsvImport {
  file: File;
  destination: ImportDestination;
}

interface FileImportContextType {
  importFiles: (files: File[] | FileList) => void;
}

const FileImportContext = createContext<FileImportContextType | undefined>(
  undefined,
);

function getFileKind(file: File): SupportedFileKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "owl" || ext === "rdf" || ext === "xml") return "ontology";
  return null;
}

function getFileBaseName(file: File): string {
  return file.name.replace(/\.[^/.]+$/, "") || "import";
}

function readFileAsText(file: File, encoding?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsText(file, encoding);
  });
}

export function FileImportProvider({ children }: { children: ReactNode }) {
  const { ontology, dataset, setOntology, setDataset } = useAppContext();
  const { addWorkspace, updateWorkspaceData } = useWorkspace();
  const [pendingCsvImport, setPendingCsvImport] =
    useState<PendingCsvImport | null>(null);
  const [pendingConflict, setPendingConflict] =
    useState<PendingConflict | null>(null);
  const [importingLabel, setImportingLabel] = useState<string | null>(null);

  const openInNewWorkspace = useCallback(
    (file: File, data: { ontology?: Ontology; dataset?: Dataset }) => {
      const workspaceId = crypto.randomUUID();
      addWorkspace({
        id: workspaceId,
        name: getFileBaseName(file),
        description: "",
      });
      updateWorkspaceData(workspaceId, (prev) => ({
        ...prev,
        ontology: data.ontology ?? prev.ontology,
        dataset: data.dataset ?? prev.dataset,
        mappings: [],
        flowNodes: [],
        flowEdges: [],
      }));
    },
    [addWorkspace, updateWorkspaceData],
  );

  const importOntologyFile = useCallback(
    async (file: File, destination: ImportDestination) => {
      setImportingLabel("Importing ontology...");
      try {
        const text = await readFileAsText(file);
        const parsedOntology = parseOwlToOntology(text, file.name);

        if (destination === "new-workspace") {
          openInNewWorkspace(file, { ontology: parsedOntology });
        } else {
          setOntology(parsedOntology);
        }
      } finally {
        setImportingLabel(null);
      }
    },
    [openInNewWorkspace, setOntology],
  );

  const proceedWithFile = useCallback(
    (file: File, kind: SupportedFileKind, destination: ImportDestination) => {
      if (kind === "csv") {
        setPendingCsvImport({ file, destination });
        return;
      }

      void importOntologyFile(file, destination);
    },
    [importOntologyFile],
  );

  const importFiles = useCallback(
    (filesLike: File[] | FileList) => {
      const files = Array.from(filesLike);
      files.forEach((file) => {
        const kind = getFileKind(file);

        if (!kind) {
          console.warn(`Unsupported file type: ${file.name}`);
          return;
        }

        const hasExistingTarget =
          (kind === "csv" && !!dataset) || (kind === "ontology" && !!ontology);

        if (hasExistingTarget) {
          setPendingConflict({ kind, file });
          return;
        }

        proceedWithFile(file, kind, "current");
      });
    },
    [dataset, ontology, proceedWithFile],
  );

  const handleCsvImportConfirm = useCallback(
    async (options: CsvImportOptions) => {
      const pending = pendingCsvImport;
      const file = pending?.file;
      if (!file) return;

      setPendingCsvImport(null);
      setImportingLabel("Importing CSV...");
      try {
        const text = await readFileAsText(file, options.charset);
        const parsedDataset = parseCsvTextToDataset(text, file.name, options);
        if (!parsedDataset) return;

        if (pending.destination === "new-workspace") {
          openInNewWorkspace(file, { dataset: parsedDataset });
        } else {
          setDataset(parsedDataset);
        }
      } finally {
        setImportingLabel(null);
      }
    },
    [openInNewWorkspace, pendingCsvImport, setDataset],
  );

  const handleReplace = () => {
    const pending = pendingConflict;
    if (!pending) return;
    setPendingConflict(null);
    proceedWithFile(pending.file, pending.kind, "current");
  };

  const handleOpenInNewWorkspace = () => {
    const pending = pendingConflict;
    if (!pending) return;
    setPendingConflict(null);
    proceedWithFile(pending.file, pending.kind, "new-workspace");
  };

  const conflictLabel =
    pendingConflict?.kind === "ontology" ? "ontology" : "dataset";

  const value = useMemo(() => ({ importFiles }), [importFiles]);

  return (
    <FileImportContext.Provider value={value}>
      {children}
      <CsvImportDialog
        isOpen={!!pendingCsvImport}
        file={pendingCsvImport?.file ?? null}
        onClose={() => setPendingCsvImport(null)}
        onConfirm={handleCsvImportConfirm}
      />
      {pendingConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Replace existing {conflictLabel}?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              A {conflictLabel} is already loaded in this workspace. Choose how
              to import {pendingConflict.file.name}.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingConflict(null)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenInNewWorkspace}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                New workspace
              </button>
              <button
                type="button"
                onClick={handleReplace}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-500"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
      {importingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80">
          <LoadingComponent label={importingLabel} />
        </div>
      )}
    </FileImportContext.Provider>
  );
}

export function useFileImport() {
  const context = useContext(FileImportContext);
  if (!context) {
    throw new Error("useFileImport must be used within FileImportProvider");
  }
  return context;
}
