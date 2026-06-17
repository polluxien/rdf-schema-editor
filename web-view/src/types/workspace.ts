import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "./index";

export interface Workspace {
  id: string;
  name: string;
  description: string;
}

export interface WorkspaceData {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
  flowNodes: Node[];
  flowEdges: Edge[];
}

export const EMPTY_WORKSPACE_DATA: WorkspaceData = {
  ontology: null,
  dataset: null,
  mappings: [],
  flowNodes: [],
  flowEdges: [],
};
