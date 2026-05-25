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

function AppController() {
  const [loginInfo, setLoginInfo] = useState<LoginResource | false | undefined>(
    undefined,
  );

  useEffect(() => {
    const f = async () => {
      const actLogin = await getLogin();
      setLoginInfo(actLogin);
    };
    f();
  }, []);

  return (
    <div>
      <LoginContext.Provider value={{ loginInfo, setLoginInfo }}>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <WorkspaceProvider>
            <AppProvider>
              <div className="flex flex-col h-screen text-white">
                <WorkspaceBar />
                <OntologyCanvas />
                <DatasetTable />
              </div>
            </AppProvider>
          </WorkspaceProvider>
        </ErrorBoundary>
        {loginInfo && <>{/* Just for login users to see*/}</>}
      </LoginContext.Provider>
    </div>
  );
}

export default AppController;
