import { useState, useRef, useEffect } from "react";
import { LoginDialog } from "./LoginDialogCom";
import { deleteLogin } from "../../backend/api";
import { useLoginContext } from "../../backend/LoginInfo";

function ProfileAvatarButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { loginInfo, setLoginInfo } = useLoginContext();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Führe Logout (mittels api.ts/deleteLogin) durch
  const doLogout = async () => {
    await deleteLogin();
    setLoginInfo(false);
    setShowLoginDialog(false);
  };

  useEffect(() => {}, [loginInfo]);

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
        title={loginInfo ? "logged in as JL" : "log in"}
        onClick={deligateClick}
        className="w-8 h-8 rounded-full cursor-pointer bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors dark:bg-gray-400 dark:hover:bg-gray-600"
      >
        <span className="font-medium text-sm text-gray-200">
          {loginInfo ? "MX" : "AN"}
        </span>
      </button>
      {showLoginDialog && !loginInfo && (
        <LoginDialog open={true} onHide={() => setShowLoginDialog(false)} />
      )}

      {open && loginInfo && (
        <div className="absolute right-0 mt-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-44 dark:bg-gray-900 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 text-sm dark:border-gray-700">
            <div className="font-medium text-gray-900 dark:text-gray-200">Max Sy</div>
            <div className="truncate text-gray-500 dark:text-gray-400">mx@sy.com</div>
          </div>
          <ul className="p-2 text-sm font-medium">
            {["Dashboard", "Settings", "Earnings"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="block w-full p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-950 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  {item}
                </a>
              </li>
            ))}
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
    </div>
  );
}

export default ProfileAvatarButton;
