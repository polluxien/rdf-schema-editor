import { useCallback, type ReactNode } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "../types";
import { useWorkspace } from "../hooks/useWorkspace";
import { AppContext } from "./AppContextType";

export function AppProvider({ children }: { children: ReactNode }) {
  const { activeWorkspaceId, getWorkspaceData, updateWorkspaceData } =
    useWorkspace();

  const data = activeWorkspaceId
    ? getWorkspaceData(activeWorkspaceId)
    : null;

  const patch = useCallback(
    (
      updater: (
        prev: NonNullable<typeof data>,
      ) => Partial<NonNullable<typeof data>>,
    ) => {
      if (!activeWorkspaceId) return;
      updateWorkspaceData(activeWorkspaceId, (prev) => ({
        ...prev,
        ...updater(prev),
      }));
    },
    [activeWorkspaceId, updateWorkspaceData],
  );

  const setOntology = useCallback(
    (ontology: Ontology | null) => patch(() => ({ ontology })),
    [patch],
  );

  const setDataset = useCallback(
    (dataset: Dataset | null) => patch(() => ({ dataset })),
    [patch],
  );

  const addMapping = useCallback(
    (mapping: Mapping) =>
      patch((prev) => ({ mappings: [...prev.mappings, mapping] })),
    [patch],
  );

  const removeMapping = useCallback(
    (mappingId: string) =>
      patch((prev) => ({
        mappings: prev.mappings.filter((m) => m.id !== mappingId),
      })),
    [patch],
  );

  const clearMappings = useCallback(
    () => patch(() => ({ mappings: [] })),
    [patch],
  );

  const setFlowNodes = useCallback(
    (nodesOrUpdater: Node[] | ((prev: Node[]) => Node[])) => {
      patch((prev) => ({
        flowNodes:
          typeof nodesOrUpdater === "function"
            ? nodesOrUpdater(prev.flowNodes)
            : nodesOrUpdater,
      }));
    },
    [patch],
  );

  const setFlowEdges = useCallback(
    (edgesOrUpdater: Edge[] | ((prev: Edge[]) => Edge[])) => {
      patch((prev) => ({
        flowEdges:
          typeof edgesOrUpdater === "function"
            ? edgesOrUpdater(prev.flowEdges)
            : edgesOrUpdater,
      }));
    },
    [patch],
  );

  return (
    <AppContext.Provider
      value={{
        activeWorkspaceId,
        ontology: data?.ontology ?? null,
        setOntology,
        dataset: data?.dataset ?? null,
        setDataset,
        mappings: data?.mappings ?? [],
        addMapping,
        removeMapping,
        clearMappings,
        flowNodes: data?.flowNodes ?? [],
        flowEdges: data?.flowEdges ?? [],
        setFlowNodes,
        setFlowEdges,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
