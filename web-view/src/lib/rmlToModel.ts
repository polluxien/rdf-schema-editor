/**
 * Parses RML/Turtle into the engine-neutral mapping model — the first half of
 * the RML → Model → Canvas import pipeline (the inverse of the export).
 *
 * Scope (MVP): the RML shape this editor itself produces via
 * canvasToModel → toYarrrml → yarrrmlToRml. That means:
 *   - rr:TriplesMap with rml:logicalSource, rr:subjectMap, rr:predicateObjectMap
 *   - subject/object term maps via rr:template | rml:reference | rr:constant
 *     plus rr:termType / rr:datatype
 *   - classes expressed as an rr:predicate rdf:type + rr:constant <Class>
 *     predicate-object map (how the yarrrml-parser emits `[a, Class]`), and/or
 *     rr:class on the subjectMap
 * Functions (FNML), joins (rr:joinCondition) and R2RML tables are out of scope
 * and reported via `warnings`.
 */
import { Parser } from "n3";
import type {
  ObjectMap,
  PredicateObjectMap,
  ReferenceFormulation,
  RmlMappingDocument,
  SubjectMap,
  TermType,
  TriplesMap,
  ValueExpression,
} from "../types/rmlMapping";

const RR = "http://www.w3.org/ns/r2rml#";
const RML = "http://semweb.mmlab.be/ns/rml#";
const QL = "http://semweb.mmlab.be/ns/ql#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

/** A minimal RDF term (n3 Term subset we rely on). */
interface Term {
  value: string;
  termType: string; // "NamedNode" | "BlankNode" | "Literal"
}

export interface ParseResult {
  document: RmlMappingDocument;
  warnings: string[];
}

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return (i >= 0 ? uri.slice(i + 1) : uri) || uri;
}

function mapTermType(iri: string | undefined): TermType | undefined {
  if (iri === RR + "IRI") return "iri";
  if (iri === RR + "BlankNode") return "blankNode";
  if (iri === RR + "Literal") return "literal";
  return undefined;
}

function mapReferenceFormulation(iri: string | undefined): ReferenceFormulation {
  if (iri === QL + "JSONPath") return "jsonpath";
  if (iri === QL + "XPath") return "xpath";
  return "csv";
}

/** Index of subject.value → (predicate IRI → object Terms). */
type Index = Map<string, Map<string, Term[]>>;

function buildIndex(quads: { subject: Term; predicate: Term; object: Term }[]): Index {
  const index: Index = new Map();
  for (const q of quads) {
    let byPredicate = index.get(q.subject.value);
    if (!byPredicate) {
      byPredicate = new Map();
      index.set(q.subject.value, byPredicate);
    }
    const list = byPredicate.get(q.predicate.value) ?? [];
    list.push(q.object);
    byPredicate.set(q.predicate.value, list);
  }
  return index;
}

export function rmlToModel(turtle: string): ParseResult {
  const warnings: string[] = [];
  const parser = new Parser();
  const quads = parser.parse(turtle) as unknown as {
    subject: Term;
    predicate: Term;
    object: Term;
  }[];
  const index = buildIndex(quads);

  const objectsOf = (subject: string, predicate: string): Term[] =>
    index.get(subject)?.get(predicate) ?? [];
  const oneOf = (subject: string, predicate: string): Term | undefined =>
    objectsOf(subject, predicate)[0];

  /** Read a term map (subjectMap / objectMap) node into a ValueExpression. */
  const readTermMap = (
    node: string,
  ): { value: ValueExpression; termType?: TermType } | null => {
    const byPredicate = index.get(node);
    if (!byPredicate) return null;

    // Functions are out of MVP scope.
    if (byPredicate.has(RR + "functionExecution") || byPredicate.has(RML + "functionValue")) {
      warnings.push("A function-based term map was skipped (not yet supported on import).");
      return null;
    }

    const template = oneOf(node, RR + "template");
    const reference = oneOf(node, RML + "reference");
    const constant = oneOf(node, RR + "constant");
    const termType = mapTermType(oneOf(node, RR + "termType")?.value);

    let value: ValueExpression;
    if (template) value = { kind: "template", template: template.value };
    else if (reference) value = { kind: "reference", column: reference.value };
    else if (constant) value = { kind: "constant", value: constant.value };
    else return null;

    return { value, termType };
  };

  const readPredicate = (pom: string): string | undefined => {
    const direct = oneOf(pom, RR + "predicate");
    if (direct) return direct.value;
    const predicateMap = oneOf(pom, RR + "predicateMap");
    return predicateMap ? oneOf(predicateMap.value, RR + "constant")?.value : undefined;
  };

  const readObject = (pom: string): (ObjectMap & { termType?: TermType }) | null => {
    const direct = oneOf(pom, RR + "object");
    if (direct) {
      return {
        value: { kind: "constant", value: direct.value },
        termType: direct.termType === "Literal" ? "literal" : "iri",
      };
    }
    const objectMap = oneOf(pom, RR + "objectMap");
    if (!objectMap) return null;

    const term = readTermMap(objectMap.value);
    if (!term) return null;

    const datatype = oneOf(objectMap.value, RR + "datatype")?.value;
    const language = oneOf(objectMap.value, RR + "language")?.value;
    const parent = oneOf(objectMap.value, RR + "parentTriplesMap")?.value;
    return {
      value: term.value,
      termType: term.termType,
      ...(datatype ? { datatype } : {}),
      ...(language ? { language } : {}),
      ...(parent ? { parentTriplesMapId: parent } : {}),
    };
  };

  // All TriplesMap subjects.
  const triplesMapIris = quads
    .filter((q) => q.predicate.value === RDF_TYPE && q.object.value === RR + "TriplesMap")
    .map((q) => q.subject.value);

  const triplesMaps: TriplesMap[] = [];

  for (const tmIri of triplesMapIris) {
    const label = oneOf(tmIri, RDFS_LABEL)?.value;

    // Logical source.
    const lsNode = oneOf(tmIri, RML + "logicalSource")?.value;
    const logicalSource = {
      source: (lsNode && oneOf(lsNode, RML + "source")?.value) || "data.csv",
      referenceFormulation: mapReferenceFormulation(
        lsNode ? oneOf(lsNode, RML + "referenceFormulation")?.value : undefined,
      ),
      ...(lsNode && oneOf(lsNode, RML + "iterator")
        ? { iterator: oneOf(lsNode, RML + "iterator")!.value }
        : {}),
    };

    // Subject map.
    const smNode = oneOf(tmIri, RR + "subjectMap")?.value;
    const subjectTerm = smNode ? readTermMap(smNode) : null;
    const classes: string[] = smNode
      ? objectsOf(smNode, RR + "class").map((t) => t.value)
      : [];

    // Predicate-object maps.
    const predicateObjectMaps: PredicateObjectMap[] = [];
    for (const pom of objectsOf(tmIri, RR + "predicateObjectMap")) {
      const predicate = readPredicate(pom.value);
      const object = readObject(pom.value);
      if (!predicate || !object) continue;

      // rdf:type + constant object encodes the class assignment.
      if (predicate === RDF_TYPE && object.value.kind === "constant") {
        classes.push(object.value.value);
        continue;
      }

      predicateObjectMaps.push({ predicates: [predicate], object });
    }

    const subject: SubjectMap = {
      value: subjectTerm?.value ?? { kind: "constant", value: tmIri },
      termType: subjectTerm?.termType,
      classes: [...new Set(classes)],
    };

    triplesMaps.push({
      id: label || localName(classes[0] ?? tmIri),
      label,
      logicalSource,
      subject,
      predicateObjectMaps,
    });
  }

  if (triplesMaps.length === 0) {
    warnings.push("No rr:TriplesMap found — is this an RML mapping in Turtle?");
  }

  return { document: { prefixes: {}, triplesMaps }, warnings };
}
