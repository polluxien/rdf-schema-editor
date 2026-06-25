import type { Edge, Node } from "@xyflow/react";
import type { ClassRelation, Dataset, Mapping, Ontology } from "./index";

export interface Workspace {
  id: string;
  name: string;
  description: string;
}

export interface WorkspaceData {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
  relations: ClassRelation[];
  flowNodes: Node[];
  flowEdges: Edge[];
  /** Base IRI used to pre-fill subject templates, e.g. "http://example.org". */
  baseIri: string;
}

export const DEFAULT_BASE_IRI = "http://example.org";

export const EMPTY_WORKSPACE_DATA: WorkspaceData = {
  ontology: null,
  dataset: null,
  mappings: [],
  relations: [],
  flowNodes: [],
  flowEdges: [],
  baseIri: DEFAULT_BASE_IRI,
};
