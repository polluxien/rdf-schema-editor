import { Navigate, Outlet } from "react-router-dom";
import { useLoginContext } from "../../api/LoginInfo";
import LoadingComponent from "../UI-NoPurpose/LoadingComp";

export default function ProtectedAdminRoute() {
  const { loginInfo } = useLoginContext();

  if (loginInfo === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-950">
        <LoadingComponent label="Checking permissions..." />
      </div>
    );
  }

  if (!loginInfo || !loginInfo.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
