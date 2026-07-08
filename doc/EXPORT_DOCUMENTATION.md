# RML Export — Documentation

This document describes the full export pipeline that converts a semantic model built in the canvas editor into RML/Turtle, the format consumed by the downstream `rdf_transform` service to produce RDF output.

---

## Overview: The Three-Stage Pipeline

```
Canvas State
    │
    ▼  canvasToModel()               [src/lib/canvasToModel.ts]
RmlMappingDocument  (internal model)
    │
    ▼  toYarrrml()                   [src/lib/yarrrml.ts]
YARRRML string      (internal intermediate)
    │
    ▼  yarrrmlToRml()                [src/lib/yarrrmlToRml.ts]
RML/Turtle string   (deliverable)
```

The entry point that wires the three stages together is `buildMappingExport` in `src/lib/exportMapping.ts`. It is called lazily from `RmlExportDialog` when the user opens the export dialog.

---

## Stage 1 — Canvas → Internal Model (`canvasToModel`)

**File:** `src/lib/canvasToModel.ts`  
**Input:** `CanvasState` (ontology, dataset, mappings, relations, flow nodes, base IRI)  
**Output:** `BuildResult` → `{ document: RmlMappingDocument, warnings: string[] }`

### What `CanvasState` contains

| Field | Description |
|---|---|
| `ontology` | Loaded ontology with classes and properties |
| `dataset` | CSV/JSON dataset with columns and sample values |
| `mappings` | Column → class edges drawn by the user; each has a `propertyId` |
| `relations` | Class → class edges (object-property links) |
| `flowNodes` | The React Flow nodes on the canvas; used to determine which classes are visible |
| `baseIri` | Workspace-level base IRI, used when a URI column holds local IDs |

### One TriplesMap per visible class

`canvasToModel` iterates the ontology's classes in ontology order and skips any class whose node is not present on the canvas (identified by the `class-{id}` node ID convention).

For each visible class it builds one `TriplesMap` with:
- a **subject map** (IRI or blank node)
- **predicate-object maps** for column → class literal/datatype/IRI mappings
- **predicate-object maps** for class → class object-property relations

### Subject resolution (`resolveSubjectTerm`)

The subject of a class is determined by the column mapped to it via the special **`uri` property** (`URI_PROPERTY`). Three cases:

| Condition | Result |
|---|---|
| `uri` column whose sample values start with `http(s)://` | Direct `rml:reference` to the column — values are used as-is |
| `uri` column with local IDs | IRI template: `{baseIri}/{ColumnName}` |
| No `uri` column at all | Blank node keyed by the first other mapped column: `{ClassName}_{ColumnName}` |

The resolved term is **cached** in `subjectTermCache` so that when another class links to this one, it reuses the exact same template or reference. This is the mechanism that makes inter-class links consistent without joins (see [Inter-class linking strategy](#inter-class-linking-strategy) below).

### Column mappings (literal/datatype/IRI objects)

For each non-`uri` mapping from a column to a class, the property type decides the object:

| Property type | Object map |
|---|---|
| `annotation` | Plain literal (`rml:reference`, no termType) |
| `datatype` | Typed literal with `xsd:…` datatype |
| `object` | IRI reference (`rml:reference` + `termType: iri`) |

### Class → class relations

For each `ClassRelation` whose source is the current class, the **target class's cached subject term** is used directly as the object value. This produces the matching IRI or blank node template without needing a join.

### Warnings

Issues that cannot be auto-resolved are appended to `warnings` and surfaced in the export dialog. Examples:
- A class has no `uri` property and no other mapped column (blank node cannot be distinguished per row).
- A column → class mapping has no property selected.
- A class → class relation has no object property or targets an unknown class.

### PrefixRegistry

A `PrefixRegistry` instance collects all namespaces encountered during building and assigns short prefixes (`rdf`, `rdfs`, `owl`, `xsd` for well-known namespaces; `ns1`, `ns2`, … for others). The resulting `prefixes` record is forwarded through the pipeline so the final Turtle uses readable CURIEs.

---

## Stage 2 — Internal Model → YARRRML (`toYarrrml`)

**File:** `src/lib/yarrrml.ts`  
**Input:** `RmlMappingDocument`  
**Output:** YARRRML string (YAML)

YARRRML is used as an **internal intermediate only** — it is compact and easy to generate, but it is never the deliverable. The `rdf_transform` service never receives YARRRML.

### Internal model types (`src/types/rmlMapping.ts`)

```
RmlMappingDocument
  prefixes: Record<string, string>
  baseIri?: string
  triplesMaps: TriplesMap[]
    id: string
    label?: string
    logicalSource: LogicalSource
      source: string          // filename
      referenceFormulation    // "csv" | "jsonpath" | "xpath"
      iterator?: string       // e.g. "$[*]" for JSONPath
    subject: SubjectMap
      value: ValueExpression  // constant | reference | template | function
      termType?: TermType     // "iri" | "literal" | "blankNode"
      classes: string[]       // rdf:type CURIEs
    predicateObjectMaps: PredicateObjectMap[]
      predicates: string[]
      object: ObjectMap
        value: ValueExpression
        termType?: TermType
        datatype?: string
        language?: string
        parentTriplesMapId?: string  // explicit join (unused by canvasToModel)
```

`ValueExpression` supports four kinds: `constant`, `reference` (a single column), `template` (a string with `{Column}` placeholders), and `function` (nested GREL / Morph-KGC FNO calls).

### YARRRML serialization rules

- Templates use `$(Column)` syntax (the serializer converts `{Column}` → `$(Column)`).
- IRI objects use the `~iri` suffix: `[predicate, $(Column)~iri]`.
- Blank node subjects/objects use the expanded form: `value: …` + `type: blank` (the YARRRML parser has no `~blanknode` suffix).
- Datatype literals use the 3-element array: `[predicate, $(Column), xsd:double]`.
- Language-tagged literals: `[predicate, $(Column), en~lang]`.
- Functions use the `function:` / `parameters:` expanded form and can nest.
- Class `rdf:type` entries are emitted as `[a, ClassName]`.

---

## Stage 3 — YARRRML → RML/Turtle (`yarrrmlToRml`)

**File:** `src/lib/yarrrmlToRml.ts`  
**Input:** YARRRML string, optional extra prefixes  
**Output:** Promise\<string\> — RML/Turtle

Uses `@rmlio/yarrrml-parser` (the official YARRRML→RML generator) running fully in the browser to convert the YARRRML string to N3 quads, then serializes those quads to Turtle with the `n3` library.

The extra prefixes passed in (the ontology-specific ones from `PrefixRegistry`) are merged with the standard RML prefixes (`rml:`, `rr:`, `ql:`, `fnml:`, `fno:`, `rdf:`, `rdfs:`, `xsd:`) so the output uses human-readable CURIEs throughout.

---

## UI: `RmlExportDialog`

**File:** `src/components/RmlExportDialog/RmlExportDialog.tsx`

The dialog exposes two tabs:
- **YARRRML** — the intermediate YARRRML (`.yarrrml.yml`), useful for debugging the pipeline.
- **Turtle** — the final RML/Turtle (`.rml.ttl`), the actual deliverable.

Both can be copied to clipboard or downloaded. Warnings from `canvasToModel` are shown inline as alert banners.

The pipeline is triggered lazily on dialog open via a dynamic `import("../../lib/exportMapping")` to keep the YARRRML parser out of the initial bundle.

---

## Inter-class Linking Strategy

### This system's approach (inline template reuse)

When a class A links to class B via an object property, `canvasToModel` looks up B's **cached subject term** and places it directly as the object of the predicate-object map on A:

```yaml
# Observation → hasMeasurement → Measurement
Observation:
  po:
    - [ex:hasMeasurement, http://example.org/$(ObsDataID)~iri]

Measurement:
  s: http://example.org/$(ObsDataID)
```

The object value in A is literally the same expression as the subject value in B. Because both sides are evaluated from the same source row, the generated IRI is identical, and the link is correct.

This is a **denormalized** approach: there is no explicit join instruction in the RML. Both the subject of the target TriplesMap and the object of the linking TriplesMap are derived from the same column template, so they always resolve to the same IRI.

### Karma's approach (RefObjectMap joins)

The legacy Karma system used proper R2RML `rr:RefObjectMap` + `rr:parentTriplesMap` semantics:

```turtle
# Observation → hasMeasurement → Measurement (Karma style)
km-dev:PredicateObjectMap_50e1af89 rr:predicate oboe-core:hasMeasurement .

km-dev:RefObjectMap_b2bd219d
    a rr:RefObjectMap, rr:ObjectMap ;
    rr:parentTriplesMap km-dev:TriplesMap_b28e28ac .   # ← the Measurement map

km-dev:TriplesMap_bdc0e236   # Observation
    rr:predicateObjectMap km-dev:PredicateObjectMap_50e1af89 .
```

Here the processor is explicitly told: "join to the Measurement TriplesMap and use its subject as the object." The join semantics are part of the mapping itself, not implied by matching templates.

### Why the two approaches produce equivalent RDF

Both approaches generate the same set of triples **as long as every link in the canvas uses the exact same column as both the target subject and the link object** — which `canvasToModel` guarantees by construction through `subjectTermCache`. The inline-template approach is simpler to generate and avoids the verbose `rr:RefObjectMap` nesting, at the cost of making the join implicit rather than explicit.

The `ObjectMap` type in `src/types/rmlMapping.ts` does retain a `parentTriplesMapId` field for cases where an explicit join is needed (e.g. cross-source joins or future extensions), but `canvasToModel` currently never populates it.

---

## Differences from the Legacy Karma Output

The reference Karma model (`plant_height_vegetative_raw-model_oboe.ttl`) provided by Miss Karam and used here for explanatory purposes maps the same OBOE ontology structure. The generated RDF will be semantically equivalent given the column-name differences noted in the user configuration (`UnitName` vs. `UnitURI`, `TaxonID` vs. `TaxonURI`, these were created with the PyTransform-Functionality of Karma and Ms. Karam explicitly indicated that this should not be implemented in our system). Key structural divergences:

| Aspect | This system | Karma |
|---|---|---|
| **Inter-class links** | Inline template reuse (denormalized) | `rr:RefObjectMap` + `rr:parentTriplesMap` (explicit join) |
| **Subject URI namespace** | `{baseIri}/{ColumnName}` (configurable) | Class-specific real URIs (e.g. `http://www.catalogueoflife.org/…` for Entity, `http://qudt.org/…` for Unit) |
| **URI pre-computation** | Done inline in the template | Karma pre-computes `TaxonURI` and `UnitURI` columns via Python transforms before mapping |
| **Blank node identity** | Compound-key blank node (e.g. `MeasuredValue_{StdValue}_{ObsDataID}`) — one distinct blank node per source row | Fully anonymous blank node — new identity per processor run |
| **Format** | RML (with `rml:LogicalSource` / `ql:CSV`) | R2RML (with `rr:LogicalTable` / `rr:tableName`) |
| **Metadata** | None | Karma-specific `km-dev:` provenance metadata embedded |

### Deep-dive: MeasuredValue blank node identity

In the OBOE model, `MeasuredValue` is a small wrapper node that attaches a concrete value (the `hasCode` literal from `StdValue`) to a `Measurement`. Because it is purely a structural node with no independent identity — it only exists to carry the numeric value — it is modelled as a blank node rather than an IRI in both systems.

#### How Karma generates the blank node

Karma declares the `MeasuredValue` subject map with `rr:termType rr:BlankNode` and no template:

```turtle
_:node1imp7hn1lx8
    a rr:SubjectMap ;
    rr:class oboe-core:MeasuredValue ;
    rr:termType rr:BlankNode .
```

In R2RML, a blank node subject with no template means the processor allocates a **fresh, internally-managed blank node for every single row**, and it is guaranteed not to collide with blank nodes from other rows. The processor is responsible for scoping and identity — the mapping author never sees or cares about the blank node label.

For the `Measurement → hasValue → MeasuredValue` link, Karma uses a `rr:RefObjectMap` pointing to the MeasuredValue TriplesMap:

```turtle
km-dev:RefObjectMap_1873dda8
    a rr:RefObjectMap, rr:ObjectMap ;
    rr:parentTriplesMap km-dev:TriplesMap_9e718de5 .  # ← MeasuredValue map
```

Because both TriplesMaps iterate the same source, this is an implicit **same-row join**: the processor produces one Measurement and one MeasuredValue per row and links them. The Measurement's `hasValue` object is set to whatever blank node the MeasuredValue TriplesMap produced for that row.

**Result:** Every row produces a completely private, throwaway blank node for its MeasuredValue. Two rows that happen to have the same `StdValue` (e.g. both measuring 1.5 m) still get distinct blank nodes. The graph looks like:

```turtle
<obs-row1> oboe:hasMeasurement <meas-row1> .
<meas-row1> oboe:hasValue _:b0 .
_:b0 a oboe:MeasuredValue ; oboe:hasCode "1.5" .

<obs-row2> oboe:hasMeasurement <meas-row2> .
<meas-row2> oboe:hasValue _:b1 .
_:b1 a oboe:MeasuredValue ; oboe:hasCode "1.5" .
```

`_:b0` and `_:b1` are entirely separate nodes even though their `hasCode` value is identical.

#### How this system generates the blank node

Because this system does not use `rr:RefObjectMap`, the blank node must be addressable from both the MeasuredValue subject map and the Measurement `hasValue` object map using only the same row's column values. `canvasToModel` handles this in `resolveSubjectTerm`: when a class has no `uri` property mapped, it builds a **compound-key blank node** from the class's own mapped column(s) **plus the URI column of every class that links to it** (the parent URI columns):

```typescript
// src/lib/canvasToModel.ts
const slug = localName(classUri);                       // "MeasuredValue"
const keyCols = [fallbackColumn, ...parentUriColumns]   // [StdValue, ObsDataID]
  .filter((c): c is DatasetColumn => c !== undefined);
const template = keyCols.length > 0
  ? `${slug}_${keyCols.map((c) => `{${c.name}}`).join("_")}` // "MeasuredValue_{StdValue}_{ObsDataID}"
  : slug;
return { value: { kind: "template", template }, termType: "blankNode" };
```

The parent URI columns are collected in a reverse-relation index built before the main loop:

```typescript
// For every relation A → B, add A's uri-column to parentUriColumnsFor[B]
for (const relation of relations) {
  const parentUriCol = /* uri-column of relation.sourceClassId */;
  if (parentUriCol) parentUriColumnsFor.get(relation.targetClassId).push(parentUriCol);
}
```

The resulting RML uses the same compound template on both sides:

```turtle
# MeasuredValue subject map
<...s_002> rr:template "MeasuredValue_{StdValue}_{ObsDataID}" ;
           rr:termType rr:BlankNode .

# Measurement → hasValue object map  (same template, from the cached subject term)
<...om_007> rr:template "MeasuredValue_{StdValue}_{ObsDataID}" ;
            rr:termType rr:BlankNode .
```

Because `ObsDataID` is unique per row, the template evaluates to a different string for every row even when `StdValue` repeats. The inline-template link mechanism is preserved — both sides still produce the same blank node label for the same row — but distinct rows now get distinct blank nodes.

**Result:** Every row gets its own distinct blank node for MeasuredValue:

```turtle
<meas-row1> oboe:hasValue _:MeasuredValue_1.5_obs001 .
<meas-row2> oboe:hasValue _:MeasuredValue_1.5_obs002 .
_:MeasuredValue_1.5_obs001 a oboe:MeasuredValue ; oboe:hasCode "1.5" .
_:MeasuredValue_1.5_obs002 a oboe:MeasuredValue ; oboe:hasCode "1.5" .
```

#### Comparing the two behaviours

| Property | Karma (anonymous) | This system (compound-key) |
|---|---|---|
| Blank node per row | Yes — always unique | Yes — unique because the parent URI column is included in the key |
| Cross-row blank node identity | Never shared | Never shared (as long as the parent class has a `uri` property) |
| Link mechanism | `rr:RefObjectMap` same-row join | Matching template on both sides |
| Processor dependency | Processor manages identity | Template string controls identity |
| Valid RDF? | Yes | Yes |

---

## File Reference

| File | Role |
|---|---|
| `src/lib/exportMapping.ts` | Pipeline entry point: `buildMappingExport` |
| `src/lib/canvasToModel.ts` | Stage 1: canvas state → `RmlMappingDocument` |
| `src/lib/yarrrml.ts` | Stage 2: `RmlMappingDocument` → YARRRML string |
| `src/lib/yarrrmlToRml.ts` | Stage 3: YARRRML → RML/Turtle |
| `src/types/rmlMapping.ts` | Internal model type definitions |
| `src/components/RmlExportDialog/RmlExportDialog.tsx` | UI dialog (tabs, download, warnings) |
| `src/lib/canvasToModel.test.ts` | Unit tests for stage 1 |
| `src/lib/yarrrml.test.ts` | Unit tests for stage 2 |
| `src/lib/yarrrmlToRml.test.ts` | Integration tests for stage 3 |
| `test/mapping.rml.ttl` | Example output generated by this system |
| `test/plant_height_vegetative_raw-model_oboe.ttl` | Reference Karma R2RML model for the same dataset |
