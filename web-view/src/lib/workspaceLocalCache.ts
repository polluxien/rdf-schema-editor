import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "../types";

// mappings/flowNodes/flowEdges are cached here too so a plain page refresh
// (without an explicit "save workspace" to the account) doesn't lose the
// relationships drawn on the canvas.

const DB_NAME = "rdf-schema-editor";
const DB_VERSION = 1;
const STORE_NAME = "workspaceAssets";

export interface CachedWorkspaceAssets {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
  flowNodes: Node[];
  flowEdges: Edge[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = run(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function getCachedWorkspaceAssets(
  workspaceId: string,
): Promise<CachedWorkspaceAssets | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const result = await withStore<CachedWorkspaceAssets | undefined>(
      "readonly",
      (store) => store.get(workspaceId),
    );
    return result ?? null;
  } catch (err) {
    console.error("Failed to read cached workspace assets:", err);
    return null;
  }
}

export async function setCachedWorkspaceAssets(
  workspaceId: string,
  assets: CachedWorkspaceAssets,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await withStore("readwrite", (store) => store.put(assets, workspaceId));
  } catch (err) {
    console.error("Failed to cache workspace assets:", err);
  }
}

export async function deleteCachedWorkspaceAssets(
  workspaceId: string,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await withStore("readwrite", (store) => store.delete(workspaceId));
  } catch (err) {
    console.error("Failed to delete cached workspace assets:", err);
  }
}
