import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "../types";

export interface AppContextType {
  activeWorkspaceId: string | null;
  ontology: Ontology | null;
  setOntology: (ontology: Ontology | null) => void;
  dataset: Dataset | null;
  setDataset: (dataset: Dataset | null) => void;
  mappings: Mapping[];
  addMapping: (mapping: Mapping) => void;
  removeMapping: (mappingId: string) => void;
  clearMappings: () => void;
  flowNodes: Node[];
  flowEdges: Edge[];
  setFlowNodes: Dispatch<SetStateAction<Node[]>>;
  setFlowEdges: Dispatch<SetStateAction<Edge[]>>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
