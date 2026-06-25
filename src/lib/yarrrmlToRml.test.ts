import { describe, expect, it } from "vitest";
import { yarrrmlToRml } from "./yarrrmlToRml";
import { toYarrrml } from "./yarrrml";
import type { RmlMappingDocument } from "../types/rmlMapping";

const doc: RmlMappingDocument = {
  prefixes: {
    ex: "http://ex.org/",
    xsd: "http://www.w3.org/2001/XMLSchema#",
  },
  triplesMaps: [
    {
      id: "Measurement",
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

describe("yarrrmlToRml", () => {
  it("parses generated YARRRML into RML/Turtle", async () => {
    const rml = await yarrrmlToRml(toYarrrml(doc));

    // Core RML structure morph-kgc consumes.
    expect(rml).toContain("rr:TriplesMap");
    expect(rml).toContain("rml:logicalSource");
    expect(rml).toContain("ql:CSV");
    expect(rml).toContain('rr:template "http://ex.org/meas/{MeasID}"');
    expect(rml).toContain("rr:subjectMap");
    expect(rml).toContain("rr:predicateObjectMap");
    expect(rml).toContain('rml:reference "Val"');
    expect(rml).toContain("xsd:double");
  });

  it("turns a blank-node subject into rr:termType rr:BlankNode", async () => {
    const blankDoc: RmlMappingDocument = {
      prefixes: { ex: "http://ex.org/" },
      triplesMaps: [
        {
          id: "MeasuredValue",
          logicalSource: { source: "plants.csv", referenceFormulation: "csv" },
          subject: {
            value: { kind: "template", template: "MeasuredValue_{ObsDataID}" },
            termType: "blankNode",
            classes: ["ex:MeasuredValue"],
          },
          predicateObjectMaps: [
            { predicates: ["ex:hasCode"], object: { value: { kind: "reference", column: "StdValue" } } },
          ],
        },
      ],
    };

    const rml = await yarrrmlToRml(toYarrrml(blankDoc));
    expect(rml).toContain('rr:template "MeasuredValue_{ObsDataID}"');
    expect(rml).toContain("rr:termType rr:BlankNode");
  });
});
