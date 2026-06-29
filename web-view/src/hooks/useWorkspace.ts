import { useContext } from "react";
import { WorkspaceContext } from "../components/Workspace/WorkspaceContext";

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === null) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
