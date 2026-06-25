# Mapping-Modell → YARRRML → RML

Kurzüberblick, wie aus den Editor-Daten ein RML-Mapping für den
`rdf_transform`-Service entsteht.

## Die Pipeline

```
 Canvas-State            RmlMappingDocument          YARRRML (.yml)         RML / Turtle
 (Nodes/Edges)   ──────▶  (engine-neutral)   ──────▶  (intern)      ──────▶  (Deliverable)
                Model-Builder          toYarrrml()           yarrrml→rml
                 [noch offen]          [fertig]              [nächster Schritt]
```

- **YARRRML ist nur Zwischenformat.** Es ist kompakt und leicht zu erzeugen.
- **RML/Turtle ist das Deliverable** — nur das bekommt der `rdf_transform`-Service.
  Die YARRRML→RML-Übersetzung machen **wir selbst**, der Service sieht nie YARRRML.

## Das Datenmodell (`src/types/rmlMapping.ts`)

Eine Schicht, die unabhängig von der Serialisierung ist — die einzige
„Wahrheit", die der Editor bearbeitet.

```
RmlMappingDocument
├── prefixes            { kürzel: namespace-iri }
└── triplesMaps[]       je eine pro Ziel-Klasse (= eine YARRRML-Mapping / rml:TriplesMap)
    ├── logicalSource   woher die Daten kommen: source, referenceFormulation, iterator
    ├── subject         das Subjekt jedes Tripels
    │   ├── value       wie die IRI gebaut wird → ValueExpression
    │   ├── termType    "iri" (default) | "blankNode"
    │   └── classes[]   rdf:type-Klassen (YARRRML [a, Class])
    └── predicateObjectMaps[]
        ├── predicates[]   ein oder mehrere Prädikat-IRIs
        └── object         ObjectMap
            ├── value      ValueExpression
            ├── termType   "literal" (default) | "iri" | "blankNode"
            ├── datatype?  z. B. "xsd:double"
            └── parentTriplesMapId?   expliziter Join auf ein anderes TriplesMap
```

### `ValueExpression` — wie ein Wert entsteht

Der zentrale Baustein. Vier Varianten, beliebig in Funktionen verschachtelbar:

| `kind`       | Bedeutung                          | YARRRML            |
|--------------|------------------------------------|--------------------|
| `constant`   | fester Text                        | `http://…/`        |
| `reference`  | ein Spaltenwert                    | `$(Spalte)`        |
| `template`   | Text mit `{Spalte}`-Platzhaltern   | `http://…/$(Spalte)` |
| `function`   | GREL/builtin-Funktionsaufruf       | `function:` + `parameters:` |

Eine `function` hat `parameters[]`, deren `value` wieder eine `ValueExpression`
sein darf — so entsteht z. B. `concat("http://…/", toUpperCase($(UnitName)))`.

## Ein Modell von Hand bauen

```ts
import type { RmlMappingDocument } from "../types/rmlMapping";
import { toYarrrml } from "../lib/yarrrml";

const doc: RmlMappingDocument = {
  prefixes: { oboe: "http://ecoinformatics.org/oboe/oboe.1.2/oboe-core.owl#" },
  triplesMaps: [
    {
      id: "Observation",
      logicalSource: { source: "data.json", referenceFormulation: "jsonpath", iterator: "$[*]" },
      subject: {
        value: { kind: "template", template: "http://…/data/{ObservationID}" },
        classes: ["oboe:Observation"],
      },
      predicateObjectMaps: [
        // Literal:
        { predicates: ["rdfs:label"], object: { value: { kind: "reference", column: "Name" } } },
        // Link auf eine andere Ressource (IRI):
        {
          predicates: ["oboe:ofEntity"],
          object: { value: { kind: "template", template: "http://…/taxon/{TaxonID}" }, termType: "iri" },
        },
      ],
    },
  ],
};

const yaml = toYarrrml(doc); // → fertiges YARRRML
```

## Rezepte für die typischen Fälle

| Will ich…                                  | …dann                                                            |
|--------------------------------------------|------------------------------------------------------------------|
| Spaltenwert als **Literal**                | `object.value = reference`, kein `termType`                      |
| Spaltenwert als **IRI** (ist schon eine URL)| `reference` + `termType: "iri"`                                 |
| **Link** auf andere Klasse                 | `template` (gleiches wie deren Subjekt) + `termType: "iri"`      |
| **Blank Node**                             | `template` + `termType: "blankNode"`                             |
| **Datatype-Literal**                       | `object.datatype = "xsd:double"`                                 |
| **Funktion** (z. B. Großschreibung)        | `value = { kind: "function", fn: {...} }`                        |

## Status

- ✅ Datenmodell — `src/types/rmlMapping.ts`
- ✅ YARRRML-Serializer — `src/lib/yarrrml.ts` (Golden-Test gegen das OBOE-Beispiel)
- ⬜ YARRRML → RML/Turtle — nächster Schritt
- ⬜ Model-Builder `Canvas-State → RmlMappingDocument`
- ⬜ Canvas-Erweiterungen (Subjekt-Templates, Klasse↔Klasse-Kanten, Funktions-Formulare)

Referenz-Ziel, das das Modell abbilden können muss:
`BiodivPipeline/modules/local/rdf_transform/examples/plant_height_vegetative_raw-model_oboe.rml.ttl`
