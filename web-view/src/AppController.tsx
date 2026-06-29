import { Route, Routes, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/Fallback/ErrorFallback";
import { useEffect, useState } from "react";
import { getLogin } from "./api/loginAPI";
import { LoginContext } from "./api/LoginInfo";
import LoadingComponent from "./components/UI-NoPurpose/LoadingComp";
import type { LoginType } from "../../sharedTypes/loginTypes";
import type { UserType } from "../../sharedTypes/userTypes";
import EditorPage from "./pages/EditorPage";
import SettingsPage from "./pages/SettingsPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ProtectedAdminRoute from "./components/routing/ProtectedAdminRoute";
import HeaderComponent from "./components/HeaderComponent";
import { LoginDialog } from "./components/Profile/LoginDialogCom";
import { WorkspaceProvider } from "./components/Workspace/WorkspaceContext";
import { AppProvider } from "./context/AppContext";

function AppController() {
  const [loginInfo, setLoginInfo] = useState<LoginType | false | undefined>(
    undefined,
  );
  const [userInfo, setUserInfo] = useState<UserType | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);

    const f = async () => {
      try {
        let actLogin, profile;

        const response = await getLogin(controller.signal);
        if (response) {
          [actLogin, profile] = response;
        }
        setLoginInfo(actLogin ?? false);
        setUserInfo(profile);
      } catch (error) {
        console.warn("Could not check login session:", error);
        setLoginInfo(false);
        setUserInfo(undefined);
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
    <LoginContext.Provider
      value={{ loginInfo, setLoginInfo, userInfo, setUserInfo }}
    >
      <WorkspaceProvider>
      <AppProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {loginInfo === undefined && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80">
            <LoadingComponent label="Checking session..." />
          </div>
        )}
        {loginInfo === false && (
          <LoginDialog open={true} onHide={() => {}} required={true} />
        )}
        <HeaderComponent></HeaderComponent>

        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin-only – ProtectedAdminRoute prüft isAdmin, sonst Redirect zu "/" */}
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      </AppProvider>
      </WorkspaceProvider>
    </LoginContext.Provider>
  );
}
export default AppController;
