import { describe, expect, it } from "vitest";
import { parseOwlToOntology } from "./owlParse";

describe("parseOwlToOntology", () => {
  it("returns an empty ontology when no rdf:RDF root is present", () => {
    const o = parseOwlToOntology("", "empty.owl");
    expect(o.classes).toHaveLength(0);
    expect(o.name).toBe("empty.owl");
  });

  it("strips common ontology file extensions from name", () => {
    const o = parseOwlToOntology(
      '<rdf:RDF><owl:Class rdf:about="http://ex.org#Person" /></rdf:RDF>',
      "MyModel.OWL",
    );
    expect(o.name).toBe("MyModel");
    const o2 = parseOwlToOntology(
      '<rdf:RDF><owl:Class rdf:about="http://ex.org#Person" /></rdf:RDF>',
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
    const o = parseOwlToOntology(`<rdf:RDF>${xml}</rdf:RDF>`, "m.owl");
    expect(o.classes[0].uri).toBe("http://ex.org#Person");
    expect(o.classes[0].label).toBe("Person Label");
  });

  it("falls back to URI fragment when label is missing", () => {
    const xml = `<owl:Class rdf:about="http://example.org/vocab#Thing"></owl:Class>`;
    const o = parseOwlToOntology(`<rdf:RDF>${xml}</rdf:RDF>`, "m.owl");
    expect(o.classes[0].label).toBe("Thing");
  });

  it("falls back to full URI when there is no fragment", () => {
    const xml = `<owl:Class rdf:about="urn:foo:bar"></owl:Class>`;
    const o = parseOwlToOntology(`<rdf:RDF>${xml}</rdf:RDF>`, "m.owl");
    expect(o.classes[0].label).toBe("urn:foo:bar");
  });

  it("extracts multiple classes in document order", () => {
    const xml = `
      <owl:Class rdf:about="http://ex.org/A"><rdfs:label>A</rdfs:label></owl:Class>
      <owl:Class rdf:about="http://ex.org/B"><rdfs:label>B</rdfs:label></owl:Class>
    `;
    const o = parseOwlToOntology(`<rdf:RDF>${xml}</rdf:RDF>`, "m.owl");
    expect(o.classes.map((c) => c.label)).toEqual(["A", "B"]);
  });
});
