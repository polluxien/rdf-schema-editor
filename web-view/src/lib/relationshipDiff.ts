import type { Dataset, Mapping, Ontology } from "../types";

/** Mappings whose target class no longer exists in the (re-)imported ontology. */
export function getRemovedClassMappings(
  mappings: Mapping[],
  ontology: Ontology | null,
): Mapping[] {
  const classIds = new Set((ontology?.classes ?? []).map((c) => c.id));
  return mappings.filter((mapping) => !classIds.has(mapping.sourceId));
}

/** Mappings whose source column no longer exists in the (re-)imported dataset. */
export function getRemovedColumnMappings(
  mappings: Mapping[],
  dataset: Dataset | null,
): Mapping[] {
  const columnIds = new Set((dataset?.columns ?? []).map((c) => c.id));
  return mappings.filter((mapping) => !columnIds.has(mapping.targetId));
}

/**
 * CSV columns get a fresh random id on every parse, so a re-imported file
 * would otherwise never match its previous column nodes/mappings even when
 * nothing changed. Column names are the natural stable identity for a CSV,
 * so columns that still have the same name reuse their previous id.
 */
export function remapDatasetColumnIds(
  newDataset: Dataset,
  previous: Dataset | null,
): Dataset {
  if (!previous) return newDataset;
  const previousIdByName = new Map(
    previous.columns.map((column) => [column.name, column.id]),
  );
  return {
    ...newDataset,
    columns: newDataset.columns.map((column) => {
      const previousId = previousIdByName.get(column.name);
      return previousId ? { ...column, id: previousId } : column;
    }),
  };
}
