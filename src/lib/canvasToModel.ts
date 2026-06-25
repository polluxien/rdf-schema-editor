/**
 * Builds the engine-neutral mapping model (RmlMappingDocument) from the current
 * canvas state — the first half of the Canvas → YARRRML → RML pipeline.
 *
 * It reads real, user-defined data:
 *   - the subject of each class node  (node.data.subject)
 *   - column → class → property mappings  (literal / datatype / IRI objects)
 *   - class → class relations  (object-property links between TriplesMaps)
 *
 * A class→class link reuses the *target* class's subject term as the object, so
 * the generated IRI / blank node matches the target TriplesMap's subject (the
 * same pattern the OBOE example uses). Anything the canvas cannot express yet
 * is reported via `warnings` rather than guessed.
 */
import type { Node } from "@xyflow/react";
import type {
  ClassRelation,
  ClassSubject,
  Dataset,
  Mapping,
  Ontology,
  OntologyProperty,
} from "../types";
import { STANDARD_PROPERTIES } from "./rdfVocabulary";
import type {
  LogicalSource,
  ObjectMap,
  PredicateObjectMap,
  RmlMappingDocument,
  SubjectMap,
  TermType,
  TriplesMap,
  ValueExpression,
} from "../types/rmlMapping";

export interface CanvasState {
  ontology: Ontology | null;
  dataset: Dataset | null;
  mappings: Mapping[];
  relations: ClassRelation[];
  flowNodes: Node[];
}

export interface BuildResult {
  document: RmlMappingDocument;
  /** Issues the user should resolve (missing subjects/properties). */
  warnings: string[];
}

const WELL_KNOWN_PREFIXES: Record<string, string> = {
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
  "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
  "http://www.w3.org/2002/07/owl#": "owl",
  "http://www.w3.org/2001/XMLSchema#": "xsd",
};

function splitUri(uri: string): [string, string] {
  const index = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  if (index < 0) return ["", uri];
  return [uri.slice(0, index + 1), uri.slice(index + 1)];
}

function localName(uri: string): string {
  return splitUri(uri)[1] || uri;
}

/** Collects namespaces and hands out CURIEs for a minimal `prefixes` block. */
class PrefixRegistry {
  readonly prefixes: Record<string, string> = {};
  private readonly byNamespace = new Map<string, string>();
  private counter = 1;

  curie(uri: string): string {
    const [namespace, local] = splitUri(uri);
    if (!namespace || !local) return uri;
    let prefix = this.byNamespace.get(namespace);
    if (!prefix) {
      prefix = WELL_KNOWN_PREFIXES[namespace] ?? `ns${this.counter++}`;
      this.byNamespace.set(namespace, prefix);
      this.prefixes[prefix] = namespace;
    }
    return `${prefix}:${local}`;
  }
}

function indexProperties(ontology: Ontology | null): Map<string, OntologyProperty> {
  const byId = new Map<string, OntologyProperty>();
  for (const property of STANDARD_PROPERTIES) byId.set(property.id, property);
  if (ontology) {
    for (const property of ontology.properties) byId.set(property.id, property);
    for (const cls of ontology.classes) {
      for (const property of cls.properties) byId.set(property.id, property);
    }
  }
  return byId;
}

/**
 * The term (value + termType) a class's subject produces. Used both for the
 * subject itself and — when another class links to it — for the object, so the
 * two always generate the same IRI / blank node.
 */
function resolveSubjectTerm(
  subject: ClassSubject,
  classUri: string,
): { value: ValueExpression; termType: TermType } {
  switch (subject.mode) {
    case "column":
      return { value: { kind: "reference", column: subject.column ?? "" }, termType: "iri" };
    case "blankNode":
      return {
        value: { kind: "template", template: subject.template || localName(classUri) },
        termType: "blankNode",
      };
    default:
      return { value: { kind: "template", template: subject.template ?? "" }, termType: "iri" };
  }
}

function buildObjectFromProperty(
  property: OntologyProperty,
  columnName: string,
  registry: PrefixRegistry,
): ObjectMap {
  const value: ValueExpression = { kind: "reference", column: columnName };
  if (property.type === "object") return { value, termType: "iri" };
  if (property.type === "datatype") {
    return property.datatype ? { value, datatype: registry.curie(property.datatype) } : { value };
  }
  return { value }; // annotation → plain literal
}

export function canvasToModel(state: CanvasState, source?: LogicalSource): BuildResult {
  const { ontology, dataset, mappings, relations, flowNodes } = state;
  const registry = new PrefixRegistry();
  const propertiesById = indexProperties(ontology);
  const columnsById = new Map((dataset?.columns ?? []).map((c) => [c.id, c]));
  const classesById = new Map((ontology?.classes ?? []).map((c) => [c.id, c]));
  const warnings: string[] = [];

  const logicalSource: LogicalSource = source ?? {
    source: dataset?.name || "data.csv",
    referenceFormulation: "csv",
  };

  // Subject config per class id, read from the class nodes on the canvas.
  const subjectByClassId = new Map<string, ClassSubject>();
  const classIdsOnCanvas = new Set<string>();
  for (const node of flowNodes) {
    if (!node.id.startsWith("class-")) continue;
    const classId = node.id.replace("class-", "");
    classIdsOnCanvas.add(classId);
    const subject = (node.data as { subject?: ClassSubject })?.subject;
    if (subject) subjectByClassId.set(classId, subject);
  }

  const triplesMaps: TriplesMap[] = [];

  // Iterate in ontology order for deterministic output; only emit class nodes
  // that are actually on the canvas.
  for (const cls of ontology?.classes ?? []) {
    if (!classIdsOnCanvas.has(cls.id)) continue;

    const subjectConfig = subjectByClassId.get(cls.id);
    if (!subjectConfig) {
      warnings.push(`Class "${cls.label}" has no subject defined and was skipped.`);
      continue;
    }

    const subjectTerm = resolveSubjectTerm(subjectConfig, cls.uri);
    const subject: SubjectMap = {
      value: subjectTerm.value,
      termType: subjectTerm.termType,
      classes: [registry.curie(cls.uri)],
    };

    const predicateObjectMaps: PredicateObjectMap[] = [];

    // Literal / datatype / IRI value mappings (column → class).
    for (const mapping of mappings.filter((m) => m.targetClassId === cls.id)) {
      const column = columnsById.get(mapping.sourceColumnId);
      const property = mapping.targetPropertyId
        ? propertiesById.get(mapping.targetPropertyId)
        : undefined;
      if (!column) continue;
      if (!property) {
        warnings.push(`Mapping from column "${column.name}" to "${cls.label}" has no property and was skipped.`);
        continue;
      }
      predicateObjectMaps.push({
        predicates: [registry.curie(property.uri)],
        object: buildObjectFromProperty(property, column.name, registry),
      });
    }

    // Object-property links (class → class): reuse the target subject term.
    for (const relation of relations.filter((r) => r.sourceClassId === cls.id)) {
      const targetClass = classesById.get(relation.targetClassId);
      const property = relation.propertyId
        ? propertiesById.get(relation.propertyId)
        : undefined;
      const targetSubject = subjectByClassId.get(relation.targetClassId);
      if (!property) {
        warnings.push(`Relation from "${cls.label}" has no object property and was skipped.`);
        continue;
      }
      if (!targetClass || !targetSubject) {
        warnings.push(`Relation from "${cls.label}" targets a class without a subject and was skipped.`);
        continue;
      }
      const targetTerm = resolveSubjectTerm(targetSubject, targetClass.uri);
      predicateObjectMaps.push({
        predicates: [registry.curie(property.uri)],
        object: { value: targetTerm.value, termType: targetTerm.termType },
      });
    }

    triplesMaps.push({
      id: localName(cls.uri) || cls.label,
      label: cls.label,
      logicalSource,
      subject,
      predicateObjectMaps,
    });
  }

  return { document: { prefixes: registry.prefixes, triplesMaps }, warnings };
}
