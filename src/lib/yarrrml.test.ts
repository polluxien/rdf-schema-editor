import { describe, expect, it } from "vitest";
import { toYarrrml } from "./yarrrml";
import type { RmlMappingDocument } from "../types/rmlMapping";

const SOURCE = "plant_height_vegetative_raw_germany_20.json";

/** JSONPath logical source shared by every TriplesMap in the example. */
const logicalSource = {
  source: SOURCE,
  referenceFormulation: "jsonpath" as const,
  iterator: "$[*]",
};

/** concat("http://qudt.org/vocab/unit/", toUpperCase($(UnitName))) — the QUDT unit IRI. */
const qudtUnitIri = {
  kind: "function" as const,
  fn: {
    fn: "builtin:concat",
    parameters: [
      {
        parameter: "grel:valueParameter1",
        value: { kind: "constant" as const, value: "http://qudt.org/vocab/unit/" },
      },
      {
        parameter: "grel:valueParameter2",
        value: {
          kind: "function" as const,
          fn: {
            fn: "grel:toUpperCase",
            parameters: [
              { parameter: "grel:valueParameter", value: { kind: "reference" as const, column: "UnitName" } },
            ],
          },
        },
      },
    ],
  },
};

/**
 * Re-implementation of plant_height_vegetative_raw-model_oboe.rml.ttl as our
 * mapping model. This is the golden input for the YARRRML serializer.
 */
const exampleDoc: RmlMappingDocument = {
  prefixes: {
    grel: "http://users.ugent.be/~bjdmeest/function/grel.ttl#",
    builtin: "https://github.com/morph-kgc/morph-kgc/function/built-in.ttl#",
    oboe: "http://ecoinformatics.org/oboe/oboe.1.2/oboe-core.owl#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  },
  triplesMaps: [
    {
      id: "ObservationCollection",
      logicalSource,
      subject: {
        value: { kind: "template", template: "http://ecoinformatics.org/oboe/data/{DatasetID}" },
        classes: ["oboe:ObservationCollection"],
      },
      predicateObjectMaps: [
        { predicates: ["rdfs:label"], object: { value: { kind: "reference", column: "Dataset" } } },
        {
          predicates: ["oboe:hasMember"],
          object: {
            value: { kind: "template", template: "http://ecoinformatics.org/oboe/data/{ObservationID}" },
            termType: "iri",
          },
        },
      ],
    },
    {
      id: "Observation",
      logicalSource,
      subject: {
        value: { kind: "template", template: "http://ecoinformatics.org/oboe/data/{ObservationID}" },
        classes: ["oboe:Observation"],
      },
      predicateObjectMaps: [
        {
          predicates: ["oboe:hasMeasurement"],
          object: {
            value: { kind: "template", template: "http://ecoinformatics.org/oboe/data/{ObsDataID}" },
            termType: "iri",
          },
        },
        {
          predicates: ["oboe:ofEntity"],
          object: {
            value: { kind: "template", template: "http://www.catalogueoflife.org/data/taxon/{TaxonID}" },
            termType: "iri",
          },
        },
      ],
    },
    {
      id: "Measurement",
      logicalSource,
      subject: {
        value: { kind: "template", template: "http://ecoinformatics.org/oboe/data/{ObsDataID}" },
        classes: ["oboe:Measurement"],
      },
      predicateObjectMaps: [
        // TraitID is already a full IRI → reference as IRI, not template.
        {
          predicates: ["oboe:ofCharacteristic"],
          object: { value: { kind: "reference", column: "TraitID" }, termType: "iri" },
        },
        { predicates: ["oboe:usesStandard"], object: { value: qudtUnitIri, termType: "iri" } },
        {
          predicates: ["oboe:hasValue"],
          object: { value: { kind: "template", template: "MeasuredValue_{ObsDataID}" }, termType: "blankNode" },
        },
      ],
    },
    {
      id: "MeasuredValue",
      logicalSource,
      subject: {
        value: { kind: "template", template: "MeasuredValue_{ObsDataID}" },
        termType: "blankNode",
        classes: ["oboe:MeasuredValue"],
      },
      predicateObjectMaps: [
        { predicates: ["oboe:hasCode"], object: { value: { kind: "reference", column: "StdValue" } } },
      ],
    },
    {
      id: "Characteristic",
      logicalSource,
      subject: {
        value: { kind: "reference", column: "TraitID" },
        termType: "iri",
        classes: ["oboe:Characteristic"],
      },
      predicateObjectMaps: [
        { predicates: ["rdfs:label"], object: { value: { kind: "reference", column: "TraitName" } } },
      ],
    },
    {
      id: "Unit",
      logicalSource,
      subject: { value: qudtUnitIri, classes: ["oboe:Unit"] },
      predicateObjectMaps: [],
    },
    {
      id: "Entity",
      logicalSource,
      subject: {
        value: { kind: "template", template: "http://www.catalogueoflife.org/data/taxon/{TaxonID}" },
        classes: ["oboe:Entity"],
      },
      predicateObjectMaps: [
        { predicates: ["rdfs:label"], object: { value: { kind: "reference", column: "AccSpeciesName" } } },
      ],
    },
  ],
};

describe("toYarrrml — OBOE plant-height example", () => {
  const yaml = toYarrrml(exampleDoc);

  it("emits prefixes and all seven mappings", () => {
    expect(yaml).toContain("oboe: http://ecoinformatics.org/oboe/oboe.1.2/oboe-core.owl#");
    for (const id of [
      "ObservationCollection",
      "Observation",
      "Measurement",
      "MeasuredValue",
      "Characteristic",
      "Unit",
      "Entity",
    ]) {
      expect(yaml).toContain(`${id}:`);
    }
  });

  it("emits the JSONPath logical source with iterator", () => {
    expect(yaml).toContain(`sources:\n      - ['${SOURCE}~jsonpath', '$[*]']`);
  });

  it("converts {Column} templates to $(Column) and tags resource links as IRIs", () => {
    expect(yaml).toContain("s: http://ecoinformatics.org/oboe/data/$(DatasetID)");
    expect(yaml).toContain("[oboe:hasMember, http://ecoinformatics.org/oboe/data/$(ObservationID)~iri]");
  });

  it("emits a literal label reference without a type suffix", () => {
    expect(yaml).toContain("[rdfs:label, $(Dataset)]");
  });

  it("emits an already-IRI column reference with ~iri", () => {
    expect(yaml).toContain("[oboe:ofCharacteristic, $(TraitID)~iri]");
  });

  it("emits the nested concat(toUpperCase) function for the QUDT unit IRI", () => {
    expect(yaml).toContain("function: builtin:concat");
    expect(yaml).toContain("[grel:valueParameter1, http://qudt.org/vocab/unit/]");
    expect(yaml).toContain("- parameter: grel:valueParameter2");
    expect(yaml).toContain("function: grel:toUpperCase");
    expect(yaml).toContain("[grel:valueParameter, $(UnitName)]");
  });

  it("emits blank nodes via the expanded type: blank form (no ~blanknode suffix)", () => {
    expect(yaml).toContain("- value: MeasuredValue_$(ObsDataID)");
    expect(yaml).toContain("type: blank");
    expect(yaml).not.toContain("~blanknode");
  });

  it("is stable (golden snapshot)", () => {
    expect(yaml).toMatchSnapshot();
  });
});
