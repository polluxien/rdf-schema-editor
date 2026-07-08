/**
 * Builds the engine-neutral mapping model (RmlMappingDocument) from the current
 * canvas state — the first half of the Canvas → YARRRML → RML pipeline.
 *
 * It reads real, user-defined data:
 *   - the subject of each class, derived from the column mapped to it via the
 *     special "uri" property (URI_PROPERTY); classes without one get a blank node
 *   - column → class → property mappings  (literal / datatype / IRI objects)
 *   - class → class relations  (object-property links between TriplesMaps)
 *
 * Subject identity follows the RDF semantics of the editor: a subject is always
 * identified by its "uri" property or is a blank node — never by an arbitrary
 * key the user types. The uri column either already holds a full IRI (values
 * start with "http") and is referenced as-is, or holds a local id that is
 * prefixed with the workspace base IRI.
 *
 * A class→class link reuses the *target* class's subject term as the object, so
 * the generated IRI / blank node matches the target TriplesMap's subject (the
 * same pattern the OBOE example uses). Anything the canvas cannot express yet
 * is reported via `warnings` rather than guessed.
 */
import type { Node } from "@xyflow/react";
import type {
  ClassRelation,
  Dataset,
  DatasetColumn,
  Mapping,
  Ontology,
  OntologyProperty,
} from "../types";
import { STANDARD_PROPERTIES, URI_PROPERTY } from "./rdfVocabulary";
import { DEFAULT_BASE_IRI } from "../types/workspace";
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
  /** Workspace base IRI used to build subject IRIs from local-id columns. */
  baseIri?: string;
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
 * Whether a column's values are already full IRIs. Decided from the sample
 * values: if the first non-empty sample starts with "http(s)://", the column is
 * referenced as-is rather than prefixed with the base IRI.
 */
function columnHoldsIri(column: DatasetColumn | undefined): boolean {
  const sample = column?.sampleValues.find((value) => value && value.trim().length > 0);
  return !!sample && /^https?:\/\//i.test(sample.trim());
}

/**
 * The term (value + termType) a class's subject produces, derived from its
 * "uri" property mapping. Used both for the subject itself and — when another
 * class links to it — for the object, so the two always generate the same IRI /
 * blank node.
 *
 *   - uri column holding a full IRI → reference the column as-is
 *   - uri column holding a local id → `${base}/{column}` IRI template
 *   - no uri column                → blank node keyed by own column(s) + parent uri-column(s)
 */
function resolveSubjectTerm(
  classUri: string,
  uriColumn: DatasetColumn | undefined,
  fallbackColumn: DatasetColumn | undefined,
  parentUriColumns: DatasetColumn[],
  baseIri: string,
): { value: ValueExpression; termType: TermType } {
  if (uriColumn) {
    if (columnHoldsIri(uriColumn)) {
      return { value: { kind: "reference", column: uriColumn.name }, termType: "iri" };
    }
    const base = baseIri.replace(/\/+$/, "");
    return {
      value: { kind: "template", template: `${base}/{${uriColumn.name}}` },
      termType: "iri",
    };
  }
  // No uri property → blank node. The template key combines the class's own
  // mapped column with the uri-column(s) of every class that links to this one.
  // Including the parent uri-column ensures the template evaluates to a unique
  // value per source row: two rows that share the same StdValue but differ in
  // ObsDataID (the parent's unique identifier) still get distinct blank nodes.
  const slug = localName(classUri);
  const keyCols = [fallbackColumn, ...parentUriColumns].filter(
    (c): c is DatasetColumn => c !== undefined,
  );
  const template = keyCols.length > 0
    ? `${slug}_${keyCols.map((c) => `{${c.name}}`).join("_")}`
    : slug;
  return { value: { kind: "template", template }, termType: "blankNode" };
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

/** Is this mapping the class's subject designator (the "uri" property)? */
function isUriMapping(mapping: Mapping): boolean {
  return mapping.propertyId === URI_PROPERTY.id;
}

export function canvasToModel(state: CanvasState, source?: LogicalSource): BuildResult {
  const { ontology, dataset, mappings, relations, flowNodes } = state;
  const baseIri = state.baseIri?.trim() || DEFAULT_BASE_IRI;
  const registry = new PrefixRegistry();
  const propertiesById = indexProperties(ontology);
  const columnsById = new Map((dataset?.columns ?? []).map((c) => [c.id, c]));
  const classesById = new Map((ontology?.classes ?? []).map((c) => [c.id, c]));
  const warnings: string[] = [];

  const logicalSource: LogicalSource = source ?? {
    source: dataset?.name || "data.csv",
    referenceFormulation: "csv",
  };

  const classIdsOnCanvas = new Set<string>();
  for (const node of flowNodes) {
    if (node.id.startsWith("class-")) classIdsOnCanvas.add(node.id.replace("class-", ""));
  }

  // For each class that is the *target* of a relation, collect the uri-column
  // of every source class. Built before the main loop so the full reverse index
  // is available regardless of the ontology-iteration order.
  const parentUriColumnsFor = new Map<string, DatasetColumn[]>();
  for (const relation of relations) {
    const parentMappings = mappings.filter((m) => m.sourceId === relation.sourceClassId);
    const parentUriColId = parentMappings.find(isUriMapping)?.targetId;
    const parentUriCol = parentUriColId ? columnsById.get(parentUriColId) : undefined;
    if (parentUriCol) {
      const list = parentUriColumnsFor.get(relation.targetClassId) ?? [];
      if (!list.includes(parentUriCol)) list.push(parentUriCol);
      parentUriColumnsFor.set(relation.targetClassId, list);
    }
  }

  // The subject term of a class, derived from its "uri" property mapping (or a
  // blank node). Cached so the subject and any class→class link to it produce
  // the exact same IRI / blank node.
  const subjectTermCache = new Map<string, { value: ValueExpression; termType: TermType }>();
  const subjectTermFor = (classId: string) => {
    const cached = subjectTermCache.get(classId);
    if (cached) return cached;
    const classUri = classesById.get(classId)?.uri ?? classId;
    const classMappings = mappings.filter((m) => m.sourceId === classId);
    const uriColumn = columnsById.get(
      classMappings.find(isUriMapping)?.targetId ?? "",
    );
    const fallbackColumn = columnsById.get(
      classMappings.find((m) => !isUriMapping(m))?.targetId ?? "",
    );
    const parentUriColumns = parentUriColumnsFor.get(classId) ?? [];
    const term = resolveSubjectTerm(classUri, uriColumn, fallbackColumn, parentUriColumns, baseIri);
    subjectTermCache.set(classId, term);
    return term;
  };

  const triplesMaps: TriplesMap[] = [];

  // Iterate in ontology order for deterministic output; only emit class nodes
  // that are actually on the canvas.
  for (const cls of ontology?.classes ?? []) {
    if (!classIdsOnCanvas.has(cls.id)) continue;

    const classMappings = mappings.filter((m) => m.sourceId === cls.id);
    const hasUriMapping = classMappings.some(isUriMapping);
    const hasValueColumn = classMappings.some((m) => !isUriMapping(m));
    if (!hasUriMapping && !hasValueColumn) {
      warnings.push(
        `Class "${cls.label}" has no "uri" property and no other column mapped; ` +
          `its blank node subject cannot be distinguished per row.`,
      );
    }

    const subjectTerm = subjectTermFor(cls.id);
    const subject: SubjectMap = {
      value: subjectTerm.value,
      termType: subjectTerm.termType,
      classes: [registry.curie(cls.uri)],
    };

    const predicateObjectMaps: PredicateObjectMap[] = [];

    // Literal / datatype / IRI value mappings (class → column). The "uri"
    // mapping only designates the subject, so it produces no predicate-object.
    for (const mapping of classMappings) {
      if (isUriMapping(mapping)) continue;
      const column = columnsById.get(mapping.targetId);
      const property = mapping.propertyId
        ? propertiesById.get(mapping.propertyId)
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
      if (!property) {
        warnings.push(`Relation from "${cls.label}" has no object property and was skipped.`);
        continue;
      }
      if (!targetClass) {
        warnings.push(`Relation from "${cls.label}" targets an unknown class and was skipped.`);
        continue;
      }
      const targetTerm = subjectTermFor(targetClass.id);
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
