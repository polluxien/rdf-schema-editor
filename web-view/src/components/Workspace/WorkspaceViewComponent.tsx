import { useWorkspace } from "../../hooks/useWorkspace";

function WorkspaceViewComponent() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspace();

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <h2 className="text-sm font-medium text-gray-500 mb-2 dark:text-gray-400">Workspaces</h2>
      <div className="flex flex-wrap gap-2">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            onClick={() => setActiveWorkspace(workspace.id)}
            className={`p-2 rounded text-left ${
              activeWorkspaceId === workspace.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
            }`}
          >
            <h3 className="font-medium">{workspace.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-300">
              {workspace.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default WorkspaceViewComponent;
