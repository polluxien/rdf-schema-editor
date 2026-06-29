import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Key, Sun, Moon, Info, Palette } from "lucide-react";
import { ApiKeySettings } from "../components/Profile/ApiKeySettings";
import { useLoginContext } from "../api/LoginInfo";
import { useCurrentUser } from "../hooks/useCurrentUser";

type Section = "account" | "api-key" | "appearance";
type Theme = "light" | "dark";

const COLOR_MODE_KEY = "colorMode";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(COLOR_MODE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(COLOR_MODE_KEY, t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t;
  }

  return { theme, setTheme };
}

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "account", label: "Account", icon: <User size={15} /> },
  { id: "api-key", label: "API Key", icon: <Key size={15} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("account");
  const { loginInfo } = useLoginContext();
  const { user, loading: userLoading } = useCurrentUser();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Editor
        </Link>
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
        <h3 className="text-lg font-semibold">Settings</h3>
      </header>

      <div className="max-w-4xl mx-auto p-6 flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    section === item.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content panel */}
        <main className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          {section === "account" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold">Account</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Your current session.
                </p>
              </div>
              <hr className="border-gray-100 dark:border-gray-800" />
              {!loginInfo ? (
                <p className="text-sm text-gray-500">Not logged in.</p>
              ) : userLoading ? (
                <p className="text-sm text-gray-400">Loading profile...</p>
              ) : user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-semibold select-none">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.isAdmin
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {user.isAdmin ? "Admin" : "User"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Gender</p>
                      <p className="text-gray-700 dark:text-gray-300">
                        {user.gender}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">
                        Account created
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-US")
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    Profile details can be edited in user management.
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Failed to load profile.</p>
              )}
            </div>
          )}

          {section === "api-key" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold">API Key</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Local BioPortal API key for ontology imports.
                </p>
              </div>
              <hr className="border-gray-100 dark:border-gray-800" />
              <ApiKeySettings />
            </div>
          )}

          {section === "appearance" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold">Appearance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Customize the application design.
                </p>
              </div>
              <hr className="border-gray-100 dark:border-gray-800" />
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color Scheme
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      theme === "light"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Sun size={15} />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      theme === "dark"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Moon size={15} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
