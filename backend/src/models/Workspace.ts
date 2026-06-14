import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspaceData {
  ontology: Record<string, unknown> | null;
  dataset: Record<string, unknown> | null;
  mappings: Record<string, unknown>[];
  flowNodes: Record<string, unknown>[];
  flowEdges: Record<string, unknown>[];
}

export interface IWorkspace extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  data: IWorkspaceData;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceDataSchema = new Schema<IWorkspaceData>(
  {
    ontology: { type: Schema.Types.Mixed, default: null },
    dataset: { type: Schema.Types.Mixed, default: null },
    mappings: { type: [Schema.Types.Mixed], default: [] },
    flowNodes: { type: [Schema.Types.Mixed], default: [] },
    flowEdges: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "untitled",
    },
    description: {
      type: String,
      default: "",
    },
    data: {
      type: WorkspaceDataSchema,
      default: () => ({
        ontology: null,
        dataset: null,
        mappings: [],
        flowNodes: [],
        flowEdges: [],
      }),
    },
  },
  {
    timestamps: true,
  }
);

export const Workspace =
  mongoose.models.Workspace || mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
