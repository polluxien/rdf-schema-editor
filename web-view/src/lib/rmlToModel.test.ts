import { describe, expect, it } from "vitest";
import { rmlToModel } from "./rmlToModel";
import { toYarrrml } from "./yarrrml";
import { yarrrmlToRml } from "./yarrrmlToRml";
import type { RmlMappingDocument } from "../types/rmlMapping";

const doc: RmlMappingDocument = {
  prefixes: { ex: "http://ex.org/", xsd: "http://www.w3.org/2001/XMLSchema#" },
  triplesMaps: [
    {
      id: "Observation",
      label: "Observation",
      logicalSource: { source: "plants.csv", referenceFormulation: "csv" },
      subject: {
        value: { kind: "template", template: "http://ex.org/obs/{ObsID}" },
        termType: "iri",
        classes: ["ex:Observation"],
      },
      predicateObjectMaps: [
        { predicates: ["rdfs:label"], object: { value: { kind: "reference", column: "Name" } } },
        {
          predicates: ["ex:hasMeasurement"],
          object: { value: { kind: "template", template: "http://ex.org/meas/{MeasID}" }, termType: "iri" },
        },
      ],
    },
    {
      id: "Measurement",
      label: "Measurement",
      logicalSource: { source: "plants.csv", referenceFormulation: "csv" },
      subject: {
        value: { kind: "template", template: "http://ex.org/meas/{MeasID}" },
        termType: "iri",
        classes: ["ex:Measurement"],
      },
      predicateObjectMaps: [
        {
          predicates: ["ex:value"],
          object: { value: { kind: "reference", column: "Val" }, datatype: "xsd:double" },
        },
      ],
    },
  ],
};

describe("rmlToModel — round-trip with our own export", () => {
  it("recovers the TriplesMaps, subjects, classes and predicate-objects", async () => {
    const rml = await yarrrmlToRml(toYarrrml(doc));
    const { document, warnings } = rmlToModel(rml);

    expect(warnings).toEqual([]);
    expect(document.triplesMaps).toHaveLength(2);

    const obs = document.triplesMaps.find((t) => t.label === "Observation");
    const meas = document.triplesMaps.find((t) => t.label === "Measurement");
    expect(obs).toBeDefined();
    expect(meas).toBeDefined();

    // Subject template + class (CURIEs are expanded to full IRIs after RML round-trip).
    expect(obs!.subject.value).toEqual({ kind: "template", template: "http://ex.org/obs/{ObsID}" });
    expect(obs!.subject.classes).toEqual(["http://ex.org/Observation"]);
    expect(meas!.subject.value).toEqual({ kind: "template", template: "http://ex.org/meas/{MeasID}" });

    // Literal reference mapping.
    const labelPom = obs!.predicateObjectMaps.find((p) =>
      p.predicates[0].endsWith("label"),
    );
    expect(labelPom?.object.value).toEqual({ kind: "reference", column: "Name" });

    // Class→class link reuses the target subject template as an IRI object.
    const linkPom = obs!.predicateObjectMaps.find((p) => p.predicates[0].endsWith("hasMeasurement"));
    expect(linkPom?.object.termType).toBe("iri");
    expect(linkPom?.object.value).toEqual({ kind: "template", template: "http://ex.org/meas/{MeasID}" });

    // Datatype literal.
    const valuePom = meas!.predicateObjectMaps.find((p) => p.predicates[0].endsWith("value"));
    expect(valuePom?.object.value).toEqual({ kind: "reference", column: "Val" });
    expect(valuePom?.object.datatype).toBe("http://www.w3.org/2001/XMLSchema#double");
  });
});
