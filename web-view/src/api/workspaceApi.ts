import type { Workspace, WorkspaceData } from "../types/workspace";
import { fetchWithErrorHandling } from "./fetchWithErrorHandling";

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const REAL_FETCH = import.meta.env.VITE_REAL_FETCH === "true";

export interface WorkspaceWithData extends Workspace {
  data: WorkspaceData;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  if (USE_MOCK_DATA && !REAL_FETCH) {
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

  throw new Error(`Error fetching workspaces: ${response.statusText}`);
}

export async function getWorkspace(id: string): Promise<WorkspaceWithData | null> {
  if (USE_MOCK_DATA && !REAL_FETCH) {
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

  throw new Error(`Error fetching workspace: ${response.statusText}`);
}

export async function createWorkspace(
  workspace: Partial<Workspace> & { data?: WorkspaceData }
): Promise<Workspace> {
  if (USE_MOCK_DATA && !REAL_FETCH) {
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

  throw new Error(`Error creating workspace: ${response.statusText}`);
}

export async function updateWorkspace(
  id: string,
  updates: Partial<Workspace> & { data?: WorkspaceData }
): Promise<Workspace> {
  if (USE_MOCK_DATA && !REAL_FETCH) {
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

  throw new Error(`Error updating workspace: ${response.statusText}`);
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (USE_MOCK_DATA && !REAL_FETCH) {
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

  throw new Error(`Error deleting workspace: ${response.statusText}`);
}
