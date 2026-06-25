# Mapping-Modell → YARRRML → RML

Kurzüberblick, wie aus den Editor-Daten ein RML-Mapping für den
`rdf_transform`-Service entsteht.

## Die Pipeline

```
 Canvas-State            RmlMappingDocument          YARRRML (.yml)         RML / Turtle
 (Nodes/Edges)   ──────▶  (engine-neutral)   ──────▶  (intern)      ──────▶  (Deliverable)
                canvasToModel()        toYarrrml()           yarrrmlToRml()
                 [fertig]              [fertig]              [fertig]
```

- **YARRRML ist nur Zwischenformat.** Es ist kompakt und leicht zu erzeugen.
- **RML/Turtle ist das Deliverable** — nur das bekommt der `rdf_transform`-Service.
  Die YARRRML→RML-Übersetzung machen **wir selbst**, der Service sieht nie YARRRML.

## Was ein Mapping braucht (konzeptionell)

Ein Mapping macht aus **jeder Datenzeile** RDF-Tripel (Subjekt – Prädikat – Objekt).
Pro Ziel-Klasse braucht es vier Bausteine:

1. **Logische Quelle** — woher die Zeilen kommen (CSV/JSON) und wie iteriert wird.
   Ohne sie weiß die Engine nicht, *was* sie liest.

2. **Subjekt** — *welche* Ressource eine Zeile beschreibt, also ihre **IRI (Identität)**.
   Jedes Tripel braucht ein Subjekt. Eine Klasse allein sagt nur *was* etwas ist
   (`rdf:type`), aber nicht, *welche* konkrete IRI jede Zeile bekommt.
   → **Darum gibt es das Subjekt:** es wird aus einer Schlüsselspalte gebaut,
   z. B. `http://example.org/obs/{HerbariumID}`. **Ohne Subjekt können für die
   Klasse keine Tripel erzeugt werden** — deshalb wird eine Klasse ohne Subjekt
   beim Export übersprungen (mit Warnung).

3. **Attribut-Abbildungen (Spalte → Property)** — die eigentlichen Werte:
   jede gemappte Spalte wird zu `Subjekt <property> Wert` (Literal, typisiertes
   Literal oder IRI). Das ist die „flache" Beschreibung einer Ressource.

4. **Klasse→Klasse-Verknüpfungen (Objekt-Properties)** — Beziehungen *zwischen*
   Ressourcen (z. B. `Observation hasMeasurement Measurement`). In RDF verbindet
   das zwei Subjekte: das **Objekt ist die Subjekt-IRI der Ziel-Klasse**.
   → **Darum gibt es Klasse→Klasse:** ohne sie hättest du nur isolierte
   Ressourcen mit Literalwerten, aber keinen verknüpften Graphen. Genau diese
   Kanten bilden im OBOE-Beispiel die Verbindungen zwischen den TriplesMaps.

## End-User-Workflow in der UI

1. **Importieren** — Ontologie (OWL) und Daten (CSV) laden.
2. **Base-IRI setzen** — einmalig in der Toolbar (z. B. `http://example.org`);
   füllt Subjekt-Templates automatisch vor.
3. **Auf den Canvas holen** — über `+` die gewünschten **Klassen** und **Spalten**
   als Nodes hinzufügen.
4. **Subjekt je Klasse** — Schlüsselspalte → Klasse ziehen, im Dialog
   **„Subject (key)"** wählen, Template bestätigen (`‹base›/‹klasse›/{Spalte}`).
5. **Werte abbilden** — Spalte → Klasse ziehen, **„Map to property"**, Property wählen.
6. **Beziehungen** — Klasse → Klasse ziehen, Objekt-Property wählen.
7. **Exportieren** — `export → ttl` (RML) oder `yarrrml`. Unfertige Stellen
   (fehlendes Subjekt / fehlende Property) werden als Warn-Dialog gemeldet.

**Was die UI heute abdeckt:**

- ✅ CSV-Quellen, Subjekte (Template / Spalte-als-IRI / Blank Node),
  Literal-/Datatype-/IRI-Properties, Klasse→Klasse-Links, Base-IRI, Export (ttl/yarrrml).
- ⚠️ **Noch nicht in der UI:** JSON/JSONPath-Quellen (Format ist fix `csv`),
  Transformations-**Funktionen** (`concat`/`toUpperCase` etc. — Modell/Serializer
  können es bereits), manuelle Datatype-Wahl, Live-Tripel-Vorschau.

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
- ✅ YARRRML → RML/Turtle — `src/lib/yarrrmlToRml.ts` (`@rmlio/yarrrml-parser` + `n3`)
- ✅ Model-Builder — `src/lib/canvasToModel.ts`
- ✅ Canvas: Subjekt-Kanten (Spalte→Klasse als „Subject (key)"), Klasse↔Klasse-Kanten, Base-IRI
- ⬜ Funktions-Formulare im Canvas (`concat`/`toUpperCase`)
- ⬜ logicalSource-Format/Iterator wählbar (JSON/JSONPath)
- ⬜ Live-Tripel-Vorschau

Referenz-Ziel, das das Modell abbilden können muss:
`BiodivPipeline/modules/local/rdf_transform/examples/plant_height_vegetative_raw-model_oboe.rml.ttl`
