import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Workspace, WorkspaceData } from "../../types/workspace";
import { EMPTY_WORKSPACE_DATA } from "../../types/workspace";
import {
  createWorkspace as createRemoteWorkspace,
  getWorkspace as getRemoteWorkspace,
  getWorkspaces as getRemoteWorkspaces,
  updateWorkspace as updateRemoteWorkspace,
} from "../../api/workspaceApi";
import { useLoginContext } from "../../api/LoginInfo";
import {
  deleteCachedWorkspaceAssets,
  getCachedWorkspaceAssets,
  setCachedWorkspaceAssets,
} from "../../lib/workspaceLocalCache";

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
  /** persists the given workspace (create on first save, update afterwards) to the user's account */
  saveWorkspace: (id: string) => Promise<void>;
  savingWorkspaceId: string | null;
  saveError: string | null;
  clearSaveError: () => void;
  /** true while the account's saved workspaces are being fetched after login/refresh */
  isLoadingWorkspaces: boolean;
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
  const { loginInfo } = useLoginContext();
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
  const [savingWorkspaceId, setSavingWorkspaceId] = useState<string | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  // tracks which account's workspaces are currently loaded, so we reload on
  // user switch and reset on logout without refetching on every render
  const loadedForUserId = useRef<string | null>(null);

  // ontology/dataset aren't sent to the backend on save (see saveWorkspace
  // below), so a plain page refresh would lose them unless they're restored
  // from the local IndexedDB cache here
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedWorkspaceAssets(DEFAULT_WORKSPACES[0].id);
      if (cancelled || !cached) return;
      setWorkspaceData((prev) => ({
        ...prev,
        [DEFAULT_WORKSPACES[0].id]: {
          ...(prev[DEFAULT_WORKSPACES[0].id] ?? EMPTY_WORKSPACE_DATA),
          ontology: cached.ontology,
          dataset: cached.dataset,
        },
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loginInfo) {
      // logged out (or session check still pending) -> reset to local defaults once
      if (loadedForUserId.current !== null) {
        loadedForUserId.current = null;
        setWorkspaces(DEFAULT_WORKSPACES);
        setWorkspaceData({
          [DEFAULT_WORKSPACES[0].id]: { ...EMPTY_WORKSPACE_DATA },
        });
        setActiveWorkspaceId(DEFAULT_WORKSPACES[0].id);
      }
      return;
    }

    if (loadedForUserId.current === loginInfo.id) return;
    loadedForUserId.current = loginInfo.id;

    let cancelled = false;
    setIsLoadingWorkspaces(true);

    (async () => {
      try {
        const summaries = await getRemoteWorkspaces();
        if (cancelled) return;

        if (summaries.length === 0) {
          setWorkspaces(DEFAULT_WORKSPACES);
          setWorkspaceData({
            [DEFAULT_WORKSPACES[0].id]: { ...EMPTY_WORKSPACE_DATA },
          });
          setActiveWorkspaceId(DEFAULT_WORKSPACES[0].id);
          return;
        }

        const loaded = await Promise.all(
          summaries.map((summary) => getRemoteWorkspace(summary.id)),
        );
        if (cancelled) return;

        const nextWorkspaces: Workspace[] = [];
        const nextWorkspaceData: Record<string, WorkspaceData> = {};
        for (const workspace of loaded) {
          if (!workspace) continue;
          nextWorkspaces.push({
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            remoteId: workspace.id,
          });
          // ontology/dataset no longer come from the backend response (they
          // aren't saved there) - restore them from the local cache instead;
          // if this browser never imported/cached them, they stay null and
          // have to be re-imported
          const cached = await getCachedWorkspaceAssets(workspace.id);
          nextWorkspaceData[workspace.id] = {
            ...workspace.data,
            ontology: cached?.ontology ?? workspace.data.ontology,
            dataset: cached?.dataset ?? workspace.data.dataset,
          };
        }

        setWorkspaces(nextWorkspaces);
        setWorkspaceData(nextWorkspaceData);
        setActiveWorkspaceId(nextWorkspaces[0]?.id ?? null);
      } catch (err) {
        console.error("Failed to load saved workspaces:", err);
      } finally {
        if (!cancelled) setIsLoadingWorkspaces(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginInfo]);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  const getWorkspaceData = (id: string): WorkspaceData =>
    workspaceData[id] ?? EMPTY_WORKSPACE_DATA;

  const updateWorkspaceData = (
    id: string,
    updater: (prev: WorkspaceData) => WorkspaceData,
  ) => {
    setWorkspaceData((prev) => {
      const prevData = prev[id] ?? EMPTY_WORKSPACE_DATA;
      const nextData = updater(prevData);
      // ontology/dataset are write-once/read-many (set on import, otherwise
      // just read) - only touch the cache when they actually changed, not on
      // every mapping/flow-node edit
      if (
        nextData.ontology !== prevData.ontology ||
        nextData.dataset !== prevData.dataset
      ) {
        void setCachedWorkspaceAssets(id, {
          ontology: nextData.ontology,
          dataset: nextData.dataset,
        });
      }
      return { ...prev, [id]: nextData };
    });
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
      void deleteCachedWorkspaceAssets(id);

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

  const saveWorkspace = async (id: string) => {
    const workspace = workspaces.find((w) => w.id === id);
    if (!workspace) return;

    setSavingWorkspaceId(id);
    setSaveError(null);
    try {
      const data = getWorkspaceData(id);
      // ontology/dataset are cached client-side (see workspaceLocalCache.ts)
      // instead of being sent to the backend on every save - they can be
      // arbitrarily large (a full imported CSV) and made saves heavy
      const payload = {
        name: workspace.name,
        description: workspace.description,
        data: {
          mappings: data.mappings,
          flowNodes: data.flowNodes,
          flowEdges: data.flowEdges,
        },
      };

      let saved;
      try {
        saved = workspace.remoteId
          ? await updateRemoteWorkspace(workspace.remoteId, payload)
          : await createRemoteWorkspace(payload);
      } catch (err) {
        // the workspace this remoteId pointed to is gone server-side (e.g. deleted
        // elsewhere, or the database was reset) -> recover by saving it as a new
        // workspace instead of failing on the stale id forever
        const isStaleRemoteId =
          workspace.remoteId &&
          err instanceof Error &&
          err.message === "Workspace could not be found";
        if (!isStaleRemoteId) throw err;
        saved = await createRemoteWorkspace(payload);
      }

      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, remoteId: saved.id, savedAt: new Date().toISOString() }
            : w,
        ),
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save workspace",
      );
      throw err;
    } finally {
      setSavingWorkspaceId(null);
    }
  };

  const clearSaveError = () => setSaveError(null);

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
        saveWorkspace,
        savingWorkspaceId,
        saveError,
        clearSaveError,
        isLoadingWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
