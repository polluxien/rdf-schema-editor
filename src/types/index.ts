export interface OntologyProperty {
  id: string;
  uri: string;
  label?: string;
  type: "object" | "datatype";
  domainUri?: string;
  rangeUri?: string;
  comment?: string;
}

export interface OntologyClass {
  id: string;
  uri: string;
  label: string;
  subClassOfUris: string[];
  properties: OntologyProperty[];
}

export interface Ontology {
  id: string;
  name: string;
  uri: string;
  classes: OntologyClass[];
  properties: OntologyProperty[];
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
