import DatasetTable from "./components/DatasetTable";
import OntologyCanvas from "./components/OntologyCanvas";
import { AppProvider } from "./context/AppContext";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/Fallback/ErrorFallback";
import { WorkspaceProvider } from "./components/Workspace/WorkspaceContext";
import WorkspaceBar from "./components/Workspace/WorkspaceBar";

function AppController() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <WorkspaceProvider>
        <AppProvider>
          <div className="flex flex-col h-screen bg-gray-950 text-white">
            <WorkspaceBar />
            <main className="flex-1 flex flex-col overflow-hidden">
              <OntologyCanvas />
              <DatasetTable />
            </main>
          </div>
        </AppProvider>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}

export default AppController;
