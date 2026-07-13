import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { canvasToModel, type CanvasState } from "./canvasToModel";
import { toYarrrml } from "./yarrrml";
import { URI_PROPERTY } from "./rdfVocabulary";
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
    { id: "c-iri", name: "ObsIRI", sampleValues: ["http://ex.org/obs/1"] },
  ],
  rows: [],
};

const classNode = (classId: string): Node => ({
  id: `class-${classId}`,
  type: "ontologyClass",
  position: { x: 0, y: 0 },
  data: {},
});

/** A subject-designating mapping: class → column via the special "uri" property. */
const uriMapping = (id: string, columnId: string, classId: string) => ({
  id,
  sourceId: classId,
  targetId: columnId,
  propertyId: URI_PROPERTY.id,
});

const baseState: CanvasState = {
  ontology,
  dataset,
  baseIri: "http://ex.org",
  flowNodes: [classNode("obs"), classNode("meas")],
  mappings: [
    uriMapping("u-obs", "c-obs", "obs"),
    uriMapping("u-meas", "c-meas", "meas"),
    { id: "m1", sourceId: "meas", targetId: "c-val", propertyId: "http://ex.org/value" },
  ],
  relations: [
    { id: "r1", sourceClassId: "obs", targetClassId: "meas", propertyId: "http://ex.org/hasMeasurement" },
  ],
};

describe("canvasToModel — uri-property subjects", () => {
  const { document, warnings } = canvasToModel(baseState);

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

  it("builds the subject IRI as baseIri + the uri column (local id)", () => {
    const yaml = toYarrrml(document);
    expect(yaml).toContain("s: http://ex.org/$(ObsID)");
    expect(yaml).toContain("s: http://ex.org/$(MeasID)");
  });

  it("does not emit the uri mapping as a predicate-object pair", () => {
    const yaml = toYarrrml(document);
    expect(yaml).not.toContain("22-rdf-syntax-ns#type");
  });

  it("reuses the target class's subject term for a class→class link", () => {
    const yaml = toYarrrml(document);
    expect(yaml).toContain("[ns1:hasMeasurement, http://ex.org/$(MeasID)~iri]");
  });

  it("emits a datatype literal for a datatype property mapping", () => {
    const yaml = toYarrrml(document);
    expect(yaml).toContain("[ns1:value, $(Val), xsd:double]");
  });

  it("references a uri column directly when its values are already full IRIs", () => {
    const state: CanvasState = {
      ...baseState,
      mappings: [
        uriMapping("u-obs", "c-iri", "obs"),
        uriMapping("u-meas", "c-meas", "meas"),
      ],
      relations: [],
    };
    const yaml = toYarrrml(canvasToModel(state).document);
    expect(yaml).toContain("s: $(ObsIRI)");
    expect(yaml).not.toContain("http://ex.org/$(ObsIRI)");
  });

  it("falls back to a blank node keyed by the first mapped column when no uri property", () => {
    const state: CanvasState = {
      ...baseState,
      mappings: [
        { id: "m1", sourceId: "meas", targetId: "c-val", propertyId: "http://ex.org/value" },
      ],
      flowNodes: [classNode("meas")],
      relations: [],
    };
    const result = canvasToModel(state);
    expect(result.warnings).toEqual([]);
    const yaml = toYarrrml(result.document);
    expect(yaml).toContain("- value: Measurement_$(Val)");
    expect(yaml).toContain("type: blank");
  });

  it("includes the parent uri-column in the blank-node template when the class has an incoming relation", () => {
    // meas has NO uri property → blank node.
    // obs links to meas via hasMeasurement and HAS a uri property (ObsID).
    // The blank-node key should be Measurement_{Val}_{ObsID} so that two rows
    // with the same Val but different ObsID still get distinct blank nodes.
    const state: CanvasState = {
      ...baseState,
      mappings: [
        uriMapping("u-obs", "c-obs", "obs"),
        { id: "m1", sourceId: "meas", targetId: "c-val", propertyId: "http://ex.org/value" },
      ],
      flowNodes: [classNode("obs"), classNode("meas")],
      relations: [
        { id: "r1", sourceClassId: "obs", targetClassId: "meas", propertyId: "http://ex.org/hasMeasurement" },
      ],
    };
    const { document, warnings } = canvasToModel(state);
    expect(warnings).toEqual([]);
    const yaml = toYarrrml(document);
    // Blank node template must include both the class's own column (Val) and the
    // parent's uri-column (ObsID).
    expect(yaml).toContain("- value: Measurement_$(Val)_$(ObsID)");
    expect(yaml).toContain("type: blank");
    // The Observation's hasMeasurement link must use the identical template so
    // it resolves to the same blank node as the MeasuredValue subject.
    expect(yaml).toContain("Measurement_$(Val)_$(ObsID)");
  });

  it("warns when a class has neither a uri property nor any mapped column", () => {
    const state: CanvasState = {
      ...baseState,
      mappings: [],
      relations: [],
      flowNodes: [classNode("obs")],
    };
    const result = canvasToModel(state);
    expect(result.warnings.some((w) => w.includes("Observation"))).toBe(true);
  });
});

describe("canvasToModel — linear transformation", () => {
  const stateWithTransform: CanvasState = {
    ...baseState,
    mappings: [
      uriMapping("u-obs", "c-obs", "obs"),
      uriMapping("u-meas", "c-meas", "meas"),
      {
        id: "m1",
        sourceId: "meas",
        targetId: "c-val",
        propertyId: "http://ex.org/value",
        transformation: { label: "Inches → cm", factor: 2.54, offset: 0 },
      },
    ],
    flowNodes: [classNode("obs"), classNode("meas")],
    relations: [],
  };

  it("wraps the column reference in a FunctionCall when a transformation is set", () => {
    const { document, warnings } = canvasToModel(stateWithTransform);
    expect(warnings).toEqual([]);
    const measMap = document.triplesMaps.find((t) => t.id === "Measurement")!;
    const pom = measMap.predicateObjectMaps[0];
    expect(pom.object.value.kind).toBe("function");
    if (pom.object.value.kind !== "function") return;
    expect(pom.object.value.fn.fn).toContain("linearTransform");
    const params = pom.object.value.fn.parameters;
    const inputParam = params.find((p) => p.parameter.includes("inputValue"));
    const factorParam = params.find((p) => p.parameter.includes("factor"));
    const offsetParam = params.find((p) => p.parameter.includes("offset"));
    expect(inputParam?.value).toEqual({ kind: "reference", column: "Val" });
    expect(factorParam?.value).toEqual({ kind: "constant", value: "2.54" });
    expect(offsetParam?.value).toEqual({ kind: "constant", value: "0" });
  });

  it("serializes the FunctionCall correctly in YARRRML", () => {
    const { document } = canvasToModel(stateWithTransform);
    const yaml = toYarrrml(document);
    expect(yaml).toContain("function:");
    expect(yaml).toContain("linearTransform");
    expect(yaml).toContain("inputValue");
    expect(yaml).toContain("$(Val)");
    expect(yaml).toContain("2.54");
  });

  it("emits a plain reference when no transformation is set", () => {
    const { document } = canvasToModel(baseState);
    const measMap = document.triplesMaps.find((t) => t.id === "Measurement")!;
    const pom = measMap.predicateObjectMaps[0];
    expect(pom.object.value.kind).toBe("reference");
  });
});
