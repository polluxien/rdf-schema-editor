import { Info, Check, AlertCircle, ShieldCheck, User as UserIcon } from "lucide-react";
import type { Gender, UserType } from "../../../../sharedTypes/userTypes";
import { useEffect, useState } from "react";
import { updateUser } from "../../api/userAPI";

interface UserSettingsProps {
  user: UserType | null;
  loading: boolean;
}

const GENDER_OPTIONS: Gender[] = [
  "Male",
  "Female",
  "Divers",
  "Prefer not to say",
];

function UserSettings({ user, loading }: UserSettingsProps) {
  const [gender, setGender] = useState<Gender | "">("");
  const [genderSaving, setGenderSaving] = useState(false);
  const [genderMessage, setGenderMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setGender(user?.gender ?? "");
  }, [user]);

  async function saveGender() {
    if (!user || !gender || gender === user.gender) return;
    setGenderSaving(true);
    setGenderMessage(null);
    try {
      await updateUser(user._id, { gender });
      setGenderMessage({ type: "success", text: "Gender updated." });
    } catch {
      setGenderMessage({ type: "error", text: "Failed to update gender." });
    } finally {
      setGenderSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (password.length < 3) {
      setPasswordMessage({
        type: "error",
        text: "Password must be at least 3 characters.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await updateUser(user._id, { password });
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Password updated." });
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Failed to update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
          Loading profile...
        </div>
      ) : user ? (
        <div className="space-y-5">
          {/* Profile header */}
          <div className="flex items-center gap-4 pb-1">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold select-none shadow-sm ring-2 ring-white dark:ring-gray-900">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.isAdmin
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {user.isAdmin ? (
                  <ShieldCheck size={11} />
                ) : (
                  <UserIcon size={11} />
                )}
                {user.isAdmin ? "Admin" : "User"}
              </span>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 bg-blue-50/70 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl px-4 py-3 text-sm text-blue-700/90 dark:text-blue-300/90">
            <Info size={14} className="mt-0.5 shrink-0" />
            Name or Email can only be edited by an Admin in user management.
          </div>

          {/* Gender */}
          <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 space-y-2.5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Gender
            </p>
            <div className="flex items-center gap-2">
              <select
                title="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {gender != user.gender && (
              <button
                type="button"
                onClick={saveGender}
                disabled={genderSaving || !gender || gender === user.gender}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {genderSaving ? "Saving..." : "Save"}
              </button>
              )}
            </div>
            {genderMessage && (
              <p
                className={`flex items-center gap-1.5 text-xs ${
                  genderMessage.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {genderMessage.type === "success" ? (
                  <Check size={12} />
                ) : (
                  <AlertCircle size={12} />
                )}
                {genderMessage.text}
              </p>
            )}
          </div>

          {/* Password */}
          <form
            onSubmit={savePassword}
            className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 space-y-2.5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Change Password
            </p>
            <input
              title="New password"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
            />
            <input
              title="Confirm new password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
            />
            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="submit"
                disabled={passwordSaving || !password || !confirmPassword}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {passwordSaving ? "Saving..." : "Update Password"}
              </button>
              {passwordMessage && (
                <p
                  className={`flex items-center gap-1.5 text-xs ${
                    passwordMessage.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {passwordMessage.type === "success" ? (
                    <Check size={12} />
                  ) : (
                    <AlertCircle size={12} />
                  )}
                  {passwordMessage.text}
                </p>
              )}
            </div>
          </form>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Failed to load profile.</p>
      )}
    </>
  );
}

export default UserSettings;