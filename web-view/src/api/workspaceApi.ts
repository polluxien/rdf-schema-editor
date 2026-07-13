import type { Workspace, WorkspaceData, WorkspaceSaveData } from "../types/workspace";
import { fetchWithErrorHandling } from "./fetchWithErrorHandling";

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const REAL_FETCH = import.meta.env.VITE_REAL_FETCH === "true";

export interface WorkspaceWithData extends Workspace {
  data: WorkspaceData;
}

// surfaces the backend's `{ error: "..." }` body when present, so the UI can
// show the exact reason a save/load/delete failed instead of a generic message
async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = await response.clone().json();
    if (typeof body?.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // response body wasn't JSON — fall back below
  }
  return `${fallback} (${response.status} ${response.statusText})`;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  if (!REAL_FETCH) {
    return [];
  }

  const url = `${API_BASE_URL}/api/workspaces`;
  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    credentials: "include",
  });

  if (response.ok) {
    return response.json();
  }

  if (response.status === 401) {
    return [];
  }

  throw new Error(await extractErrorMessage(response, "Error fetching workspaces"));
}

export async function getWorkspace(id: string): Promise<WorkspaceWithData | null> {
  if (!REAL_FETCH) {
    return null;
  }

  const url = `${API_BASE_URL}/api/workspaces/${id}`;
  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    credentials: "include",
  });

  if (response.ok) {
    return response.json();
  }

  if (response.status === 404 || response.status === 401) {
    return null;
  }

  throw new Error(await extractErrorMessage(response, "Error fetching workspace"));
}

export async function createWorkspace(
  workspace: Partial<Workspace> & { data?: WorkspaceSaveData }
): Promise<Workspace> {
  if (!REAL_FETCH) {
    return {
      id: crypto.randomUUID(),
      name: workspace.name || "untitled",
      description: workspace.description || "",
    };
  }

  const url = `${API_BASE_URL}/api/workspaces`;
  const response = await fetchWithErrorHandling(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(workspace),
  });

  if (response.ok) {
    return response.json();
  }

  throw new Error(await extractErrorMessage(response, "Error creating workspace"));
}

export async function updateWorkspace(
  id: string,
  updates: Partial<Workspace> & { data?: WorkspaceSaveData }
): Promise<Workspace> {
  if (!REAL_FETCH) {
    return {
      id,
      name: updates.name || "untitled",
      description: updates.description || "",
    };
  }

  const url = `${API_BASE_URL}/api/workspaces/${id}`;
  const response = await fetchWithErrorHandling(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });

  if (response.ok) {
    return response.json();
  }

  throw new Error(await extractErrorMessage(response, "Error updating workspace"));
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (!REAL_FETCH) {
    return;
  }

  const url = `${API_BASE_URL}/api/workspaces/${id}`;
  const response = await fetchWithErrorHandling(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (response.ok) {
    return;
  }

  throw new Error(await extractErrorMessage(response, "Error deleting workspace"));
}
