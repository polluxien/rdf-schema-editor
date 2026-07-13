import { describe, expect, it } from "vitest";
import {
  getRemovedClassMappings,
  getRemovedColumnMappings,
  remapDatasetColumnIds,
} from "./relationshipDiff";
import type { Dataset, Mapping, Ontology } from "../types";

function ontologyWithClasses(ids: string[]): Ontology {
  return {
    id: "onto",
    name: "onto",
    uri: "urn:onto",
    classes: ids.map((id) => ({
      id,
      uri: id,
      label: id,
      subClassOfUris: [],
      properties: [],
    })),
    properties: [],
  };
}

function datasetWithColumns(
  columns: { id: string; name: string }[],
): Dataset {
  return {
    id: "ds",
    name: "ds",
    columns: columns.map((c) => ({ id: c.id, name: c.name, sampleValues: [] })),
    rows: [],
  };
}

describe("getRemovedClassMappings", () => {
  it("keeps mappings whose target class still exists", () => {
    const mappings: Mapping[] = [
      { id: "m1", sourceColumnId: "c1", targetClassId: "classA" },
      { id: "m2", sourceColumnId: "c2", targetClassId: "classB" },
    ];
    const reimported = ontologyWithClasses(["classA", "classB"]);
    expect(getRemovedClassMappings(mappings, reimported)).toEqual([]);
  });

  it("only drops mappings for classes that actually disappeared", () => {
    const mappings: Mapping[] = [
      { id: "m1", sourceColumnId: "c1", targetClassId: "classA" },
      { id: "m2", sourceColumnId: "c2", targetClassId: "classB" },
    ];
    const reimported = ontologyWithClasses(["classA"]); // classB removed
    expect(getRemovedClassMappings(mappings, reimported)).toEqual([mappings[1]]);
  });

  it("drops everything when the ontology is cleared", () => {
    const mappings: Mapping[] = [
      { id: "m1", sourceColumnId: "c1", targetClassId: "classA" },
    ];
    expect(getRemovedClassMappings(mappings, null)).toEqual(mappings);
  });
});

describe("getRemovedColumnMappings", () => {
  it("keeps mappings whose source column still exists", () => {
    const mappings: Mapping[] = [
      { id: "m1", sourceColumnId: "col-1", targetClassId: "classA" },
    ];
    const reimported = datasetWithColumns([{ id: "col-1", name: "Name" }]);
    expect(getRemovedColumnMappings(mappings, reimported)).toEqual([]);
  });

  it("drops mappings for columns no longer present", () => {
    const mappings: Mapping[] = [
      { id: "m1", sourceColumnId: "col-1", targetClassId: "classA" },
      { id: "m2", sourceColumnId: "col-2", targetClassId: "classB" },
    ];
    const reimported = datasetWithColumns([{ id: "col-1", name: "Name" }]);
    expect(getRemovedColumnMappings(mappings, reimported)).toEqual([mappings[1]]);
  });
});

describe("remapDatasetColumnIds", () => {
  it("reuses the previous column id when the name still matches", () => {
    const previous = datasetWithColumns([
      { id: "old-1", name: "Name" },
      { id: "old-2", name: "Age" },
    ]);
    // simulates a fresh CSV parse producing brand new random ids
    const reimported = datasetWithColumns([
      { id: "new-1", name: "Name" },
      { id: "new-2", name: "Age" },
    ]);

    const remapped = remapDatasetColumnIds(reimported, previous);

    expect(remapped.columns.map((c) => c.id)).toEqual(["old-1", "old-2"]);
  });

  it("keeps a fresh id for columns that are genuinely new", () => {
    const previous = datasetWithColumns([{ id: "old-1", name: "Name" }]);
    const reimported = datasetWithColumns([
      { id: "new-1", name: "Name" },
      { id: "new-2", name: "Email" },
    ]);

    const remapped = remapDatasetColumnIds(reimported, previous);

    expect(remapped.columns.map((c) => c.id)).toEqual(["old-1", "new-2"]);
  });

  it("is a no-op when there is no previous dataset", () => {
    const reimported = datasetWithColumns([{ id: "new-1", name: "Name" }]);
    expect(remapDatasetColumnIds(reimported, null)).toBe(reimported);
  });
});
