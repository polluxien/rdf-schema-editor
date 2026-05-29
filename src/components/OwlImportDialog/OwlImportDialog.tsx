import { useState, useCallback } from "react";
import { X, FileCode, Globe, Search, Loader2 } from "lucide-react";
import {
  listAvailableOwlFiles,
  downloadOwlFile,
  type OwlApiConfig,
} from "../../backend/owlApi";

const BIOPORTAL_API_URL = "https://data.bioontology.org";

type ImportMode = "file" | "api";

interface OwlImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFromFile: () => void;
  onImportFromContent: (content: string, name: string) => void;
}

export default function OwlImportDialog({
  isOpen,
  onClose,
  onImportFromFile,
  onImportFromContent,
}: OwlImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>("file");
  const [apiKey, setApiKey] = useState("");
  const [ontologies, setOntologies] = useState<[string, string][]>([]);
  const [selectedOntology, setSelectedOntology] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setApiKey("");
    setOntologies([]);
    setSelectedOntology(null);
    setSearchQuery("");
    setError(null);
    setIsLoadingList(false);
    setIsDownloading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFileClick = useCallback(() => {
    handleClose();
    onImportFromFile();
  }, [handleClose, onImportFromFile]);

  const handleFetchOntologies = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setError(null);
    setIsLoadingList(true);
    setOntologies([]);
    setSelectedOntology(null);

    try {
      const config: OwlApiConfig = {
        baseUrl: BIOPORTAL_API_URL,
        apiKey: apiKey.trim(),
      };
      const result = await listAvailableOwlFiles(config);
      setOntologies(result);
      if (result.length === 0) {
        setError("No ontologies found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ontologies");
    } finally {
      setIsLoadingList(false);
    }
  }, [apiKey]);

  const handleImportFromApi = useCallback(async () => {
    if (!selectedOntology) {
      setError("Please select an ontology");
      return;
    }

    setError(null);
    setIsDownloading(true);

    try {
      const config: OwlApiConfig = {
        baseUrl: BIOPORTAL_API_URL,
        apiKey: apiKey.trim(),
      };
      const result = await downloadOwlFile(selectedOntology, config);
      
      const name = result.filename ?? `${selectedOntology}.owl`;
      onImportFromContent(result.content, name);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download ontology");
    } finally {
      setIsDownloading(false);
    }
  }, [selectedOntology, apiKey, onImportFromContent, handleClose]);

  const filteredOntologies = ontologies.filter(([name, acronym]) => {
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      acronym.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-2xl w-full max-w-lg mx-4 dark:bg-gray-800 dark:border-gray-600 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileCode size={20} className="text-orange-400" />
            <h2 className="font-semibold">Import OWL Ontology</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => setMode("file")}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "file"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <FileCode size={16} className="inline-block mr-2 -mt-0.5" />
            From File
          </button>
          <button
            onClick={() => setMode("api")}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "api"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Globe size={16} className="inline-block mr-2 -mt-0.5" />
            From BioPortal
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {mode === "file" ? (
            <div className="text-center py-8">
              <FileCode size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Select an OWL, RDF, or XML file from your computer
              </p>
              <button
                onClick={handleFileClick}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                Choose File
              </button>
            </div>
          ) : (
            <>
              {/* API Info */}
              <div className="bg-gray-100 rounded px-3 py-2 text-sm dark:bg-gray-900">
                <span className="text-gray-500 dark:text-gray-400">Source:</span>{" "}
                <span className="text-gray-900 dark:text-white">BioPortal</span>
                <span className="text-gray-400 ml-2 text-xs">
                  (data.bioontology.org)
                </span>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-sm text-gray-700 mb-1 dark:text-gray-300">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your BioPortal API key"
                    className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                  />
                  <button
                    onClick={handleFetchOntologies}
                    disabled={isLoadingList || !apiKey.trim()}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoadingList ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Fetch"
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Get your API key from{" "}
                  <a
                    href="https://bioportal.bioontology.org/account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    bioportal.bioontology.org/account
                  </a>
                </p>
              </div>

              {/* Ontology List */}
              {ontologies.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1 dark:text-gray-300">
                    Select Ontology ({ontologies.length} available)
                  </label>
                  
                  {/* Search */}
                  <div className="relative mb-2">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ontologies..."
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 pl-9 text-sm text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>

                  {/* List */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded max-h-48 overflow-y-auto">
                    {filteredOntologies.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No matching ontologies
                      </p>
                    ) : (
                      filteredOntologies.map(([name, acronym]) => (
                        <button
                          key={acronym}
                          onClick={() => setSelectedOntology(acronym)}
                          className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                            selectedOntology === acronym
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "hover:bg-gray-50 text-gray-900 dark:hover:bg-gray-700/50 dark:text-gray-200"
                          }`}
                        >
                          <span className="font-medium">{acronym}</span>
                          <span className="text-gray-400 ml-2">— {name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-950 transition-colors dark:text-gray-300 dark:hover:text-white"
          >
            Cancel
          </button>
          {mode === "api" && ontologies.length > 0 && (
            <button
              onClick={handleImportFromApi}
              disabled={!selectedOntology || isDownloading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                "Import"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
