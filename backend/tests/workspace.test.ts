// workspaceService.test.ts
import mongoose from "mongoose";
import { Workspace } from "@/models/Workspace";
import { WorkspaceDataset } from "@/models/WorkspaceDataset";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  saveWorkspace,
  updateWorkspace,
} from "@/services/workspaceServices";

const userId = () => new mongoose.Types.ObjectId().toString();

const sampleData = {
  ontology: { name: "test-onto" },
  dataset: { name: "test-dataset" },
  mappings: [{ id: "m1" }],
  flowNodes: [{ id: "n1" }],
  flowEdges: [{ id: "e1" }],
};

describe("createWorkspace", () => {
  test("creates a workspace with the given fields", async () => {
    const owner = userId();
    const workspace = await createWorkspace(owner, {
      name: "My Workspace",
      description: "desc",
      data: sampleData,
    });

    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe("My Workspace");
    expect(workspace.description).toBe("desc");
    expect(workspace.data.mappings).toEqual([{ id: "m1" }]);
  });

  test("persists the workspace in the database", async () => {
    const owner = userId();
    const workspace = await createWorkspace(owner, { name: "Persisted" });

    const found = await Workspace.findById(workspace.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Persisted");
  });

  // edge case: no name/description/data provided -> defaults apply
  test("applies defaults when no name, description or data are given", async () => {
    const owner = userId();
    const workspace = await createWorkspace(owner, {});

    expect(workspace.name).toBe("untitled");
    expect(workspace.description).toBe("");
    expect(workspace.data).toEqual({
      ontology: null,
      dataset: null,
      mappings: [],
      flowNodes: [],
      flowEdges: [],
    });
  });

  // edge case: empty string name should fall back to default, not persist as ""
  test("falls back to 'untitled' when name is an empty string", async () => {
    const owner = userId();
    const workspace = await createWorkspace(owner, { name: "" });
    expect(workspace.name).toBe("untitled");
  });

  // edge case: two different users can each own a workspace with the same name
  test("allows the same workspace name for different users", async () => {
    const a = await createWorkspace(userId(), { name: "duplicate" });
    const b = await createWorkspace(userId(), { name: "duplicate" });

    expect(a.id).not.toBe(b.id);
    expect(a.name).toBe("duplicate");
    expect(b.name).toBe("duplicate");
  });
});

describe("getWorkspaces", () => {
  // edge case: user with no workspaces
  test("returns an empty array when the user has no workspaces", async () => {
    const workspaces = await getWorkspaces(userId());
    expect(workspaces).toEqual([]);
  });

  test("returns only the workspaces owned by the given user", async () => {
    const owner = userId();
    const otherOwner = userId();
    await createWorkspace(owner, { name: "mine-1" });
    await createWorkspace(owner, { name: "mine-2" });
    await createWorkspace(otherOwner, { name: "not-mine" });

    const workspaces = await getWorkspaces(owner);
    expect(workspaces).toHaveLength(2);
    expect(workspaces.map((w) => w.name).sort()).toEqual(["mine-1", "mine-2"]);
  });

  // edge case: summaries must not leak the full workspace data payload
  test("does not include the workspace data field in the summary", async () => {
    const owner = userId();
    await createWorkspace(owner, { name: "summary-only", data: sampleData });

    const workspaces = await getWorkspaces(owner);
    expect(workspaces[0]).not.toHaveProperty("data");
  });
});

describe("getWorkspace", () => {
  test("returns the full workspace including data for the owner", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, {
      name: "detail",
      data: sampleData,
    });

    const workspace = await getWorkspace(owner, created.id);
    expect(workspace.name).toBe("detail");
    expect(workspace.data).toEqual(sampleData);
  });

  // edge case: valid ObjectId format but no such workspace
  test("throws when the workspace does not exist", async () => {
    const owner = userId();
    const missingId = new mongoose.Types.ObjectId().toString();
    await expect(getWorkspace(owner, missingId)).rejects.toThrow(
      "Workspace could not be found",
    );
  });

  // edge case: malformed id (not a valid ObjectId)
  test("throws on a malformed id", async () => {
    await expect(getWorkspace(userId(), "not-a-valid-id")).rejects.toThrow();
  });

  // edge case: workspace exists but belongs to a different user
  test("throws when the workspace belongs to a different user", async () => {
    const owner = userId();
    const intruder = userId();
    const created = await createWorkspace(owner, { name: "private" });

    await expect(getWorkspace(intruder, created.id)).rejects.toThrow(
      "Workspace could not be found",
    );
  });
});

describe("updateWorkspace", () => {
  test("updates the given fields and returns the updated workspace", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, { name: "old-name" });

    const updated = await updateWorkspace(owner, created.id, {
      name: "new-name",
    });
    expect(updated.name).toBe("new-name");
  });

  test("persists the update", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, { name: "old-name" });
    await updateWorkspace(owner, created.id, { name: "persisted-name" });

    const found = await Workspace.findById(created.id);
    expect(found?.name).toBe("persisted-name");
  });

  test("replaces the workspace data payload", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, { name: "with-data" });

    const updated = await updateWorkspace(owner, created.id, {
      data: sampleData,
    });
    expect(updated.data).toEqual(sampleData);
  });

  // edge case: empty update leaves existing fields unchanged
  test("leaves fields unchanged on an empty update", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, {
      name: "unchanged",
      description: "keep-me",
    });

    const updated = await updateWorkspace(owner, created.id, {});
    expect(updated.name).toBe("unchanged");
    expect(updated.description).toBe("keep-me");
  });

  // edge case: updating a non-existent workspace
  test("throws when the workspace does not exist", async () => {
    const owner = userId();
    const missingId = new mongoose.Types.ObjectId().toString();
    await expect(
      updateWorkspace(owner, missingId, { name: "ghost" }),
    ).rejects.toThrow("Workspace could not be found");
  });

  // edge case: a user cannot update another user's workspace
  test("throws when trying to update another user's workspace", async () => {
    const owner = userId();
    const intruder = userId();
    const created = await createWorkspace(owner, { name: "protected" });

    await expect(
      updateWorkspace(intruder, created.id, { name: "hijacked" }),
    ).rejects.toThrow("Workspace could not be found");

    const found = await Workspace.findById(created.id);
    expect(found?.name).toBe("protected");
  });
});

describe("saveWorkspace", () => {
  // edge case: no id yet -> first save creates the workspace
  test("creates a new workspace when no id is given", async () => {
    const owner = userId();
    const saved = await saveWorkspace(owner, undefined, {
      name: "first-save",
      data: sampleData,
    });

    expect(saved.id).toBeDefined();
    const found = await Workspace.findById(saved.id);
    expect(found?.name).toBe("first-save");
  });

  // edge case: existing id -> subsequent save updates in place instead of duplicating
  test("updates the existing workspace when an id is given", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, { name: "draft" });

    const saved = await saveWorkspace(owner, created.id, {
      data: sampleData,
    });

    expect(saved.id).toBe(created.id);
    expect(saved.data).toEqual(sampleData);
    expect(await getWorkspaces(owner)).toHaveLength(1);
  });
});

describe("deleteWorkspace", () => {
  test("removes the workspace from the database", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, { name: "to-delete" });

    await deleteWorkspace(owner, created.id);

    const found = await Workspace.findById(created.id);
    expect(found).toBeNull();
  });

  test("deletes only the targeted workspace", async () => {
    const owner = userId();
    const a = await createWorkspace(owner, { name: "keep-a" });
    const b = await createWorkspace(owner, { name: "keep-b" });

    await deleteWorkspace(owner, a.id);

    expect(await Workspace.findById(a.id)).toBeNull();
    expect(await Workspace.findById(b.id)).not.toBeNull();
  });

  // edge case: deleting a non-existent workspace
  test("throws when the workspace does not exist", async () => {
    const owner = userId();
    const missingId = new mongoose.Types.ObjectId().toString();
    await expect(deleteWorkspace(owner, missingId)).rejects.toThrow(
      "Workspace could not be found",
    );
  });

  // edge case: a user cannot delete another user's workspace
  test("throws when trying to delete another user's workspace", async () => {
    const owner = userId();
    const intruder = userId();
    const created = await createWorkspace(owner, { name: "not-yours" });

    await expect(deleteWorkspace(intruder, created.id)).rejects.toThrow(
      "Workspace could not be found",
    );
    expect(await Workspace.findById(created.id)).not.toBeNull();
  });
});

// dataset is stored in its own collection, kept out of the Workspace document
// itself so a large imported CSV doesn't compete with ontology/mappings/flow
// layout for MongoDB's 16MB per-document limit
describe("dataset storage (kept out of the Workspace document)", () => {
  test("does not embed the dataset inside the Workspace document", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, {
      name: "split-storage",
      data: sampleData,
    });

    const raw = await Workspace.findById(created.id);
    expect(raw?.toObject().data).not.toHaveProperty("dataset");

    const datasetDoc = await WorkspaceDataset.findOne({
      workspaceId: created.id,
    });
    expect(datasetDoc?.dataset).toEqual({ name: "test-dataset" });
  });

  // edge case: creating a workspace without a dataset must not create an
  // empty WorkspaceDataset document (nothing to store yet)
  test("does not create a dataset document when no dataset is given", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, { name: "no-dataset" });

    expect(await WorkspaceDataset.findOne({ workspaceId: created.id })).toBeNull();
    const fetched = await getWorkspace(owner, created.id);
    expect(fetched.data.dataset).toBeNull();
  });

  // edge case: re-saving with the same dataset value (as the frontend always
  // does — it round-trips the full WorkspaceData on every save) keeps it intact
  test("keeps the dataset when it is re-saved unchanged alongside other updates", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, {
      name: "keep-dataset",
      data: sampleData,
    });

    const updated = await updateWorkspace(owner, created.id, {
      data: { ...sampleData, ontology: { name: "changed" } },
    });

    expect(updated.data.ontology).toEqual({ name: "changed" });
    expect(updated.data.dataset).toEqual({ name: "test-dataset" });
  });

  // edge case: explicitly saving a null dataset clears the previously stored one
  test("clears the stored dataset when explicitly updated to null", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, {
      name: "clear-dataset",
      data: sampleData,
    });

    const updated = await updateWorkspace(owner, created.id, {
      data: { ...sampleData, dataset: null },
    });

    expect(updated.data.dataset).toBeNull();
  });

  // edge case: deleting a workspace must clean up its dataset document too
  test("deletes the associated dataset document when the workspace is deleted", async () => {
    const owner = userId();
    const created = await createWorkspace(owner, {
      name: "cleanup",
      data: sampleData,
    });

    await deleteWorkspace(owner, created.id);

    expect(await WorkspaceDataset.findOne({ workspaceId: created.id })).toBeNull();
  });

  // edge case: a large dataset (bigger than a single Workspace document could
  // hold alongside its other fields) must still save successfully now that
  // it lives in its own document
  test("saves a dataset far larger than would fit embedded in the workspace", async () => {
    const owner = userId();
    const bigRows = Array.from({ length: 20000 }, (_, i) => [
      `row-${i}`,
      "x".repeat(200),
    ]);
    const created = await createWorkspace(owner, {
      name: "large-dataset",
      data: {
        ...sampleData,
        dataset: { rows: bigRows },
      },
    });

    const fetched = await getWorkspace(owner, created.id);
    expect((fetched.data.dataset as { rows: unknown[] }).rows).toHaveLength(
      20000,
    );
  });
});
