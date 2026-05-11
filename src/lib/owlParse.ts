import type { Ontology, OntologyClass } from "../types";

export type CreateId = () => string;

/**
 * Minimal OWL/XML class extraction for the editor prototype.
 * Falls back to one placeholder class when no `owl:Class` elements are found.
 */
export function parseOwlToOntology(
  owlContent: string,
  fileName: string,
  createId: CreateId = () => crypto.randomUUID()
): Ontology {
  const classes: OntologyClass[] = [];
  const classRegex =
    /<owl:Class rdf:about="([^"]+)"[^>]*>[\s\S]*?<\/owl:Class>/g;
  const labelRegex = /<rdfs:label[^>]*>([^<]+)<\/rdfs:label>/;

  let match;
  while ((match = classRegex.exec(owlContent)) !== null) {
    const uri = match[1];
    const classContent = match[0];
    const labelMatch = labelRegex.exec(classContent);
    const label = labelMatch
      ? labelMatch[1]
      : uri.split(/[#/]/).pop() || uri;

    classes.push({
      id: createId(),
      uri,
      label,
      properties: [],
    });
  }

  if (classes.length === 0) {
    classes.push({
      id: createId(),
      uri: "http://example.org/SampleClass",
      label: "Sample Class (no classes found in OWL)",
      properties: [],
    });
  }

  return {
    id: createId(),
    name: fileName.replace(/\.(owl|rdf|xml)$/i, ""),
    uri: `http://example.org/${fileName}`,
    classes,
  };
}
