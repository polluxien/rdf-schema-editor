import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { canvasToModel, type CanvasState } from "./canvasToModel";
import { toYarrrml } from "./yarrrml";
import { yarrrmlToRml } from "./yarrrmlToRml";
import { rmlToModel } from "./rmlToModel";
import { modelToCanvas } from "./modelToCanvas";
import { NS, URI_PROPERTY } from "./rdfVocabulary";
import type { Dataset, Ontology } from "../types";
import type { RmlMappingDocument } from "../types/rmlMapping";

const ontology: Ontology = {
  id: "o",
  name: "ex",
  uri: "http://ex.org/",
  classes: [
    {
      id: "obs",
      uri: "http://ex.org/Observation",
      label: "Observation",
      subClassOfUris: [],
      properties: [
        { id: "http://ex.org/hasMeasurement", uri: "http://ex.org/hasMeasurement", type: "object" },
      ],
    },
    {
      id: "meas",
      uri: "http://ex.org/Measurement",
      label: "Measurement",
      subClassOfUris: [],
      properties: [
        {
          id: "http://ex.org/value",
          uri: "http://ex.org/value",
          type: "datatype",
          datatype: "http://www.w3.org/2001/XMLSchema#double",
        },
      ],
    },
  ],
  properties: [],
};

const dataset = {
  id: "d",
  name: "plants.csv",
  columns: [
    { id: "c-obs", name: "ObsID", sampleValues: ["1"] },
    { id: "c-meas", name: "MeasID", sampleValues: ["9"] },
    { id: "c-name", name: "Name", sampleValues: ["x"] },
    { id: "c-val", name: "Val", sampleValues: ["12.5"] },
  ],
  rows: [],
};

const classNode = (id: string, uri: string, label: string): Node => ({
  id: `class-${id}`,
  type: "ontologyClass",
  position: { x: 0, y: 0 },
  data: { label, uri },
});

const canvasState: CanvasState = {
  ontology,
  dataset,
  baseIri: "http://example.org",
  flowNodes: [
    classNode("obs", "http://ex.org/Observation", "Observation"),
    classNode("meas", "http://ex.org/Measurement", "Measurement"),
  ],
  mappings: [
    { id: "m1", sourceId: "obs", targetId: "c-obs", propertyId: URI_PROPERTY.id },
    { id: "m2", sourceId: "obs", targetId: "c-name", propertyId: NS.rdfs + "label" },
    { id: "m3", sourceId: "meas", targetId: "c-meas", propertyId: URI_PROPERTY.id },
    { id: "m4", sourceId: "meas", targetId: "c-val", propertyId: "http://ex.org/value" },
  ],
  relations: [
    { id: "r1", sourceClassId: "obs", targetClassId: "meas", propertyId: "http://ex.org/hasMeasurement" },
  ],
};

describe("modelToCanvas — full Canvas → RML → Canvas round-trip", () => {
  it("reconstructs classes, columns, subject mappings, value mappings and relations", async () => {
    const model = canvasToModel(canvasState).document;
    const rml = await yarrrmlToRml(toYarrrml(model));
    const parsed = rmlToModel(rml).document;
    const { data, warnings } = modelToCanvas(parsed);

    expect(warnings).toEqual([]);

    const colName = (id: string) => data.dataset.columns.find((c) => c.id === id)?.name;
    const classUri = (id: string) => data.ontology.classes.find((c) => c.id === id)?.uri;
    const prop = (id?: string) => data.ontology.properties.find((p) => p.id === id);

    // Classes + columns reconstructed.
    expect(data.ontology.classes.map((c) => c.uri).sort()).toEqual([
      "http://ex.org/Measurement",
      "http://ex.org/Observation",
    ]);
    expect(data.dataset.columns.map((c) => c.name).sort()).toEqual(["MeasID", "Name", "ObsID", "Val"]);
    expect(data.baseIri).toBe("http://example.org");

    // Two "uri" subject mappings → ObsID and MeasID.
    const uriMappings = data.mappings.filter((m) => m.propertyId === URI_PROPERTY.id);
    expect(uriMappings.map((m) => colName(m.targetId)).sort()).toEqual(["MeasID", "ObsID"]);

    // Label (annotation) mapping on the Name column. rdfs:label resolves to the
    // built-in standard property, so its id is the rdfs:label IRI itself.
    const nameMapping = data.mappings.find((m) => colName(m.targetId) === "Name");
    expect(nameMapping?.propertyId).toContain("label");

    // Datatype value mapping on Val.
    const valMapping = data.mappings.find((m) => colName(m.targetId) === "Val");
    expect(prop(valMapping?.propertyId)?.type).toBe("datatype");
    expect(prop(valMapping?.propertyId)?.datatype).toContain("double");

    // One class→class relation Observation → Measurement via hasMeasurement.
    expect(data.relations).toHaveLength(1);
    const rel = data.relations[0];
    expect(classUri(rel.sourceClassId)).toContain("Observation");
    expect(classUri(rel.targetClassId)).toContain("Measurement");
    expect(prop(rel.propertyId)?.uri).toContain("hasMeasurement");

    // Nodes + edges: 2 classes, 4 columns, one edge per mapping/relation.
    expect(data.flowNodes.filter((n) => n.type === "ontologyClass")).toHaveLength(2);
    expect(data.flowNodes.filter((n) => n.type === "datasetColumn")).toHaveLength(4);
    expect(data.flowEdges).toHaveLength(data.mappings.length + data.relations.length);
  });
});

describe("modelToCanvas — merge onto loaded ontology + dataset (mode B)", () => {
  const parsed: RmlMappingDocument = {
    prefixes: {},
    triplesMaps: [
      {
        id: "Observation",
        label: "Observation",
        logicalSource: { source: "x.csv", referenceFormulation: "csv" },
        subject: {
          value: { kind: "template", template: "http://example.org/{ObsID}" },
          termType: "iri",
          classes: ["http://ex.org/Observation"],
        },
        predicateObjectMaps: [
          {
            predicates: [NS.rdfs + "label"],
            object: { value: { kind: "reference", column: "Name" }, termType: "literal" },
          },
        ],
      },
    ],
  };

  const ctxOntology: Ontology = {
    id: "o",
    name: "ex",
    uri: "http://ex.org/",
    classes: [
      { id: "obs-existing", uri: "http://ex.org/Observation", label: "My Observation", subClassOfUris: [], properties: [] },
      { id: "foo", uri: "http://ex.org/Foo", label: "Foo", subClassOfUris: [], properties: [] },
    ],
    properties: [],
  };
  const ctxDataset: Dataset = {
    id: "d",
    name: "real.csv",
    columns: [
      { id: "col-obsid", name: "ObsID", sampleValues: ["42"] },
      { id: "col-extra", name: "Extra", sampleValues: ["z"] },
    ],
    rows: [],
  };

  it("reuses existing class/column ids, labels and sample values", () => {
    const { data } = modelToCanvas(parsed, { ontology: ctxOntology, dataset: ctxDataset });

    // Existing class reused by URI (id + label preserved).
    const obs = data.ontology.classes.find((c) => c.uri === "http://ex.org/Observation");
    expect(obs?.id).toBe("obs-existing");
    expect(obs?.label).toBe("My Observation");
    // Full loaded ontology kept (unused classes remain available).
    expect(data.ontology.classes.some((c) => c.id === "foo")).toBe(true);

    // Existing column reused by name, sample values preserved on the node.
    const uriMapping = data.mappings.find((m) => m.propertyId === URI_PROPERTY.id);
    expect(uriMapping?.sourceId).toBe("obs-existing");
    expect(uriMapping?.targetId).toBe("col-obsid");
    const colNode = data.flowNodes.find((n) => n.id === "column-col-obsid");
    expect((colNode?.data as { sampleValues: string[] }).sampleValues).toEqual(["42"]);

    // Loaded dataset kept (name + unused column remain).
    expect(data.dataset.name).toBe("real.csv");
    expect(data.dataset.columns.some((c) => c.name === "Extra")).toBe(true);
  });
});
