import DatasetTable from "../components/DatasetTable";
import OntologyCanvas from "../components/OntologyCanvas";
import { FileImportProvider } from "../components/FileImport/FileImportContext";
import WorkspaceBar from "../components/Workspace/WorkspaceBar";

export default function EditorPage() {
  return (
    <FileImportProvider>
      <div className="flex flex-col h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <WorkspaceBar />
        <OntologyCanvas />
        <DatasetTable />
      </div>
    </FileImportProvider>
  );
}
