/**
 * Serialization-independent mapping model.
 *
 * This is the single source of truth the UI edits. From it we serialize to
 * YARRRML first (compact, easy to generate) as an internal intermediate, then
 * parse that YARRRML to RML/Turtle ourselves. RML/Turtle — not YARRRML — is
 * the deliverable that the rdf_transform service consumes as input.
 *
 * The shape mirrors YARRRML (`sources` / `s` / `po` / `function`) so the
 * YARRRML serializer stays close to a structural mapping, while remaining
 * generic enough to also emit RML/Turtle.
 *
 * Reference target this model must be able to express:
 *   modules/local/rdf_transform/examples/plant_height_vegetative_raw-model_oboe.rml.ttl
 * (7 TriplesMaps: ObservationCollection, Observation, Measurement,
 *  MeasuredValue, Characteristic, Unit, Entity — incl. concat/toUpperCase
 *  functions and blank nodes).
 */

/** RDF term type of a generated subject or object. IRI is the default. */
export type TermType = "iri" | "literal" | "blankNode";

/** Reference formulation of the logical source. */
export type ReferenceFormulation = "jsonpath" | "csv" | "xpath";

/**
 * How a single value (subject IRI, object literal, function argument …) is
 * produced from a source row. Functions may nest: a function parameter can
 * itself be another function (e.g. concat(constant, toUpperCase(reference))).
 */
export type ValueExpression =
  /** A fixed literal value, e.g. "http://qudt.org/vocab/unit/". */
  | { kind: "constant"; value: string }
  /** A single column value, YARRRML `$(Column)` / RML `rml:reference`. */
  | { kind: "reference"; column: string }
  /** A string template with `{Column}` placeholders, e.g. "http://.../{ObsID}". */
  | { kind: "template"; template: string }
  /** A function call (GREL / Morph-KGC built-in), serialized as RML-FNML. */
  | { kind: "function"; fn: FunctionCall };

export interface FunctionCall {
  /** Function identifier as CURIE, e.g. "grel:toUpperCase", "builtin:concat". */
  fn: string;
  parameters: FunctionParameter[];
}

export interface FunctionParameter {
  /** Parameter identifier as CURIE, e.g. "grel:valueParameter1". */
  parameter: string;
  /** The argument value — may itself be a nested function. */
  value: ValueExpression;
}

/** Where the data comes from and how it is iterated. */
export interface LogicalSource {
  /** Path / filename of the source data, e.g. "plant_height...germany_20.json". */
  source: string;
  referenceFormulation: ReferenceFormulation;
  /** Iterator expression, e.g. "$[*]" for JSONPath. Omitted for plain CSV. */
  iterator?: string;
}

/** The subject of every triple a TriplesMap produces. */
export interface SubjectMap {
  /** How the subject IRI / blank node id is built. */
  value: ValueExpression;
  /** Defaults to "iri". Use "blankNode" for bnode subjects. */
  termType?: TermType;
  /** rdf:type classes assigned to the subject (YARRRML `[a, Class]`). */
  classes: string[];
}

/** The object side of a predicate-object pair. */
export interface ObjectMap {
  value: ValueExpression;
  /** Defaults to "literal" for references, "iri" for templates linking resources. */
  termType?: TermType;
  /** xsd datatype CURIE for literals, e.g. "xsd:double". */
  datatype?: string;
  /** language tag for literals, e.g. "en". */
  language?: string;
  /**
   * If set, the object links to another TriplesMap's subject (an explicit RML
   * parent-triples-map join). When omitted, an IRI link is expressed simply by
   * reusing the same template as the target's subjectMap (as the example does).
   */
  parentTriplesMapId?: string;
}

export interface PredicateObjectMap {
  /** One or more predicate IRIs (CURIEs), e.g. ["oboe:hasMeasurement"]. */
  predicates: string[];
  object: ObjectMap;
}

/** One YARRRML mapping / one rml:TriplesMap. */
export interface TriplesMap {
  /** Stable key, used as the YARRRML mapping name and to link maps. */
  id: string;
  /** Optional human label for the UI. */
  label?: string;
  logicalSource: LogicalSource;
  subject: SubjectMap;
  predicateObjectMaps: PredicateObjectMap[];
}

/** The complete mapping document the UI produces. */
export interface RmlMappingDocument {
  /** Prefix → namespace IRI, e.g. { oboe: "http://ecoinformatics.org/..." }. */
  prefixes: Record<string, string>;
  /** Optional base IRI for the mapping. */
  baseIri?: string;
  triplesMaps: TriplesMap[];
}
