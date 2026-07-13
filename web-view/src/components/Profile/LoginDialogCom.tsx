import { useState } from "react";
import { postLogin } from "../../api/loginAPI";
import { useLoginContext } from "../../api/LoginInfo";
import { X } from "lucide-react";
import LoadingComponent from "../UI-NoPurpose/LoadingComp";

interface LoginDialogProps {
  open: boolean;
  onHide: () => void;
  required?: boolean;
}

export function LoginDialog({ open, onHide, required = false }: LoginDialogProps) {
  const { setLoginInfo, setUserInfo } = useLoginContext();
  const [loginData, setLoginData] = useState({ name: "", password: "" });
  const [loginFailed, setLoginFailed] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  function update(e: React.ChangeEvent<HTMLInputElement>) {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setLoginFailed("");
  }

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const [loginInfo, profile] = await postLogin(
        loginData.name,
        loginData.password,
      );
      setLoginInfo(loginInfo);
      setUserInfo(profile);

      setLoginFailed("");
      onHide();
    } catch (err) {
      setLoginFailed(String(err));
    } finally {
      setLoginData({ name: loginData.name, password: "" });
      setIsSubmitting(false);
    }
  };

  function onCancel() {
    setLoginData({ name: loginData.name, password: "" });
    onHide();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (!required && e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-6 dark:bg-gray-900 dark:border-gray-700">
        {isSubmitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
            <LoadingComponent label="Signing in..." />
          </div>
        )}
        {!required && (
          <button
            title="Sign out"
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 transition-colors dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        )}

        <form onSubmit={onLogin}>
          <h5 className="text-xl font-semibold text-gray-900 mb-6 dark:text-gray-100">
            Sign in to our platform
          </h5>

          <div className="flex flex-col gap-4 mb-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Username or Email
              </span>
              <input
                type="text"
                name="name"
                placeholder="Johnny or johnny@example.com"
                value={loginData.name}
                onChange={update}
                required
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 shadow-xs placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Password
              </span>
              <input
                type="password"
                name="password"
                placeholder="•••••••••"
                value={loginData.password}
                onChange={update}
                required
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 shadow-xs placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </label>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id="checkbox-remember"
                type="checkbox"
                className="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Remember me
              </span>
            </label>
            <a
              href="#"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Lost Password?
            </a>
          </div>

          {loginFailed && (
            <p className="text-xs text-red-400 mb-4">{loginFailed}</p>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-full text-sm px-4 py-2.5 text-center leading-5"
            >
              Login to your account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
