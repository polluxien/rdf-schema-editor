import DatasetTable from "./components/DatasetTable";
import OntologyCanvas from "./components/OntologyCanvas";
import { AppProvider } from "./context/AppContext";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/Fallback/ErrorFallback";
import { WorkspaceProvider } from "./components/Workspace/WorkspaceContext";
import WorkspaceBar from "./components/Workspace/WorkspaceBar";
import { useEffect, useState } from "react";
import type { LoginResource } from "./types/login";
import { getLogin } from "./backend/api";
import { LoginContext } from "./backend/LoginInfo";
import LoadingComponent from "./components/UI-NoPurpose/LoadingComp";
import { FileImportProvider } from "./components/FileImport/FileImportContext";

function AppController() {
  const [loginInfo, setLoginInfo] = useState<LoginResource | false | undefined>(
    undefined,
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);

    const f = async () => {
      try {
        const actLogin = await getLogin(controller.signal);
        setLoginInfo(actLogin);
      } catch (error) {
        console.warn("Could not check login session:", error);
        setLoginInfo(false);
      } finally {
        window.clearTimeout(timeout);
      }
    };
    f();

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <div>
      <LoginContext.Provider value={{ loginInfo, setLoginInfo }}>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <WorkspaceProvider>
            <AppProvider>
              <FileImportProvider>
                <div className="flex flex-col h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
                  {loginInfo === undefined && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80">
                      <LoadingComponent label="Checking session..." />
                    </div>
                  )}
                  <WorkspaceBar />
                  <OntologyCanvas />
                  <DatasetTable />
                </div>
              </FileImportProvider>
            </AppProvider>
          </WorkspaceProvider>
        </ErrorBoundary>
        {loginInfo && <>{/* Just for login users to see*/}</>}
      </LoginContext.Provider>
    </div>
  );
}

export default AppController;
