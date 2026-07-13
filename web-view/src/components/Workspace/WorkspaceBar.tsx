import { Plus } from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import WorkspaceTab from "./WorkspaceTab";
import WorkspaceImportExport from "./WorkspaceImportExport";

export default function WorkspaceBar() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    addWorkspace,
    renameWorkspace,
    removeWorkspace,
    isLoadingWorkspaces,
  } = useWorkspace();

  const nextUntitledName = () => {
    const used = new Set(workspaces.map((w) => w.name));
    //avoid name clashes with existing workspaces by appending a number to "untitled" + start small and increment until we find an unused name
    let i = 1;
    while (used.has(`untitled-${i}`)) i++;
    return `untitled-${i}`;
  };

  const handleAdd = () => {
    addWorkspace({
      id: crypto.randomUUID(),
      name: nextUntitledName(),
      description: "",
    });
  };

  return (
    <header className="shrink-0 bg-gray-100 text-gray-700 select-none dark:bg-gray-900 dark:text-gray-300">
      <div className="flex items-stretch border-b border-gray-200 overflow-x-auto dark:border-gray-800">
        {workspaces.map((workspace) => (
          <WorkspaceTab
            key={workspace.id}
            workspace={workspace}
            isActive={activeWorkspaceId === workspace.id}
            canDelete={workspaces.length > 1}
            onSelect={() => setActiveWorkspace(workspace.id)}
            onRename={(name) => renameWorkspace(workspace.id, name)}
            onDelete={() => removeWorkspace(workspace.id)}
          />
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center px-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors dark:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-gray-900"
          title="Neuer Workspace"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
        {isLoadingWorkspaces && (
          <span className="flex items-center px-2.5 text-xs text-gray-400 select-none dark:text-gray-600">
            Loading workspaces...
          </span>
        )}
      </div>

      <WorkspaceImportExport />
    </header>
  );
}
