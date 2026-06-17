import type { OntologyProperty } from "../types";

/**
 * Standard RDF/RDFS/OWL/XSD namespaces. These exist independently of any
 * imported ontology and are used to build the always-available system
 * predicates below.
 */
export const NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
} as const;

/**
 * System / standard properties that are always offered to the user,
 * regardless of which ontology (if any) is currently loaded. This mirrors
 * Karma's pre-seeding of standard predicates in OntologyCache.loadProperties().
 *
 * These are real RDF predicates and are emitted verbatim on export.
 */
export const STANDARD_PROPERTIES: OntologyProperty[] = [
  {
    id: NS.rdf + "type",
    uri: NS.rdf + "type",
    type: "object",
    label: "rdf:type",
  },
  {
    id: NS.rdf + "value",
    uri: NS.rdf + "value",
    type: "datatype",
    label: "rdf:value",
  },
  {
    id: NS.rdfs + "label",
    uri: NS.rdfs + "label",
    type: "annotation",
    label: "rdfs:label",
  },
  {
    id: NS.rdfs + "comment",
    uri: NS.rdfs + "comment",
    type: "annotation",
    label: "rdfs:comment",
  },
  {
    id: NS.rdfs + "subClassOf",
    uri: NS.rdfs + "subClassOf",
    type: "object",
    label: "rdfs:subClassOf",
  },
  {
    id: NS.owl + "sameAs",
    uri: NS.owl + "sameAs",
    type: "object",
    label: "owl:sameAs",
  },
];