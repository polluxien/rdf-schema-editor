import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

function ErrorFallback({ error }: { error: Error }) {
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${error.name}: ${error.message}\n\n${error.stack ?? ""}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-center p-8">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-lg w-full">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
          Etwas ist schiefgelaufen
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
            Fehlertyp
          </p>
          <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
            {error.name}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
            Meldung
          </p>
          <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
            {error.message}
          </p>
        </div>

        {error.stack && (
          <>
            <button
              type="button"
              onClick={() => setShowStack((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 transition-colors"
            >
              {showStack ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
              Stack trace {showStack ? "verbergen" : "anzeigen"}
            </button>
            {showStack && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <pre className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                  {error.stack}
                </pre>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} />
            Seite neu laden
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;
