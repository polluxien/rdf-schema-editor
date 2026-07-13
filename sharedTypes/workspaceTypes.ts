export type WorkspaceDataType = {
  ontology: Record<string, unknown> | null;
  dataset: Record<string, unknown> | null;
  mappings: Record<string, unknown>[];
  flowNodes: Record<string, unknown>[];
  flowEdges: Record<string, unknown>[];
};

export type WorkspaceSummaryType = {
  id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkspaceType = WorkspaceSummaryType & {
  data: WorkspaceDataType;
};

export type SaveWorkspacePayload = {
  name?: string;
  description?: string;
  // partial: the frontend only sends `mappings`/`flowNodes`/`flowEdges` on
  // save now (ontology/dataset are cached client-side, see workspaceLocalCache.ts)
  data?: Partial<WorkspaceDataType>;
};
