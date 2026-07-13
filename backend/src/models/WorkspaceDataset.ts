import mongoose, { Schema, Document } from "mongoose";

// holds the (potentially large) imported dataset for a workspace, kept out of
// the Workspace document itself so it gets its own 16MB BSON budget instead of
// sharing it with ontology/mappings/flow layout
export interface IWorkspaceDataset extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  dataset: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceDatasetSchema = new Schema<IWorkspaceDataset>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    dataset: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  }
);

export const WorkspaceDataset =
  mongoose.models.WorkspaceDataset ||
  mongoose.model<IWorkspaceDataset>("WorkspaceDataset", WorkspaceDatasetSchema);
