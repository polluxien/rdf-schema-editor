import { Route, Routes, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/Fallback/ErrorFallback";
import { useEffect, useState } from "react";
import { getLogin } from "./api/loginAPI";
import { LoginContext } from "./api/LoginInfo";
import LoadingComponent from "./components/UI-NoPurpose/LoadingComp";
import type { LoginType } from "../../sharedTypes/loginTypes";
import EditorPage from "./pages/EditorPage";
import SettingsPage from "./pages/SettingsPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ProtectedAdminRoute from "./components/routing/ProtectedAdminRoute";

function AppController() {
  const [loginInfo, setLoginInfo] = useState<LoginType | false | undefined>(
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
    <LoginContext.Provider value={{ loginInfo, setLoginInfo }}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {loginInfo === undefined && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80">
            <LoadingComponent label="Checking session..." />
          </div>
        )}
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
    </LoginContext.Provider>
  );
}

export default AppController;
