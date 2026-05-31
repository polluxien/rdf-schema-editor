import { XMLParser } from "fast-xml-parser";
import type { Ontology, OntologyClass, OntologyProperty } from "../types";

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Extrahiert einen RDF-URI aus einem geparsten Knoten. */
function extractUri(node: unknown): string | undefined {
  if (!node) return undefined;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const uri = extractUri(item);
      if (uri) return uri;
    }
    return undefined;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    return (obj["@_rdf:resource"] ?? obj["@_rdf:about"]) as string | undefined;
  }
  return undefined;
}

/** Extrahiert einen RDF-Literal-String (rdfs:label, rdfs:comment …). */
function extractLiteral(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return extractLiteral(node[0]);
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    return String(obj["#text"] ?? "");
  }
  return "";
}

/** Normalisiert einen Wert immer zu einem Array. */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// ── Hauptfunktion ────────────────────────────────────────────────────────────

export function parseOwlToOntology(
  owlContent: string,
  fileName: string,
): Ontology {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: true,
    isArray: (tagName) =>
      [
        "owl:Class",
        "owl:ObjectProperty",
        "owl:DatatypeProperty",
        "rdfs:subClassOf",
        "rdfs:label",
        "rdfs:comment",
        "rdfs:domain",
        "rdfs:range",
      ].includes(tagName),
  });

  const json = parser.parse(owlContent);
  const rdf = json["rdf:RDF"];

  if (!rdf) {
    console.error("Kein rdf:RDF Root gefunden!");
    return {
      id: fileName,
      name: fileName,
      uri: "",
      classes: [],
      properties: [],
    };
  }

  // ── Properties ──────────────────────────────────────────────────────────────

  function parseProperties(
    nodes: unknown[],
    type: "object" | "datatype",
  ): OntologyProperty[] {
    return nodes
      .map((prop: unknown): OntologyProperty | null => {
        if (typeof prop !== "object" || !prop) return null;
        const p = prop as Record<string, unknown>;

        const uri = extractUri(p);
        if (!uri) {
          console.warn("[Warn] Property ohne URI übersprungen:", p);
          return null;
        }

        const domainUris = toArray(p["rdfs:domain"])
          .map(extractUri)
          .filter((u): u is string => !!u);
        const rangeUris = toArray(p["rdfs:range"])
          .map(extractUri)
          .filter((u): u is string => !!u);
        const label =
          extractLiteral(toArray(p["rdfs:label"])[0]) ||
          uri.split(/[#/]/).pop() ||
          uri;

        return {
          // Stabile ID aus dem URI ableiten
          id: uri,
          uri,
          type,
          label,
          comment: extractLiteral(toArray(p["rdfs:comment"])[0]) || undefined,
          domainUris,
          rangeUris,
          domainUri: domainUris[0],
          rangeUri: rangeUris[0],
        };
      })
      .filter((p): p is OntologyProperty => p !== null);
  }

  const properties: OntologyProperty[] = [
    ...parseProperties(toArray(rdf["owl:ObjectProperty"]), "object"),
    ...parseProperties(toArray(rdf["owl:DatatypeProperty"]), "datatype"),
  ];

  console.log(`[Debug] Extrahierte Properties: ${properties.length}`);

  // ── Klassen ─────────────────────────────────────────────────────────────────

  const classes: OntologyClass[] = toArray(rdf["owl:Class"])
    .map((cls: unknown): OntologyClass | null => {
      if (typeof cls !== "object" || !cls) return null;
      const c = cls as Record<string, unknown>;

      const uri = extractUri(c);
      if (!uri) return null;

      const subClassOfUris = toArray(c["rdfs:subClassOf"])
        .map(extractUri)
        .filter((u): u is string => !!u);

      return {
        id: uri, // stabile ID
        uri,
        label:
          extractLiteral(toArray(c["rdfs:label"])[0]) ||
          uri.split(/[#/]/).pop() ||
          "Unbenannt",
        subClassOfUris,
        properties: [],
      };
    })
    .filter((c): c is OntologyClass => c !== null);

  // ── Zuordnung Properties → Klassen ──────────────────────────────────────────

  const classByUri = new Map(classes.map((c) => [c.uri, c]));

  for (const prop of properties) {
    for (const domainUri of prop.domainUris) {
      classByUri.get(domainUri)?.properties.push(prop);
    }
  }

  console.log(
    "Class URIs:",
    classes.map((c) => c.uri),
  );
  console.log(
    "Domain URIs:",
    properties.map((p) => p.domainUri),
  );

  return {
    id: fileName,
    name: fileName.replace(/\.(owl|rdf|xml)$/i, ""),
    uri: `http://example.org/${fileName}`,
    classes,
    properties,
  };
}
