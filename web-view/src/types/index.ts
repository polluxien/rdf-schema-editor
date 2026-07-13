export interface OntologyProperty {
  id: string;
  uri: string;
  label?: string;
  type: "object" | "datatype" | "annotation";
  domainUri?: string;
  rangeUri?: string;
  domainUris?: string[];
  rangeUris?: string[];
  subPropertyOfUris?: string[];
  inverseOfUri?: string;
  characteristics?: string[];
  datatype?: string;
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

/**
 * A linear unit / value transformation applied to a column value before it is
 * mapped to an RDF literal: `output = factor * input + offset`.
 */
export interface LinearTransformation {
  /** Human-readable conversion name, e.g. "Inches → cm". `undefined` = custom. */
  label?: string;
  /** Multiplicative factor (a in y = a·x + b). */
  factor: number;
  /** Additive offset (b in y = a·x + b). */
  offset: number;
}

export interface Mapping {
  id: string;
  sourceId: string;
  targetId: string;
  propertyId?: string;
  /** Optional linear transformation applied to the column value at export time. */
  transformation?: LinearTransformation;
}

/**
 * How a class node's RDF subject (IRI / blank node) is built. Captured on the
 * class node so the mapping builder can read a real subject instead of guessing.
 *   - template:  an IRI built from a string with {Column} placeholders
 *   - column:    a column whose value is already a full IRI
 *   - blankNode: a blank node, optionally keyed by a {Column} template for
 *                stable identity across triples maps
 */
export interface ClassSubject {
  mode: "template" | "column" | "blankNode";
  /** IRI template with {Column} placeholders (mode "template" / "blankNode"). */
  template?: string;
  /** Column name whose value is already an IRI (mode "column"). */
  column?: string;
}

/**
 * An object-property link between two class nodes (class → class edge). Becomes
 * a predicate-object map on the source class's TriplesMap whose object is the
 * target class's subject.
 */
export interface ClassRelation {
  id: string;
  sourceClassId: string;
  targetClassId: string;
  /** The object property used as predicate (OntologyProperty id). */
  propertyId?: string;
}

export interface AppState {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
}
