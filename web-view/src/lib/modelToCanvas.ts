/**
 * Turns an engine-neutral mapping model into canvas state — the second half of
 * the RML → Model → Canvas import pipeline (the inverse of canvasToModel).
 *
 * Two modes, selected by the optional `context`:
 *   - self-contained (no context): synthesize a minimal ontology (class/property
 *     IRIs only) and a columns-only dataset from what the RML references.
 *   - merge/attach (context = the currently loaded ontology + dataset): resolve
 *     imported classes by URI, columns by name and predicates by URI against
 *     the loaded sources, so labels / hierarchy / sample values are preserved.
 *     Anything not found is synthesized and appended.
 *
 * Layout matches how the editor is used: classes on the left, columns on the
 * right (a class→column edge flows left→right). Node positions and, for the
 * self-contained mode, sample values are not carried by RML.
 */
import type { Edge, Node } from "@xyflow/react";
import type {
  ClassRelation,
  Dataset,
  Mapping,
  Ontology,
  OntologyClass,
  OntologyProperty,
} from "../types";
import { STANDARD_PROPERTIES, URI_PROPERTY } from "./rdfVocabulary";
import { DEFAULT_BASE_IRI } from "../types/workspace";
import type { ObjectMap, RmlMappingDocument, ValueExpression } from "../types/rmlMapping";

export interface CanvasContext {
  /** Loaded ontology to attach the mapping to (merge mode). */
  ontology?: Ontology | null;
  /** Loaded dataset to attach the mapping to (merge mode). */
  dataset?: Dataset | null;
}

export interface CanvasData {
  ontology: Ontology;
  dataset: Dataset;
  mappings: Mapping[];
  relations: ClassRelation[];
  flowNodes: Node[];
  flowEdges: Edge[];
  baseIri: string;
}

export interface CanvasBuildResult {
  data: CanvasData;
  warnings: string[];
}

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return (i >= 0 ? uri.slice(i + 1) : uri) || uri;
}

/** A stable key identifying the resource a term produces (for link matching). */
function termKey(value: ValueExpression): string {
  switch (value.kind) {
    case "template":
      return `t:${value.template}`;
    case "reference":
      return `r:${value.column}`;
    case "constant":
      return `c:${value.value}`;
    case "function":
      return "fn";
  }
}

/** Match a `<base>/{Column}` template → { base, column }. */
function matchBaseTemplate(template: string): { base: string; column: string } | null {
  const m = /^(.*)\/\{([^}]+)\}$/.exec(template);
  return m ? { base: m[1], column: m[2] } : null;
}

/** First `{Column}` placeholder in a template, if any. */
function firstPlaceholder(template: string): string | null {
  return /\{([^}]+)\}/.exec(template)?.[1] ?? null;
}

export function modelToCanvas(
  document: RmlMappingDocument,
  context: CanvasContext = {},
): CanvasBuildResult {
  const warnings: string[] = [];
  const tms = document.triplesMaps;

  // ── ontology: reuse the loaded one (merge) or synthesize a fresh one ───────
  const ontology: Ontology = context.ontology
    ? {
        ...context.ontology,
        classes: [...context.ontology.classes],
        properties: [...context.ontology.properties],
      }
    : { id: crypto.randomUUID(), name: "Imported ontology", uri: "", classes: [], properties: [] };

  const classByUri = new Map(ontology.classes.map((c) => [c.uri, c]));
  const classIds = new Set(ontology.classes.map((c) => c.id));

  const propByUri = new Map<string, OntologyProperty>();
  for (const p of STANDARD_PROPERTIES) propByUri.set(p.uri, p);
  for (const p of ontology.properties) propByUri.set(p.uri, p);
  for (const c of ontology.classes) for (const p of c.properties) propByUri.set(p.uri, p);

  const classIdForUri = (uri: string): string => {
    const existing = classByUri.get(uri);
    if (existing) return existing.id;
    let id = localName(uri) || crypto.randomUUID();
    while (classIds.has(id)) id = `${id}_1`;
    classIds.add(id);
    const cls: OntologyClass = { id, uri, label: localName(uri), subClassOfUris: [], properties: [] };
    classByUri.set(uri, cls);
    ontology.classes.push(cls);
    return id;
  };

  const propertyIdFor = (
    uri: string,
    type: OntologyProperty["type"],
    datatype?: string,
  ): string => {
    const existing = propByUri.get(uri);
    if (existing) return existing.id;
    const property: OntologyProperty = {
      id: uri,
      uri,
      type,
      label: localName(uri),
      ...(datatype ? { datatype } : {}),
    };
    propByUri.set(uri, property);
    ontology.properties.push(property);
    return property.id;
  };

  // ── dataset: reuse the loaded one (merge) or synthesize a columns-only one ──
  const dataset: Dataset = context.dataset
    ? { ...context.dataset, columns: [...context.dataset.columns] }
    : {
        id: crypto.randomUUID(),
        name: tms[0]?.logicalSource.source ?? "imported.csv",
        columns: [],
        rows: [],
      };
  const columnByName = new Map(dataset.columns.map((c) => [c.name, c]));
  const usedColumnIds = new Set<string>();
  const columnId = (name: string): string => {
    let col = columnByName.get(name);
    if (!col) {
      col = { id: crypto.randomUUID(), name, sampleValues: [] };
      columnByName.set(name, col);
      dataset.columns.push(col);
    }
    usedColumnIds.add(col.id);
    return col.id;
  };

  // ── pass 1: resolve a class id per TriplesMap, index subjects for linking ──
  const tmClassId = tms.map((tm) => classIdForUri(tm.subject.classes[0] ?? tm.id));
  const classIdBySubjectKey = new Map<string, string>();
  tms.forEach((tm, i) => {
    classIdBySubjectKey.set(termKey(tm.subject.value), tmClassId[i]);
    if (!tm.subject.classes[0]) {
      warnings.push(`A TriplesMap ("${tm.id}") has no class and was mapped generically.`);
    }
  });

  const mappings: Mapping[] = [];
  const relations: ClassRelation[] = [];
  const flowEdges: Edge[] = [];
  let baseIri = "";

  // ── pass 2: subject "uri" mappings, value mappings, class→class relations ──
  tms.forEach((tm, i) => {
    const classId = tmClassId[i];
    const classNodeId = `class-${classId}`;

    // Subject → "uri" property mapping (+ base IRI).
    const subject = tm.subject;
    let uriColumnName: string | undefined;
    if (subject.termType === "blankNode") {
      // anonymous subject → no uri property
    } else if (subject.value.kind === "reference") {
      uriColumnName = subject.value.column;
    } else if (subject.value.kind === "template") {
      const matched = matchBaseTemplate(subject.value.template);
      if (matched) {
        uriColumnName = matched.column;
        if (!baseIri) baseIri = matched.base;
      } else {
        const ph = firstPlaceholder(subject.value.template);
        if (ph) uriColumnName = ph;
        warnings.push(`Subject template "${subject.value.template}" is not a simple base/{col} form; imported best-effort.`);
      }
    }
    if (uriColumnName) {
      const id = crypto.randomUUID();
      const colId = columnId(uriColumnName);
      mappings.push({ id, sourceId: classId, targetId: colId, propertyId: URI_PROPERTY.id });
      flowEdges.push({ id, source: classNodeId, target: `column-${colId}`, type: "custom" });
    }

    for (const pom of tm.predicateObjectMaps) {
      const predicate = pom.predicates[0];
      if (!predicate) continue;
      const object: ObjectMap = pom.object;

      const linkedClassId = classIdBySubjectKey.get(termKey(object.value));
      if (linkedClassId && object.termType !== "literal") {
        const id = crypto.randomUUID();
        relations.push({
          id,
          sourceClassId: classId,
          targetClassId: linkedClassId,
          propertyId: propertyIdFor(predicate, "object"),
        });
        flowEdges.push({ id, source: classNodeId, target: `class-${linkedClassId}`, type: "custom" });
        continue;
      }

      let colName: string | undefined;
      if (object.value.kind === "reference") colName = object.value.column;
      else if (object.value.kind === "template") colName = firstPlaceholder(object.value.template) ?? undefined;
      if (!colName) {
        warnings.push(`Object of "${predicate}" on "${localName(tm.subject.classes[0] ?? tm.id)}" could not be mapped to a column and was skipped.`);
        continue;
      }
      const type: OntologyProperty["type"] = object.datatype
        ? "datatype"
        : object.termType === "iri"
          ? "object"
          : "annotation";
      const id = crypto.randomUUID();
      const colId = columnId(colName);
      mappings.push({ id, sourceId: classId, targetId: colId, propertyId: propertyIdFor(predicate, type, object.datatype) });
      flowEdges.push({ id, source: classNodeId, target: `column-${colId}`, type: "custom" });
    }
  });

  // ── flow nodes: classes left, columns right (edges flow left→right) ────────
  const usedClassOrder = [...new Set(tmClassId)];
  const classById = new Map(ontology.classes.map((c) => [c.id, c]));
  const flowNodes: Node[] = [];
  usedClassOrder.forEach((id, i) => {
    const cls = classById.get(id)!;
    flowNodes.push({
      id: `class-${id}`,
      type: "ontologyClass",
      position: { x: 40, y: 40 + i * 140 },
      data: { label: cls.label, uri: cls.uri },
    });
  });
  [...usedColumnIds].forEach((id, i) => {
    const col = dataset.columns.find((c) => c.id === id)!;
    flowNodes.push({
      id: `column-${id}`,
      type: "datasetColumn",
      position: { x: 480, y: 40 + i * 90 },
      data: { label: col.name, sampleValues: col.sampleValues },
    });
  });

  return {
    data: { ontology, dataset, mappings, relations, flowNodes, flowEdges, baseIri: baseIri || DEFAULT_BASE_IRI },
    warnings,
  };
}
