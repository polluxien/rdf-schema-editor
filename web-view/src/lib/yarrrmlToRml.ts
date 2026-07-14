/**
 * Parses YARRRML into RML/Turtle — the second half of the
 * Canvas → YARRRML → RML pipeline. Uses the official @rmlio/yarrrml-parser
 * generator (YARRRML string → N3 quads) and serializes the quads to Turtle
 * with n3. RML/Turtle is the artifact the rdf_transform service consumes.
 *
 * Runs fully in the browser: the generator module pulls in only yamljs + n3,
 * no Node `fs`/CLI dependencies (those live in the package's watcher/CLI, which
 * we don't import).
 */
import RMLGenerator from "@rmlio/yarrrml-parser/lib/rml-generator.js";
import { Writer } from "n3";

/** Common RML namespaces, so the emitted Turtle uses readable prefixes. */
const RML_PREFIXES: Record<string, string> = {
  rml: "http://semweb.mmlab.be/ns/rml#",
  rr: "http://www.w3.org/ns/r2rml#",
  ql: "http://semweb.mmlab.be/ns/ql#",
  fnml: "http://semweb.mmlab.be/ns/fnml#",
  fno: "https://w3id.org/function/ontology#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/**
 * Convert a YARRRML mapping to RML serialized as Turtle.
 * @param yarrrml      the YARRRML document
 * @param extraPrefixes additional prefixes (e.g. the ontology namespaces) for
 *                      nicer output
 */
export function yarrrmlToRml(
  yarrrml: string,
  extraPrefixes: Record<string, string> = {},
): Promise<string> {
  const generator = new RMLGenerator();
  const quads = generator.convert(yarrrml);

  return new Promise((resolve, reject) => {
    const writer = new Writer({ prefixes: { ...RML_PREFIXES, ...extraPrefixes } });
    writer.addQuads(quads);
    writer.end((error: Error | null, result: string) => (error ? reject(error) : resolve(result)));
  });
}
