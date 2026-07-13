import React, { useState } from "react";
import { UserPlus, ShieldCheck, CheckCircle2, X } from "lucide-react";
import type { UserType } from "../../../../sharedTypes/userTypes";
import { createUser } from "../../api/userAPI";

// Default password for newly created users: initials of their name + "123",
// e.g. "Max Mustermann" -> "MM123". Shown to the admin once so it can be
// passed on; the user is expected to change it after their first login.
function generateDefaultPassword(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return `${initials || "USER"}123`;
}

interface AddUserDialogProps {
  onClose: () => void;
  onCreated: (user: UserType) => void;
}

function AddUserDialog({ onClose, onCreated }: AddUserDialogProps) {
  const [form, setForm] = useState({ name: "", email: "", isAdmin: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const password = generateDefaultPassword(form.name);
      const created = await createUser({
        name: form.name,
        email: form.email,
        password,
        isAdmin: form.isAdmin,
      });
      onCreated(created);
      setCreatedPassword(password);
    } catch {
      setError("Failed to add user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (!submitting && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-6 dark:bg-gray-900 dark:border-gray-700">
        {createdPassword ? (
          <>
            <div className="flex flex-col items-center text-center gap-2 mb-5">
              <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckCircle2 size={22} />
              </div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                User created
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Default password for <strong>{form.name}</strong>
              </p>
            </div>

            <code className="block w-full mb-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-center font-mono text-lg tracking-widest text-gray-900 dark:text-gray-100">
              {createdPassword}
            </code>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-6 text-center">
              Share this password with the user. It must be changed after the
              first login.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-full text-sm px-4 py-2.5 text-center leading-5"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <button
              type="button"
              title="Cancel"
              onClick={onClose}
              disabled={submitting}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 transition-colors dark:hover:text-gray-200 disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <UserPlus size={17} />
              </div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add User
              </h5>
            </div>

            <div className="flex flex-col gap-4 mb-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Name
                </span>
                <input
                  type="text"
                  name="name"
                  placeholder="Johnny"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 shadow-xs placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Email
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="johnny@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 shadow-xs placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                />
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="isAdmin"
                  checked={form.isAdmin}
                  onChange={handleChange}
                  className="w-4 h-4 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
                />
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                  <ShieldCheck size={14} className="text-gray-400" />
                  Grant admin privileges
                </span>
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-4">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 text-sm font-medium rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-full text-sm px-5 py-2.5 text-center leading-5 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add User"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddUserDialog;
