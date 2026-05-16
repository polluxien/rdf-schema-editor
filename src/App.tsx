import DatasetTable from "./components/DatasetTable";
import MenuBar from "./components/MenuBar";
import OntologyCanvas from "./components/OntologyCanvas";
import { AppProvider } from "./context/AppContext";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/Fallback/ErrorFallback";

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AppProvider>
        <div className="flex flex-col h-screen bg-gray-950 text-white">
          <MenuBar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <OntologyCanvas />
            <DatasetTable />
          </main>
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
