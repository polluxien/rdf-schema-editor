import { XMLParser } from "fast-xml-parser";
import type { Ontology, OntologyClass, OntologyProperty } from "../types";

type PropertyType = OntologyProperty["type"];
type XmlRecord = Record<string, unknown>;

const OWL_OBJECT_PROPERTY = "http://www.w3.org/2002/07/owl#ObjectProperty";
const OWL_DATATYPE_PROPERTY = "http://www.w3.org/2002/07/owl#DatatypeProperty";
const OWL_ANNOTATION_PROPERTY =
  "http://www.w3.org/2002/07/owl#AnnotationProperty";
const RDF_PROPERTY = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property";
const XML_SCHEMA_NS = "http://www.w3.org/2001/XMLSchema#";

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

function extractUris(node: unknown): string[] {
  if (!node) return [];
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(extractUris);
  if (typeof node !== "object") return [];

  const obj = node as XmlRecord;
  const directUri = extractUri(obj);
  if (directUri) return [directUri];

  return Object.entries(obj)
    .filter(([key]) => !key.startsWith("@_") && key !== "#text")
    .flatMap(([, value]) => extractUris(value));
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

function localName(uri: string): string {
  return uri.split(/[#/]/).pop() || uri;
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

function extractLiterals(node: unknown): string[] {
  return unique(toArray(node).map(extractLiteral).filter(Boolean));
}

/** Normalisiert einen Wert immer zu einem Array. */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function inferPropertyType(
  fallbackType: PropertyType | undefined,
  rdfTypes: string[],
  rangeUris: string[],
): PropertyType | undefined {
  if (fallbackType) return fallbackType;
  if (rdfTypes.includes(OWL_ANNOTATION_PROPERTY)) return "annotation";
  if (rdfTypes.includes(OWL_DATATYPE_PROPERTY)) return "datatype";
  if (rdfTypes.includes(OWL_OBJECT_PROPERTY)) return "object";
  if (rangeUris.some((uri) => uri.startsWith(XML_SCHEMA_NS))) return "datatype";
  if (rdfTypes.includes(RDF_PROPERTY)) return "object";
  return undefined;
}

function mergeProperties(
  current: OntologyProperty | undefined,
  next: OntologyProperty,
): OntologyProperty {
  if (!current) return next;

  const domainUris = unique([
    ...(current.domainUris ?? []),
    current.domainUri,
    ...(next.domainUris ?? []),
    next.domainUri,
  ]);
  const rangeUris = unique([
    ...(current.rangeUris ?? []),
    current.rangeUri,
    ...(next.rangeUris ?? []),
    next.rangeUri,
  ]);
  const subPropertyOfUris = unique([
    ...(current.subPropertyOfUris ?? []),
    ...(next.subPropertyOfUris ?? []),
  ]);
  const characteristics = unique([
    ...(current.characteristics ?? []),
    ...(next.characteristics ?? []),
  ]);

  return {
    ...current,
    ...next,
    label: next.label ?? current.label,
    comment: next.comment ?? current.comment,
    domainUri: domainUris[0],
    rangeUri: rangeUris[0],
    domainUris,
    rangeUris,
    subPropertyOfUris,
    inverseOfUri: next.inverseOfUri ?? current.inverseOfUri,
    characteristics,
    datatype: next.datatype ?? current.datatype,
  };
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
        "owl:AnnotationProperty",
        "rdf:Description",
        "rdfs:subClassOf",
        "rdfs:label",
        "rdfs:comment",
        "rdfs:domain",
        "rdfs:range",
        "rdfs:subPropertyOf",
        "rdf:type",
        "owl:inverseOf",
        "owl:equivalentProperty",
        "owl:onProperty",
        "owl:someValuesFrom",
        "owl:allValuesFrom",
        "owl:hasValue",
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

  function parseProperties(nodes: unknown[], type?: PropertyType): OntologyProperty[] {
    return nodes
      .map((prop: unknown): OntologyProperty | null => {
        if (typeof prop !== "object" || !prop) return null;
        const p = prop as Record<string, unknown>;

        const uri = extractUri(p);
        if (!uri) return null;

        const rdfTypes = unique(toArray(p["rdf:type"]).map(extractUri));
        const domainUris = unique(toArray(p["rdfs:domain"]).flatMap(extractUris));
        const rangeUris = unique(toArray(p["rdfs:range"]).flatMap(extractUris));
        const propertyType = inferPropertyType(type, rdfTypes, rangeUris);
        if (!propertyType) return null;

        const label =
          extractLiterals(p["rdfs:label"])[0] ||
          extractLiterals(p["skos:prefLabel"])[0] ||
          localName(uri);
        const comment = extractLiterals(p["rdfs:comment"])[0] || undefined;
        const datatype = rangeUris.find((rangeUri) =>
          rangeUri.startsWith(XML_SCHEMA_NS),
        );

        const characteristicTypes = rdfTypes.filter(
          (rdfType) =>
            rdfType !== OWL_OBJECT_PROPERTY &&
            rdfType !== OWL_DATATYPE_PROPERTY &&
            rdfType !== OWL_ANNOTATION_PROPERTY &&
            rdfType !== RDF_PROPERTY,
        );

        return {
          id: uri,
          uri,
          type: propertyType,
          label,
          comment,
          domainUri: domainUris[0],
          rangeUri: rangeUris[0],
          domainUris,
          rangeUris,
          subPropertyOfUris: unique(
            toArray(p["rdfs:subPropertyOf"]).flatMap(extractUris),
          ),
          inverseOfUri: extractUri(toArray(p["owl:inverseOf"])[0]),
          characteristics: characteristicTypes.map(localName),
          datatype: datatype ? localName(datatype) : undefined,
        };
      })
      .filter((p): p is OntologyProperty => p !== null);
  }

  const propertyDeclarations: OntologyProperty[] = [
    ...parseProperties(toArray(rdf["owl:ObjectProperty"]), "object"),
    ...parseProperties(toArray(rdf["owl:DatatypeProperty"]), "datatype"),
    ...parseProperties(toArray(rdf["owl:AnnotationProperty"]), "annotation"),
    ...parseProperties(toArray(rdf["rdf:Description"])),
  ];

  const propertyByUri = new Map<string, OntologyProperty>();
  for (const property of propertyDeclarations) {
    propertyByUri.set(
      property.uri,
      mergeProperties(propertyByUri.get(property.uri), property),
    );
  }

  const properties = [...propertyByUri.values()];

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
          localName(uri) ||
          "Unbenannt",
        subClassOfUris,
        properties: [],
      };
    })
    .filter((c): c is OntologyClass => c !== null);

  // ── Zuordnung Properties → Klassen ──────────────────────────────────────────

  const classByUri = new Map(classes.map((c) => [c.uri, c]));

  for (const prop of properties) {
    for (const domainUri of prop.domainUris ?? []) {
      classByUri.get(domainUri)?.properties.push(prop);
    }
  }

  return {
    id: fileName,
    name: fileName.replace(/\.(owl|rdf|xml)$/i, ""),
    uri: `http://example.org/${fileName}`,
    classes,
    properties,
  };
}
