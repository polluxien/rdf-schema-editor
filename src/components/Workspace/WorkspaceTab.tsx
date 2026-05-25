import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Workspace } from "../../types/workspace";

interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export default function WorkspaceTab({
  workspace,
  isActive,
  canDelete,
  onSelect,
  onRename,
  onDelete,
}: WorkspaceTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(workspace.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isEditing) setDraft(workspace.name);
  }, [workspace.name, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    setIsEditing(false);
  };

  const startEditing = () => {
    setDraft(workspace.name);
    setIsEditing(true);
  };

  return (
    <div
      className={`group relative flex items-center max-w-[160px] border-r border-gray-200 dark:border-gray-800 ${
        isActive
          ? "bg-white text-gray-950 dark:bg-gray-950 dark:text-gray-100"
          : "bg-gray-100/70 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-900/50 dark:hover:bg-gray-900 dark:hover:text-gray-300"
      }`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(workspace.name);
              setIsEditing(false);
            }
          }}
          aria-label="Workspace-Name"
          className="w-full bg-white px-3 py-1.5 text-xs outline-none border-b border-gray-400 dark:bg-gray-950"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={(e) => {
            e.preventDefault();
            startEditing();
          }}
          className={`flex-1 truncate py-1.5 text-xs text-left ${
            canDelete ? "pl-3 pr-5" : "px-3"
          } ${isActive ? "border-b border-gray-900 -mb-px dark:border-gray-100" : ""}`}
          title="Doppelklick zum Umbenennen"
        >
          {workspace.name}
        </button>
      )}

      {canDelete && !isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-0 top-0 bottom-0 px-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity dark:text-gray-600 dark:hover:text-red-400"
          title="Workspace schließen"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
