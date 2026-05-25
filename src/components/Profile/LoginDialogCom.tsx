import { useState } from "react";
import { postLogin } from "../../backend/api";
import { useLoginContext } from "../../backend/LoginInfo";
import { X } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onHide: () => void;
}

export function LoginDialog({ open, onHide }: LoginDialogProps) {
  const { setLoginInfo } = useLoginContext();
  const [loginData, setLoginData] = useState({ name: "", password: "" });
  const [loginFailed, setLoginFailed] = useState("");

  if (!open) return null;

  function update(e: React.ChangeEvent<HTMLInputElement>) {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setLoginFailed("");
  }

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginInfo = await postLogin(loginData.name, loginData.password);
      setLoginInfo(loginInfo);
      setLoginFailed("");
      onHide();
    } catch (err) {
      setLoginFailed(String(err));
    } finally {
      setLoginData({ name: loginData.name, password: "" });
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
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-base shadow-lg p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 transition-colors"
        >
          <X size={16} />
        </button>

        <form onSubmit={onLogin}>
          <h5 className="text-xl font-semibold text-heading mb-6">
            Sign in to our platform
          </h5>

          <div className="flex flex-col gap-4 mb-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-heading">Username</span>
              <input
                type="text"
                name="name"
                placeholder="Johnny"
                value={loginData.name}
                onChange={update}
                required
                className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-heading">Password</span>
              <input
                type="password"
                name="password"
                placeholder="•••••••••"
                value={loginData.password}
                onChange={update}
                required
                className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
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
              <span className="text-sm font-medium text-heading">
                Remember me
              </span>
            </label>
            <a
              href="#"
              className="text-sm font-medium text-fg-brand hover:underline"
            >
              Lost Password?
            </a>
          </div>

          {loginFailed && (
            <p className="text-xs text-red-400 mb-4">{loginFailed}</p>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <button
              type="submit"
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
