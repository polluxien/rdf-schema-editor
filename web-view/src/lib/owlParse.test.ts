import { describe, expect, it } from "vitest";
import { parseOwlToOntology } from "./owlParse";

function rdf(xml: string): string {
  return `
    <rdf:RDF
      xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
      xmlns:owl="http://www.w3.org/2002/07/owl#">
      ${xml}
    </rdf:RDF>
  `;
}

describe("parseOwlToOntology", () => {
  it("returns an empty ontology when no rdf:RDF root is present", () => {
    const o = parseOwlToOntology("", "empty.owl");
    expect(o.classes).toHaveLength(0);
    expect(o.name).toBe("empty.owl");
  });

  it("strips common ontology file extensions from name", () => {
    const o = parseOwlToOntology(
      rdf('<owl:Class rdf:about="http://ex.org#Person" />'),
      "MyModel.OWL",
    );
    expect(o.name).toBe("MyModel");
    const o2 = parseOwlToOntology(
      rdf('<owl:Class rdf:about="http://ex.org#Person" />'),
      "data.rdf",
    );
    expect(o2.name).toBe("data");
  });

  it("reads rdfs:label when present", () => {
    const xml = `
      <owl:Class rdf:about="http://ex.org#Person">
        <rdfs:label>Person Label</rdfs:label>
      </owl:Class>
    `;
    const o = parseOwlToOntology(rdf(xml), "m.owl");
    expect(o.classes[0].uri).toBe("http://ex.org#Person");
    expect(o.classes[0].label).toBe("Person Label");
  });

  it("falls back to URI fragment when label is missing", () => {
    const xml = `<owl:Class rdf:about="http://example.org/vocab#Thing"></owl:Class>`;
    const o = parseOwlToOntology(rdf(xml), "m.owl");
    expect(o.classes[0].label).toBe("Thing");
  });

  it("falls back to full URI when there is no fragment", () => {
    const xml = `<owl:Class rdf:about="urn:foo:bar"></owl:Class>`;
    const o = parseOwlToOntology(rdf(xml), "m.owl");
    expect(o.classes[0].label).toBe("urn:foo:bar");
  });

  it("extracts multiple classes in document order", () => {
    const xml = `
      <owl:Class rdf:about="http://ex.org/A"><rdfs:label>A</rdfs:label></owl:Class>
      <owl:Class rdf:about="http://ex.org/B"><rdfs:label>B</rdfs:label></owl:Class>
    `;
    const o = parseOwlToOntology(rdf(xml), "m.owl");
    expect(o.classes.map((c) => c.label)).toEqual(["A", "B"]);
  });

  it("extracts object, datatype, and annotation properties with assigned types", () => {
    const xml = `
      <owl:ObjectProperty rdf:about="http://ex.org#knows">
        <rdfs:domain rdf:resource="http://ex.org#Person" />
        <rdfs:range rdf:resource="http://ex.org#Person" />
      </owl:ObjectProperty>
      <rdf:Description rdf:about="http://ex.org#age">
        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#DatatypeProperty" />
        <rdfs:domain rdf:resource="http://ex.org#Person" />
        <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#integer" />
      </rdf:Description>
      <owl:AnnotationProperty rdf:about="http://ex.org#source" />
      <owl:Class rdf:about="http://ex.org#Person" />
    `;
    const o = parseOwlToOntology(rdf(xml), "m.owl");

    expect(
      o.properties
        .map((property) => [property.uri, property.type])
        .sort(([left], [right]) => left.localeCompare(right)),
    ).toEqual([
      ["http://ex.org#age", "datatype"],
      ["http://ex.org#knows", "object"],
      ["http://ex.org#source", "annotation"],
    ]);
    expect(o.classes[0].properties.map((property) => property.uri)).toEqual([
      "http://ex.org#knows",
      "http://ex.org#age",
    ]);
    expect(o.properties.find((property) => property.uri.endsWith("#age"))?.datatype).toBe(
      "integer",
    );
  });

  it("keeps multiple domains and assigns the same property to all matching classes", () => {
    const xml = `
      <owl:Class rdf:about="http://ex.org#Person" />
      <owl:Class rdf:about="http://ex.org#Organization" />
      <owl:ObjectProperty rdf:about="http://ex.org#name">
        <rdfs:domain rdf:resource="http://ex.org#Person" />
        <rdfs:domain rdf:resource="http://ex.org#Organization" />
        <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#string" />
      </owl:ObjectProperty>
    `;
    const o = parseOwlToOntology(rdf(xml), "m.owl");
    const property = o.properties[0];

    expect(property.domainUris).toEqual([
      "http://ex.org#Person",
      "http://ex.org#Organization",
    ]);
    expect(o.classes.map((cls) => cls.properties.map((prop) => prop.uri))).toEqual([
      ["http://ex.org#name"],
      ["http://ex.org#name"],
    ]);
  });
});
