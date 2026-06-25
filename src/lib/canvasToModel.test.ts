import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { canvasToModel, type CanvasState } from "./canvasToModel";
import { toYarrrml } from "./yarrrml";
import type { Ontology } from "../types";

const XSD_DOUBLE = "http://www.w3.org/2001/XMLSchema#double";

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
        {
          id: "http://ex.org/hasMeasurement",
          uri: "http://ex.org/hasMeasurement",
          type: "object",
          rangeUris: ["http://ex.org/Measurement"],
        },
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
          datatype: XSD_DOUBLE,
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
    { id: "c-val", name: "Val", sampleValues: ["12.5"] },
  ],
  rows: [],
};

const classNode = (classId: string, template: string): Node => ({
  id: `class-${classId}`,
  type: "ontologyClass",
  position: { x: 0, y: 0 },
  data: { subject: { mode: "template", template } },
});

const state: CanvasState = {
  ontology,
  dataset,
  flowNodes: [
    classNode("obs", "http://ex.org/obs/{ObsID}"),
    classNode("meas", "http://ex.org/meas/{MeasID}"),
  ],
  mappings: [
    { id: "m1", sourceColumnId: "c-val", targetClassId: "meas", targetPropertyId: "http://ex.org/value" },
  ],
  relations: [
    { id: "r1", sourceClassId: "obs", targetClassId: "meas", propertyId: "http://ex.org/hasMeasurement" },
  ],
};

describe("canvasToModel", () => {
  const { document, warnings } = canvasToModel(state);

  it("produces one TriplesMap per class node, with no warnings", () => {
    expect(warnings).toEqual([]);
    expect(document.triplesMaps.map((t) => t.id)).toEqual(["Observation", "Measurement"]);
  });

  it("derives the logical source from the dataset", () => {
    expect(document.triplesMaps[0].logicalSource).toEqual({
      source: "plants.csv",
      referenceFormulation: "csv",
    });
  });

  it("reuses the target class's subject term for a class→class link", () => {
    const yaml = toYarrrml(document);
    // Observation.hasMeasurement → Measurement's subject template, as an IRI.
    expect(yaml).toContain("[ns1:hasMeasurement, http://ex.org/meas/$(MeasID)~iri]");
  });

  it("emits a datatype literal for a datatype property mapping", () => {
    const yaml = toYarrrml(document);
    expect(yaml).toContain("[ns1:value, $(Val), xsd:double]");
  });

  it("warns when a class node has no subject", () => {
    const noSubject: CanvasState = {
      ...state,
      flowNodes: [{ ...classNode("obs", ""), data: {} }, classNode("meas", "http://ex.org/meas/{MeasID}")],
    };
    const result = canvasToModel(noSubject);
    expect(result.warnings.some((w) => w.includes("Observation"))).toBe(true);
    expect(result.document.triplesMaps.map((t) => t.id)).toEqual(["Measurement"]);
  });
});
