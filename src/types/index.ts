export interface OntologyClass {
  id: string;
  uri: string;
  label: string;
  description?: string;
  properties: OntologyProperty[];
}

export interface OntologyProperty {
  id: string;
  uri: string;
  label: string;
  description?: string;
  range?: string;
}

export interface Ontology {
  id: string;
  name: string;
  uri: string;
  classes: OntologyClass[];
}

export interface DatasetColumn {
  id: string;
  name: string;
  sampleValues: string[];
}

export interface Dataset {
  id: string;
  name: string;
  columns: DatasetColumn[];
  rows: string[][];
}

export interface Mapping {
  id: string;
  sourceColumnId: string;
  targetClassId: string;
  targetPropertyId?: string;
}

export interface AppState {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
}
