import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "./index";

/**
 * Options for serializing the model
 */
export interface SerializeOptions {
  /** Include full ontology data (default: false, only reference is stored) */
  embedOntology?: boolean;
  /** Include full dataset data (default: false, only reference is stored) */
  embedDataset?: boolean;
}

/**
 * Reference to an ontology (lightweight, requires original file to restore)
 */
export interface OntologyRef {
  uri: string;
  name: string;
}

/**
 * Reference to a dataset (lightweight, requires original file to restore)
 */
export interface DatasetRef {
  name: string;
  /** Ordered list of column headers for structure fingerprinting */
  columnNames: string[];
  /** Optional row count to help identify dataset version */
  rowCount?: number;
}

/**
 * Serialized model format for export/import
 */
export interface SerializedModel {
  /** Schema version for future compatibility */
  version: string;
  /** ISO timestamp of export */
  exportedAt: string;

  /** Ontology reference (always included if ontology exists) */
  ontologyRef: OntologyRef | null;
  /** Dataset reference (always included if dataset exists) */
  datasetRef: DatasetRef | null;

  /** Full ontology data (optional, for portability) */
  ontology?: Ontology | null;
  /** Full dataset data (optional, for portability) */
  dataset?: Dataset | null;

  /** Column-to-class mappings */
  mappings: Mapping[];
  /** Flow nodes with positions */
  flowNodes: Node[];
  /** Flow edges (connections) */
  flowEdges: Edge[];
}

/** Current schema version */
export const SERIALIZATION_VERSION = "1.0.0";
