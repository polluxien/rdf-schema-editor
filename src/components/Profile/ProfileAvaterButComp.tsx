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
        className="w-8 h-8 rounded-full cursor-pointer bg-gray-400 hover:bg-gray-600 flex items-center justify-center transition-colors"
      >
        <span className="font-medium text-sm text-gray-200">
          {loginInfo ? "MX" : "AN"}
        </span>
      </button>
      {showLoginDialog && !loginInfo && (
        <LoginDialog open={true} onHide={() => setShowLoginDialog(false)} />
      )}

      {open && loginInfo && (
        <div className="absolute right-0 mt-2 z-10 bg-gray-900 border border-gray-700 rounded-lg shadow-lg w-44">
          <div className="px-4 py-3 border-b border-gray-700 text-sm">
            <div className="font-medium text-gray-200">Max Sy</div>
            <div className="truncate text-gray-400">mx@sy.com</div>
          </div>
          <ul className="p-2 text-sm font-medium">
            {["Dashboard", "Settings", "Earnings"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="block w-full p-2 text-gray-300 hover:bg-gray-800 hover:text-gray-100 rounded-md transition-colors"
                >
                  {item}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#"
                className="block w-full p-2 text-red-400 hover:bg-gray-800 rounded-md transition-colors"
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
