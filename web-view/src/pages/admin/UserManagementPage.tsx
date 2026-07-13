import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Pencil,
  Check,
  X,
  User,
  AlertCircle,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { getAllUsers, updateUser, deleteUser } from "../../api/userAPI";
import type {
  UserType,
  UpdateUserPayload,
} from "../../../../sharedTypes/userTypes";
import AddUserDialog from "./AddUserDialog";

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  function startEdit(user: UserType) {
    setDeleteConfirmId(null);
    setEditingId(user._id);
    setEditForm({ name: user.name, email: user.email, isAdmin: user.isAdmin });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id: string) {
    try {
      const updated = await updateUser(id, editForm);
      setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
      setEditingId(null);
    } catch {
      setError("Failed to save changes.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setDeleteConfirmId(null);
    } catch {
      setError("Failed to delete user.");
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

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
        <h3 className="text-lg font-semibold">User Management</h3>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              title="Close"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {!loading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} {filtered.length === 1 ? "User" : "Users"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={() => setAddUserDialogOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br text-white text-sm font-medium rounded-full transition-colors"
            >
              <UserPlus size={15} />
              Add User
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center p-16 text-gray-400 text-sm">
              Loading users...
            </div>
          )}
          {!loading && filtered.length === 0 ? (
            <div className="flex items-center justify-center p-16 text-gray-400 text-sm">
              No users found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Created
                  </th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((user) => {
                  if (deleteConfirmId === user._id) {
                    return (
                      <tr key={user._id}>
                        <td
                          colSpan={5}
                          className="px-4 py-3 bg-red-50 dark:bg-red-900/10"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-red-700 dark:text-red-400">
                              Delete <strong>{user.name}</strong>?
                            </span>
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (editingId === user._id) {
                    return (
                      <tr
                        key={user._id}
                        className="bg-blue-50/40 dark:bg-blue-900/10"
                      >
                        <td className="px-4 py-2">
                          <input
                            title="Edit name"
                            className="w-full bg-white dark:bg-gray-800 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={editForm.name ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            title="Edit email"
                            className="w-full bg-white dark:bg-gray-800 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={editForm.email ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((f) => ({
                                ...f,
                                isAdmin: !f.isAdmin,
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              editForm.isAdmin
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {editForm.isAdmin ? (
                              <Shield size={11} />
                            ) : (
                              <ShieldOff size={11} />
                            )}
                            {editForm.isAdmin ? "Admin" : "User"}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "en-US",
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => saveEdit(user._id)}
                              className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Save"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Cancel"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.isAdmin
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {user.isAdmin ? (
                            <Shield size={11} />
                          ) : (
                            <User size={11} />
                          )}
                          {user.isAdmin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-US")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              cancelEdit();
                              setDeleteConfirmId(user._id);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
      {addUserDialogOpen && (
        <AddUserDialog
          onClose={() => setAddUserDialogOpen(false)}
          onCreated={(created) => setUsers((prev) => [...prev, created])}
        />
      )}
    </div>
  );
}
