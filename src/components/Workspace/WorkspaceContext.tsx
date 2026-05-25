import { createContext, useState, type ReactNode } from "react";
import type { Workspace, WorkspaceData } from "../../types/workspace";
import { EMPTY_WORKSPACE_DATA } from "../../types/workspace";

export interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  getWorkspaceData: (id: string) => WorkspaceData;
  updateWorkspaceData: (
    id: string,
    updater: (prev: WorkspaceData) => WorkspaceData,
  ) => void;
  addWorkspace: (workspace: Workspace) => void;
  renameWorkspace: (id: string, name: string) => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  switches: Record<string, boolean>;
  toggleSwitch: (key: string) => void;
}

const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: "1",
    name: "untitled-1",
    description: "",
  },
];

// eslint-disable-next-line react-refresh/only-export-components
export const WorkspaceContext = createContext<WorkspaceContextType | null>(
  null,
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] =
    useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    DEFAULT_WORKSPACES[0].id,
  );
  const [workspaceData, setWorkspaceData] = useState<
    Record<string, WorkspaceData>
  >(() => ({
    [DEFAULT_WORKSPACES[0].id]: { ...EMPTY_WORKSPACE_DATA },
  }));
  const [switches, setSwitches] = useState<Record<string, boolean>>({});

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  const getWorkspaceData = (id: string): WorkspaceData =>
    workspaceData[id] ?? EMPTY_WORKSPACE_DATA;

  const updateWorkspaceData = (
    id: string,
    updater: (prev: WorkspaceData) => WorkspaceData,
  ) => {
    setWorkspaceData((prev) => ({
      ...prev,
      [id]: updater(prev[id] ?? EMPTY_WORKSPACE_DATA),
    }));
  };

  const addWorkspace = (workspace: Workspace) => {
    setWorkspaces((prev) => [...prev, workspace]);
    setWorkspaceData((prev) => ({
      ...prev,
      [workspace.id]: { ...EMPTY_WORKSPACE_DATA },
    }));
    setActiveWorkspaceId(workspace.id);
  };

  const renameWorkspace = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, name: trimmed } : w)),
    );
  };

  const removeWorkspace = (id: string) => {
    setWorkspaces((prev) => {
      if (prev.length <= 1) return prev;

      const remaining = prev.filter((w) => w.id !== id);
      setWorkspaceData((data) => {
        const next = { ...data };
        delete next[id];
        return next;
      });

      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(remaining[0]?.id ?? null);
      }

      return remaining;
    });
  };

  const setActiveWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
  };

  const toggleSwitch = (key: string) => {
    setSwitches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        getWorkspaceData,
        updateWorkspaceData,
        addWorkspace,
        renameWorkspace,
        removeWorkspace,
        setActiveWorkspace,
        switches,
        toggleSwitch,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
