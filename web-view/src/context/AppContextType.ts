import { createContext, type Dispatch, type SetStateAction } from "react";
import type { ColorMode, Edge, Node } from "@xyflow/react";
import type { ClassRelation, Dataset, LinearTransformation, Mapping, Ontology } from "../types";

export interface AppContextType {
  activeWorkspaceId: string | null;
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  ontology: Ontology | null;
  setOntology: (ontology: Ontology | null) => void;
  dataset: Dataset | null;
  setDataset: (dataset: Dataset | null) => void;
  mappings: Mapping[];
  addMapping: (mapping: Mapping) => void;
  updateMappingProperty: (mappingId: string, targetPropertyId?: string) => void;
  updateMappingTransformation: (mappingId: string, transformation?: LinearTransformation) => void;
  removeMapping: (mappingId: string) => void;
  removeMappingsForNode: (nodeId: string) => void;
  clearMappings: () => void;
  relations: ClassRelation[];
  addRelation: (relation: ClassRelation) => void;
  updateRelationProperty: (relationId: string, propertyId?: string) => void;
  removeRelation: (relationId: string) => void;
  baseIri: string;
  setBaseIri: (baseIri: string) => void;
  flowNodes: Node[];
  flowEdges: Edge[];
  setFlowNodes: Dispatch<SetStateAction<Node[]>>;
  setFlowEdges: Dispatch<SetStateAction<Edge[]>>;
  focusedColumnId: string | null;
  setFocusedColumnId: (columnId: string | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
