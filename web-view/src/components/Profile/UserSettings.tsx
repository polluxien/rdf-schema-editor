import { Info } from "lucide-react";
import type { UserType } from "../../../../sharedTypes/userTypes";

interface UserSettingsProps {
  user: UserType | null;
  loading: boolean;
}

function UserSettings({ user, loading }: UserSettingsProps) {
  return (
    <>
      {loading ? (
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
              <p className="text-gray-700 dark:text-gray-300">{user.gender}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Account created</p>
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
    </>
  );
}

export default UserSettings;
