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
    let cancelled = false;
    let currentController: AbortController | null = null;

    // Returns true once the session state has been conclusively determined
    // (logged in, logged out, or a real error) — false only for a timeout,
    // so the caller can retry with more time instead of assuming logged-out.
    const checkSession = async (timeoutMs: number): Promise<boolean> => {
      const controller = new AbortController();
      currentController = controller;
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await getLogin(controller.signal);
        if (cancelled) return true;
        if (response) {
          const [actLogin, profile] = response;
          setLoginInfo(actLogin);
          setUserInfo(profile);
        } else {
          setLoginInfo(false);
          setUserInfo(undefined);
        }
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return false;
        }
        if (!cancelled) {
          console.warn("Could not check login session:", error);
          setLoginInfo(false);
          setUserInfo(undefined);
        }
        return true;
      } finally {
        window.clearTimeout(timeout);
      }
    };

    (async () => {
      // Fast attempt first; if it merely timed out (e.g. a cold backend),
      // retry once with a much longer budget instead of forcing a logged-out
      // state and re-prompting login for what may still be a valid session.
      const settled = await checkSession(3000);
      if (!settled && !cancelled) {
        await checkSession(15000);
      }
    })();

    return () => {
      cancelled = true;
      currentController?.abort();
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
