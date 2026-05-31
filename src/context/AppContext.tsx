import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ColorMode, Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "../types";
import { useWorkspace } from "../hooks/useWorkspace";
import { AppContext } from "./AppContextType";
import { loadMockData } from "../lib/useMock";

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const COLOR_MODE_STORAGE_KEY = "colorMode";
const COLOR_MODES: ColorMode[] = ["light", "dark", "system"];

const getInitialColorMode = (): ColorMode => {
  if (typeof window === "undefined") return "system";
  const storedMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode;
  return COLOR_MODES.includes(storedMode) ? storedMode : "system";
};

const resolveColorMode = (mode: ColorMode): "light" | "dark" => {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { activeWorkspaceId, getWorkspaceData, updateWorkspaceData } =
    useWorkspace();
  const [colorMode, setLocalColorMode] = useState<ColorMode>(getInitialColorMode);

  const data = activeWorkspaceId ? getWorkspaceData(activeWorkspaceId) : null;

  const [focusedColumnId, setFocusedColumnId] = useState<string | null>(null);

  // Ref, um sicherzustellen, dass die Mock-Daten nur einmal geladen werden
  const mockLoadedRef = useRef(false);

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
    (ontology: Ontology | null) =>
      patch((prev) => {
        const removedClassNodeIds = new Set(
          prev.flowNodes
            .filter((node) => node.id.startsWith("class-"))
            .map((node) => node.id),
        );

        return {
          ontology,
          mappings: [],
          flowNodes: prev.flowNodes.filter((node) => !removedClassNodeIds.has(node.id)),
          flowEdges: prev.flowEdges.filter(
            (edge) =>
              !removedClassNodeIds.has(edge.source) &&
              !removedClassNodeIds.has(edge.target),
          ),
        };
      }),
    [patch],
  );

  const setDataset = useCallback(
    (dataset: Dataset | null) =>
      patch((prev) => {
        const removedColumnNodeIds = new Set(
          prev.flowNodes
            .filter((node) => node.id.startsWith("column-"))
            .map((node) => node.id),
        );

        return {
          dataset,
          mappings: [],
          flowNodes: prev.flowNodes.filter(
            (node) => !removedColumnNodeIds.has(node.id),
          ),
          flowEdges: prev.flowEdges.filter(
            (edge) =>
              !removedColumnNodeIds.has(edge.source) &&
              !removedColumnNodeIds.has(edge.target),
          ),
        };
      }),
    [patch],
  );

  useEffect(() => {
    if (USE_MOCK_DATA && !mockLoadedRef.current) {
      mockLoadedRef.current = true;

      const initMockData = () => {
        try {
          const { dataset, ontology } = loadMockData();

          if (dataset) {
            setDataset(dataset);
          }
          if (ontology) {
            setOntology(ontology);
          }
        } catch (error) {
          console.error("Error while loading mock data:", error);
        }
      };

      initMockData();
    }
  }, [setDataset, setOntology]);

  useEffect(() => {
    const applyTheme = () => {
      const resolvedMode = resolveColorMode(colorMode);
      document.documentElement.dataset.theme = colorMode;
      document.documentElement.dataset.resolvedTheme = resolvedMode;
      document.documentElement.classList.toggle("dark", resolvedMode === "dark");
      document.documentElement.style.colorScheme = resolvedMode;
    };

    applyTheme();

    if (colorMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [colorMode]);

  const addMapping = useCallback(
    (mapping: Mapping) =>
      patch((prev) => ({ mappings: [...prev.mappings, mapping] })),
    [patch],
  );

  const updateMapping = useCallback(
    (mappingId: string, updater: (mapping: Mapping) => Mapping) =>
      patch((prev) => ({
        mappings: prev.mappings.map((mapping) =>
          mapping.id === mappingId ? updater(mapping) : mapping,
        ),
      })),
    [patch],
  );

  const removeMapping = useCallback(
    (mappingId: string) =>
      patch((prev) => ({
        mappings: prev.mappings.filter((m) => m.id !== mappingId),
      })),
    [patch],
  );

  const removeMappingsForNode = useCallback(
    (nodeId: string) =>
      patch((prev) => {
        const columnId = nodeId.startsWith("column-")
          ? nodeId.replace("column-", "")
          : null;
        const classId = nodeId.startsWith("class-")
          ? nodeId.replace("class-", "")
          : null;

        return {
          mappings: prev.mappings.filter(
            (mapping) =>
              mapping.sourceColumnId !== columnId &&
              mapping.targetClassId !== classId,
          ),
        };
      }),
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

  const setColorMode = useCallback((mode: ColorMode) => {
    setLocalColorMode(mode);
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  }, []);

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
        updateMapping,
        removeMapping,
        removeMappingsForNode,
        clearMappings,
        flowNodes: data?.flowNodes ?? [],
        flowEdges: data?.flowEdges ?? [],
        setFlowNodes,
        setFlowEdges,
        focusedColumnId,
        setFocusedColumnId,
        colorMode,
        setColorMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
