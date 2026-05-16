import { createContext } from "react";
import type { Ontology, Dataset, Mapping } from "../types";

export interface AppContextType {
  ontology: Ontology;
  setOntology: (ontology: Ontology) => void;
  dataset: Dataset | null;
  setDataset: (dataset: Dataset) => void;
  mappings: Mapping[];
  addMapping: (mapping: Mapping) => void;
  removeMapping: (mappingId: string) => void;
  clearMappings: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
