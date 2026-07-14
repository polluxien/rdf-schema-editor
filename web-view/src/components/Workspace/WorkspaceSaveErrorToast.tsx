import { AlertTriangle, X } from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";

export default function WorkspaceSaveErrorToast() {
  const { saveError, clearSaveError } = useWorkspace();

  if (!saveError) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex items-start gap-2.5 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg dark:border-red-900/50 dark:bg-red-950/90"
    >
      <AlertTriangle
        size={16}
        className="mt-0.5 shrink-0 text-red-500 dark:text-red-400"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Workspace could not be saved
        </p>
        <p className="mt-0.5 text-xs text-red-700 break-words dark:text-red-400">
          {saveError}
        </p>
      </div>
      <button
        type="button"
        onClick={clearSaveError}
        aria-label="Dismiss message"
        className="shrink-0 text-red-400 hover:text-red-700 transition-colors dark:text-red-500 dark:hover:text-red-300"
      >
        <X size={14} />
      </button>
    </div>
  );
}
