import type { AppState, OntologyProperty, Mapping, DatasetColumn, OntologyClass } from "../types";
import { RMLDocument } from "./rmlCreate";
import { STANDARD_PROPERTIES, URI_PROPERTY } from "./rdfVocabulary";

interface ResolvedMapping {
  mapping: Mapping;
  column: DatasetColumn;
  targetClass: OntologyClass;
  property?: OntologyProperty;
}

// TODO: this will probably get some sort of
// transformation function parameter as well.
export type SubjectType = {
  template: string;
  classUri: string;
}

export type PredicateType = {
  uri: string;
}

export type ObjectType = {
  column?: string;
  constant?: string;
  datatype?: string;
}

export function exportRml(_state: AppState): string {

  const { ontology, dataset, mappings } = _state;
  if (!ontology || !dataset) return "";

  const columnById = new Map(dataset.columns.map((c) => [c.id, c]))
  const classById = new Map(ontology.classes.map((c) => [c.id, c]))
  const propertyById = new Map<string, OntologyProperty>();

  for (const p of ontology.properties) propertyById.set(p.id, p);
  for (const p of STANDARD_PROPERTIES) propertyById.set(p.id, p);

  const resolvedMappings: ResolvedMapping[] = [];

  for (const m of mappings) {
    const column = columnById.get(m.sourceColumnId);
    const class_ = classById.get(m.targetClassId);
    // TODO: an absent property should throw some user-facing UI errors.
    const property = m.targetPropertyId ? propertyById.get(m.targetPropertyId) : undefined;

    if (property) {
      resolvedMappings.push({
        mapping: m,
        column: column!,
        targetClass: class_!,
        property: property!
      });
    }
  }

  var rmlDoc = new RMLDocument()
  rmlDoc.setDataSource(dataset.name)

  for (const m of resolvedMappings) {
    if (m.property) {
      if (m.property.uri === URI_PROPERTY.uri) {
        rmlDoc.addSubject({
          template: `http://example.org/\$(${m.column.name})`,
          classUri: m.targetClass.uri
        })
      }
    }
  }

}
