import type { Edge, Node } from "@xyflow/react";
import type { Dataset, Mapping, Ontology } from "../types";
import type {
  SerializedModel,
  SerializeOptions,
  OntologyRef,
  DatasetRef,
} from "../types/serialization";
import { SERIALIZATION_VERSION } from "../types/serialization";

function extractOntologyRef(ontology: Ontology | null): OntologyRef | null {
  if (!ontology) return null;
  return {
    uri: ontology.uri,
    name: ontology.name,
  };
}

function extractDatasetRef(dataset: Dataset | null): DatasetRef | null {
  if (!dataset) return null;
  return {
    name: dataset.name,
    columnNames: dataset.columns.map((col) => col.name),
    rowCount: dataset.rows.length,
  };
}

export interface ModelData {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
  flowNodes: Node[];
  flowEdges: Edge[];
}

export function serializeModel(
  data: ModelData,
  options: SerializeOptions = {},
): SerializedModel {
  const { embedOntology = false, embedDataset = false } = options;

  const serialized: SerializedModel = {
    version: SERIALIZATION_VERSION,
    exportedAt: new Date().toISOString(),
    ontologyRef: extractOntologyRef(data.ontology),
    datasetRef: extractDatasetRef(data.dataset),
    mappings: data.mappings,
    flowNodes: data.flowNodes,
    flowEdges: data.flowEdges,
  };

  if (embedOntology) {
    serialized.ontology = data.ontology;
  }

  if (embedDataset) {
    serialized.dataset = data.dataset;
  }

  return serialized;
}

export function serializeModelToJson(
  model: SerializedModel,
  pretty = true,
): string {
  return pretty ? JSON.stringify(model, null, 2) : JSON.stringify(model);
}

export function serializeModelDataToJson(
  data: ModelData,
  options: SerializeOptions = {},
  pretty = true,
): string {
  const model = serializeModel(data, options);
  return serializeModelToJson(model, pretty);
}
