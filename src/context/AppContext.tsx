import { useState, type ReactNode } from "react";
import type { Ontology, Dataset, Mapping } from "../types";
import { AppContext } from "./AppContextType";

export function AppProvider({ children }: { children: ReactNode }) {
  const [ontology, setOntology] = useState<Ontology | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);

  const addMapping = (mapping: Mapping) => {
    setMappings((prev) => [...prev, mapping]);
  };

  const removeMapping = (mappingId: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== mappingId));
  };

  const clearMappings = () => {
    setMappings([]);
  };

  return (
    <AppContext.Provider
      value={{
        ontology,
        setOntology,
        dataset,
        setDataset,
        mappings,
        addMapping,
        removeMapping,
        clearMappings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

