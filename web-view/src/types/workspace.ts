import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "./index";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  /** id of the persisted workspace on the backend, once saved to the account */
  remoteId?: string;
  /** ISO timestamp of the last successful save to the account */
  savedAt?: string;
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

/** what actually gets persisted to the backend on save - ontology/dataset are
 * cached client-side instead (see lib/workspaceLocalCache.ts) since they can
 * be arbitrarily large and would make every save heavy */
export type WorkspaceSaveData = Pick<
  WorkspaceData,
  "mappings" | "flowNodes" | "flowEdges"
>;
