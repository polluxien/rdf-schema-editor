import { IWorkspace, Workspace } from "@/models/Workspace";
import { WorkspaceDataset } from "@/models/WorkspaceDataset";
import {
  SaveWorkspacePayload,
  WorkspaceDataType,
  WorkspaceSummaryType,
  WorkspaceType,
} from "../../../sharedTypes/workspaceTypes";

function toSummary(workspace: IWorkspace): WorkspaceSummaryType {
  return {
    id: workspace._id.toString(),
    name: workspace.name,
    description: workspace.description,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

// dataset lives in its own collection (see WorkspaceDataset model) so it gets
// its own 16MB BSON budget instead of sharing one with the rest of the
// workspace; this stitches it back together for the API response
async function toWorkspaceResponse(workspace: IWorkspace): Promise<WorkspaceType> {
  const datasetDoc = await WorkspaceDataset.findOne({
    workspaceId: workspace._id,
  });
  return {
    ...toSummary(workspace),
    data: {
      ...workspace.toObject().data,
      dataset: datasetDoc?.dataset ?? null,
    },
  };
}

// splits the incoming payload into what goes on the Workspace document itself
// vs. what goes in the separate WorkspaceDataset document
function splitWorkspaceData(data: Partial<WorkspaceDataType> | undefined) {
  if (data === undefined) {
    return { workspaceData: undefined, dataset: undefined };
  }
  const { dataset, ...workspaceData } = data;
  return { workspaceData, dataset };
}

async function saveDataset(
  workspaceId: string,
  dataset: Record<string, unknown> | null,
): Promise<void> {
  await WorkspaceDataset.findOneAndUpdate(
    { workspaceId },
    { $set: { dataset } },
    { upsert: true },
  );
}

export async function createWorkspace(
  userId: string,
  payload: SaveWorkspacePayload,
): Promise<WorkspaceType> {
  const { workspaceData, dataset } = splitWorkspaceData(payload.data);

  const workspace = await Workspace.create({
    userId,
    name: payload.name || "untitled",
    description: payload.description ?? "",
    data: workspaceData,
  });

  if (dataset !== undefined) {
    await saveDataset(workspace._id.toString(), dataset);
  }

  return toWorkspaceResponse(workspace);
}

export async function getWorkspaces(
  userId: string,
): Promise<WorkspaceSummaryType[]> {
  const workspaces = await Workspace.find({ userId }).sort({ updatedAt: -1 });
  return workspaces.map(toSummary);
}

export async function getWorkspace(
  userId: string,
  id: string,
): Promise<WorkspaceType> {
  const workspace = await Workspace.findOne({ _id: id, userId });
  if (!workspace) {
    throw new Error("Workspace could not be found");
  }
  return toWorkspaceResponse(workspace);
}

// used to persist ("save") the currently open workspace to the user's account,
// either creating it on first save or updating it on subsequent saves
export async function saveWorkspace(
  userId: string,
  id: string | undefined,
  payload: SaveWorkspacePayload,
): Promise<WorkspaceType> {
  if (!id) {
    return createWorkspace(userId, payload);
  }
  return updateWorkspace(userId, id, payload);
}

export async function updateWorkspace(
  userId: string,
  id: string,
  payload: SaveWorkspacePayload,
): Promise<WorkspaceType> {
  const { workspaceData, dataset } = splitWorkspaceData(payload.data);

  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  // set per-field rather than replacing the whole `data` subdocument: the
  // frontend now only sends mappings/flowNodes/flowEdges on save (ontology is
  // cached client-side), and a whole-object $set would otherwise wipe the
  // previously stored ontology whenever it's omitted from the payload
  if (workspaceData?.mappings !== undefined)
    updateData["data.mappings"] = workspaceData.mappings;
  if (workspaceData?.flowNodes !== undefined)
    updateData["data.flowNodes"] = workspaceData.flowNodes;
  if (workspaceData?.flowEdges !== undefined)
    updateData["data.flowEdges"] = workspaceData.flowEdges;
  if (workspaceData?.ontology !== undefined)
    updateData["data.ontology"] = workspaceData.ontology;

  const workspace = await Workspace.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateData },
    { new: true },
  );
  if (!workspace) {
    throw new Error("Workspace could not be found");
  }

  if (dataset !== undefined) {
    await saveDataset(id, dataset);
  }

  return toWorkspaceResponse(workspace);
}

export async function deleteWorkspace(
  userId: string,
  id: string,
): Promise<void> {
  const result = await Workspace.findOneAndDelete({ _id: id, userId });
  if (!result) {
    throw new Error("Workspace could not be found");
  }
  await WorkspaceDataset.deleteOne({ workspaceId: id });
}

// ! only for unit-tests mock nononon
export async function deleteAllWorkspaces(): Promise<void> {
  await Workspace.deleteMany({});
  await WorkspaceDataset.deleteMany({});
}
