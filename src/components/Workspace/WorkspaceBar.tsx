import { Plus } from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import WorkspaceTab from "./WorkspaceTab";
import WorkspaceImportExport from "./WorkspaceImportExport";
import ColorModeToggle from "./ColorModeToggle";
import ProfileAvaterButComp from "../Profile/ProfileAvaterButComp";

export default function WorkspaceBar() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    addWorkspace,
    renameWorkspace,
    removeWorkspace,
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
    <header className="shrink-0 bg-gray-900 text-gray-300 select-none">
      <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-gray-600 border-b border-gray-800 flex items-center justify-between">
        <span className="font-bold text-gray-400">rdf-schema-editor</span>
        <ColorModeToggle />
        <ProfileAvaterButComp />
      </div>

      <div className="flex items-stretch border-b border-gray-800 overflow-x-auto">
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
          className="flex items-center px-2.5 text-gray-600 hover:text-gray-300 hover:bg-gray-900 transition-colors"
          title="Neuer Workspace"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      <WorkspaceImportExport />
    </header>
  );
}
