import { describe, expect, it } from "vitest";
import { parseOwlToOntology } from "./owlParse";

function seqIds(prefix = "id") {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

describe("parseOwlToOntology", () => {
  it("returns placeholder class when no owl:Class is present", () => {
    const o = parseOwlToOntology("", "empty.owl", seqIds());
    expect(o.classes).toHaveLength(1);
    expect(o.classes[0].label).toContain("no classes found");
    expect(o.name).toBe("empty");
  });

  it("strips common ontology file extensions from name", () => {
    const o = parseOwlToOntology("", "MyModel.OWL", seqIds());
    expect(o.name).toBe("MyModel");
    const o2 = parseOwlToOntology("", "data.rdf", seqIds());
    expect(o2.name).toBe("data");
  });

  it("reads rdfs:label when present", () => {
    const xml = `
      <owl:Class rdf:about="http://ex.org#Person">
        <rdfs:label>Person Label</rdfs:label>
      </owl:Class>
    `;
    const o = parseOwlToOntology(xml, "m.owl", seqIds());
    expect(o.classes[0].uri).toBe("http://ex.org#Person");
    expect(o.classes[0].label).toBe("Person Label");
  });

  it("falls back to URI fragment when label is missing", () => {
    const xml = `<owl:Class rdf:about="http://example.org/vocab#Thing"></owl:Class>`;
    const o = parseOwlToOntology(xml, "m.owl", seqIds());
    expect(o.classes[0].label).toBe("Thing");
  });

  it("falls back to full URI when there is no fragment", () => {
    const xml = `<owl:Class rdf:about="urn:foo:bar"></owl:Class>`;
    const o = parseOwlToOntology(xml, "m.owl", seqIds());
    expect(o.classes[0].label).toBe("urn:foo:bar");
  });

  it("extracts multiple classes in document order", () => {
    const xml = `
      <owl:Class rdf:about="http://ex.org/A"><rdfs:label>A</rdfs:label></owl:Class>
      <owl:Class rdf:about="http://ex.org/B"><rdfs:label>B</rdfs:label></owl:Class>
    `;
    const o = parseOwlToOntology(xml, "m.owl", seqIds());
    expect(o.classes.map((c) => c.label)).toEqual(["A", "B"]);
  });
});
