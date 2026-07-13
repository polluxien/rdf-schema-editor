import { useState, useRef, useEffect } from "react";
import { LoginDialog } from "./LoginDialogCom";
import { deleteLogin } from "../../api/loginAPI";
import { useLoginContext } from "../../api/LoginInfo";
import { ApiKeySettings } from "./ApiKeySettings";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";

function ProfileAvatarButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const { loginInfo, setLoginInfo } = useLoginContext();
  const { user } = useCurrentUser();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  const initials = user ? user.name.slice(0, 2).toUpperCase() : "?";

  // Führe Logout (mittels api.ts/deleteLogin) durch
  const doLogout = async () => {
    await deleteLogin();
    setLoginInfo(false);
    setShowLoginDialog(false);
  };

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const deligateClick = () => {
    if (loginInfo) {
      setOpen((v) => !v);
    } else {
      setShowLoginDialog(true);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={
          loginInfo ? `Eingeloggt als ${user?.name ?? "..."}` : "Einloggen"
        }
        onClick={deligateClick}
        className="w-8 h-8 rounded-full cursor-pointer bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors dark:bg-gray-400 dark:hover:bg-gray-600"
      >
        <span className="font-medium text-sm text-gray-200">
          {loginInfo ? initials : "?"}
        </span>
      </button>
      {showLoginDialog && !loginInfo && (
        <LoginDialog open={true} onHide={() => setShowLoginDialog(false)} />
      )}

      {open && loginInfo && (
        <div className="absolute right-0 mt-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-44 dark:bg-gray-900 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 text-sm dark:border-gray-700">
            <div className="font-medium text-gray-900 dark:text-gray-200">
              {user?.name ?? "..."}
            </div>
            <div className="truncate text-gray-500 dark:text-gray-400">
              {user?.email ?? ""}
            </div>
          </div>
          <ul className="p-2 text-sm font-medium">
            {loginInfo && loginInfo.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  navigate(`/admin/users`);
                }}
                className="block w-full text-left p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-950 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                navigate(`/settings`);
              }}
              className="block w-full text-left p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-950 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              Settings
            </button>
            <li>
              <a
                href="#"
                className="block w-full p-2 text-red-500 hover:bg-gray-100 rounded-md transition-colors dark:text-red-400 dark:hover:bg-gray-800"
                onClick={doLogout}
              >
                Sign out
              </a>
            </li>
          </ul>
        </div>
      )}

      {showApiKeySettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowApiKeySettings(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-6 dark:bg-gray-900 dark:border-gray-700">
            <ApiKeySettings onClose={() => setShowApiKeySettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileAvatarButton;
