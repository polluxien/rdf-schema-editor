import { createContext, useContext, type ReactNode } from "react";

const EdgeEditContext = createContext<((edgeId: string) => void) | null>(null);

export function EdgeEditProvider({
  onEdit,
  children,
}: {
  onEdit: (edgeId: string) => void;
  children: ReactNode;
}) {
  return (
    <EdgeEditContext.Provider value={onEdit}>
      {children}
    </EdgeEditContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEdgeEdit() {
  return useContext(EdgeEditContext);
}
