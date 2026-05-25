import { useCallback } from "react";
import { Panel } from "@xyflow/react";
import { useFileImport } from "../FileImport/FileImportContext";

interface DragAndDropZoneProps {
  showDragAndDropZone: boolean;
}

function DragAndDropZone({ showDragAndDropZone }: DragAndDropZoneProps) {
  const { importFiles } = useFileImport();

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      importFiles(e.dataTransfer.files);
    },
    [importFiles],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) importFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <Panel position="top-center">
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="m-12 p-40 rounded-lg text-center border-2 border-dashed border-blue-500/60 bg-blue-500/5 backdrop-blur-sm hover:border-blue-400/80 hover:bg-blue-500/10 transition-all duration-200 min-w-200"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <svg
              className="w-10 h-10 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Start your project
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            No ontology or dataset loaded yet. <br />
            Drag a file here or select one below.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <label
            htmlFor="dropzone-file"
            className="
            flex items-center gap-2 px-6 py-2.5 rounded-lg
            bg-blue-600 text-white text-sm font-medium
            shadow-md hover:bg-blue-700 hover:shadow-lg
            hover:-translate-y-0.5 transition-all duration-200
            cursor-pointer mb-2"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById("dropzone-file")?.click();
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Select File
          </label>

          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>Supported formats:</p>
            <div className="flex gap-2 justify-center">
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                OWL
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                CSV
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                RDF
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                Turtel
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                JSON-LD
              </span>
            </div>
          </div>
        </div>

        <input
          id="dropzone-file"
          type="file"
          className="hidden"
          accept=".csv,.owl,.rdf,.xml"
          onChange={handleInputChange}
          multiple={showDragAndDropZone}
        />
      </div>
    </Panel>
  );
}

export default DragAndDropZone;
