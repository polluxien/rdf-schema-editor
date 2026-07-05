/**
 * Serializes the engine-neutral mapping model (see types/rmlMapping.ts) to
 * YARRRML.
 *
 * YARRRML is an *internal intermediate* format here, not the deliverable: it
 * is compact and easy to generate, so the UI emits it first. A subsequent step
 * (yarrrml → RML) parses this output to RML/Turtle, which is what the
 * rdf_transform service actually consumes as input. We perform that
 * translation ourselves; the service is never handed YARRRML.
 *
 * Output style follows the common YARRRML conventions:
 *   - `sources` as a `['file~formulation', 'iterator']` array
 *   - predicate-object pairs in the compact `[predicate, object]` form, with
 *     `~iri` / `~lang` suffixes and the 3-element `[p, o, datatype]` form
 *   - functions in the `function:` / `parameters:` form, nesting via
 *     `parameter:` / `value:`
 *   - blank nodes via the expanded `value:` + `type: blank` form (the
 *     yarrrml-parser has no `~blanknode` suffix — only `~iri` / `~lang`)
 */
import type {
  FunctionCall,
  LogicalSource,
  PredicateObjectMap,
  RmlMappingDocument,
  SubjectMap,
  TermType,
  TriplesMap,
  ValueExpression,
} from "../types/rmlMapping";

/** Prefix each line by `spaces` blanks. */
function indent(lines: string[], spaces: number): string[] {
  const pad = " ".repeat(spaces);
  return lines.map((line) => (line.length ? pad + line : line));
}

/** Convert an RML-style `{Column}` template to YARRRML `$(Column)`. */
function templateToYarrrml(template: string): string {
  return template.replace(/\{([^}]+)\}/g, "$($1)");
}

/** Render a non-function value as an inline YARRRML term. */
function scalarTerm(value: ValueExpression): string {
  switch (value.kind) {
    case "constant":
      return value.value;
    case "reference":
      return `$(${value.column})`;
    case "template":
      return templateToYarrrml(value.template);
    case "function":
      throw new Error("function values must use the expanded form");
  }
}

/** YARRRML inline term-type suffix. Blank nodes have no suffix (expanded form). */
function termSuffix(termType?: TermType): string {
  return termType === "iri" ? "~iri" : "";
}

/** Lines for a function, at column 0. */
function functionLines(fn: FunctionCall): string[] {
  const lines = [`function: ${fn.fn}`, "parameters:"];
  for (const param of fn.parameters) {
    if (param.value.kind === "function") {
      lines.push(`  - parameter: ${param.parameter}`);
      lines.push("    value:");
      lines.push(...indent(functionLines(param.value.fn), 6));
    } else {
      lines.push(`  - [${param.parameter}, ${scalarTerm(param.value)}]`);
    }
  }
  return lines;
}

/** Turn a block of lines into a YAML list item, optionally with a trailing key. */
function asListItem(lines: string[], trailing?: string): string[] {
  const out = ["- " + lines[0], ...indent(lines.slice(1), 2)];
  if (trailing) out.push("  " + trailing);
  return out;
}

function sourceLines(source: LogicalSource): string[] {
  const ref = `${source.source}~${source.referenceFormulation}`;
  const parts = [`'${ref}'`];
  if (source.iterator) parts.push(`'${source.iterator}'`);
  return ["sources:", `  - [${parts.join(", ")}]`];
}

function subjectLines(subject: SubjectMap): string[] {
  if (subject.value.kind === "function") {
    const type = subject.termType === "blankNode" ? "type: blank" : undefined;
    return ["subjects:", ...indent(asListItem(functionLines(subject.value.fn), type), 2)];
  }
  if (subject.termType === "blankNode") {
    // Templated/keyed blank node → expanded form.
    return ["subjects:", `  - value: ${scalarTerm(subject.value)}`, "    type: blank"];
  }
  return [`s: ${scalarTerm(subject.value)}`];
}

/** Predicate-object lines (excluding the rdf:type entries), at column 0. */
function predicateObjectLines(pom: PredicateObjectMap): string[] {
  const object = pom.object;
  const predicate = pom.predicates.join(", ");
  const multiPredicate = pom.predicates.length > 1;

  // Expanded form: functions, blank nodes, joins, or multiple predicates.
  if (
    object.value.kind === "function" ||
    object.parentTriplesMapId ||
    object.termType === "blankNode" ||
    multiPredicate
  ) {
    const predLine = multiPredicate
      ? `- predicates: [${pom.predicates.join(", ")}]`
      : `- predicates: ${predicate}`;
    const head = [predLine, "  objects:"];

    if (object.parentTriplesMapId) {
      return [...head, `    - mapping: ${object.parentTriplesMapId}`];
    }
    if (object.value.kind === "function") {
      const type =
        object.termType && object.termType !== "literal"
          ? `type: ${object.termType === "blankNode" ? "blank" : "iri"}`
          : undefined;
      return [...head, ...indent(asListItem(functionLines(object.value.fn), type), 4)];
    }
    if (object.termType === "blankNode") {
      return [...head, `    - value: ${scalarTerm(object.value)}`, "      type: blank"];
    }
    // multiPredicate with a plain term.
    return [...head, `    - value: ${scalarTerm(object.value)}`];
  }

  // Compact array form.
  const term = scalarTerm(object.value);
  if (object.datatype) {
    return [`- [${predicate}, ${term}, ${object.datatype}]`];
  }
  if (object.language) {
    return [`- [${predicate}, ${term}, ${object.language}~lang]`];
  }
  return [`- [${predicate}, ${term}${termSuffix(object.termType)}]`];
}

/** Lines for one mapping, at column 0 (`id:` followed by indented body). */
function triplesMapLines(map: TriplesMap): string[] {
  const poItems: string[] = [];
  for (const cls of map.subject.classes) {
    poItems.push(`- [a, ${cls}]`);
  }
  for (const pom of map.predicateObjectMaps) {
    poItems.push(...predicateObjectLines(pom));
  }

  const body = [
    ...sourceLines(map.logicalSource),
    ...subjectLines(map.subject),
    "po:",
    ...indent(poItems, 2),
  ];

  return [`${map.id}:`, ...indent(body, 2)];
}

/** Serialize a complete mapping document to a YARRRML string. */
export function toYarrrml(doc: RmlMappingDocument): string {
  const lines: string[] = [];

  lines.push("prefixes:");
  for (const [prefix, namespace] of Object.entries(doc.prefixes)) {
    lines.push(`  ${prefix}: ${namespace}`);
  }
  if (doc.baseIri) {
    lines.push(`base: ${doc.baseIri}`);
  }
  lines.push("");

  lines.push("mappings:");
  doc.triplesMaps.forEach((map, index) => {
    if (index > 0) lines.push("");
    lines.push(...indent(triplesMapLines(map), 2));
  });

  return lines.join("\n") + "\n";
}
