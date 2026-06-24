import type { AppState, OntologyProperty, Mapping, DatasetColumn, OntologyClass } from "../types";
import { RMLDocument } from "./rmlCreate";
import { STANDARD_PROPERTIES, URI_PROPERTY } from "./rdfVocabulary";

interface ResolvedMapping {
  mapping: Mapping;
  ontologyClass: OntologyClass;
  targetClass?: OntologyClass;
  targetColumn?: DatasetColumn;
  property?: OntologyProperty;
}

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

/**
 * Exports the application state to a YARRRML document.
 * 
 * The export process:
 * 1. Groups mappings by target class
 * 2. For each class, finds the URI property mapping to create the subject template
 * 3. Adds predicate-object pairs for all other properties
 * 
 * @param state - The application state containing ontology, dataset, and mappings
 * @returns A YARRRML string that can be parsed by yarrrml-parser and processed by morph-kgc
 */
export function exportRml(state: AppState): string {
  const { ontology, dataset, mappings } = state;
  if (!ontology || !dataset) return "";

  const columnById = new Map(dataset.columns.map((c) => [c.id, c]));
  const classById = new Map(ontology.classes.map((c) => [c.id, c]));
  const propertyById = new Map<string, OntologyProperty>();

  for (const p of ontology.properties) propertyById.set(p.id, p);
  for (const p of STANDARD_PROPERTIES) propertyById.set(p.id, p);

  const resolvedMappings: ResolvedMapping[] = [];

  for (const m of mappings) {
    const ontologyClass = classById.get(m.sourceId);
    const targetClass = classById.get(m.targetId);
    const targetColumn = targetClass ? undefined : columnById.get(m.targetId);
    const property = m.propertyId ? propertyById.get(m.propertyId) : undefined;

    if (ontologyClass && (targetClass || targetColumn) && property) {
      resolvedMappings.push({
        mapping: m,
        ontologyClass,
        targetClass,
        targetColumn,
        property,
      });
    }
  }

  if (resolvedMappings.length === 0) return "";

  const rmlDoc = new RMLDocument();
  rmlDoc.setDataSource(dataset.name);
  let prefix;

  if (!ontology.uri) {
    console.warn("Ontology URI is missing, using default prefix");
    prefix = "ex";
  } else {
    prefix = extractPrefix(ontology.uri);
  }
  rmlDoc.addPrefix(prefix, ontology.uri);

  const mappingsByClass = groupBy(
    resolvedMappings.filter((m) => m.targetClass !== undefined),
    (m) => m.targetClass!.id
  );

  for (const [classId, classMappings] of mappingsByClass) {
    const targetClass = classById.get(classId);
    if (!targetClass) continue;

    const uriMapping = classMappings.find(
      (m) => m.property?.uri === URI_PROPERTY.uri
    );

    /* NOTE: 
     * There is a case in karma, where the uri is determined through a subclass.
     * A node can be "ColumnSubClassLink" which means that the uri is determined 
     * dynamically. It is set by the "isSubclassOfClass" property. 
     * This is not handled by this application as it wasn't introduced and declared
     * as needed.
     */
    if (uriMapping) { // not a blank node
      rmlDoc.addSubject({
        template: `${normalizeOntology(ontology.uri)}$(${uriMapping.ontologyClass.id})`,
        classUri: targetClass.uri,
      });

      for (const m of classMappings) {
        if (m.property?.uri === URI_PROPERTY.uri) continue;

        let target = m.targetClass?.uri || m.targetColumn?.name;

        const object: ObjectType = {
          column: target,
          datatype: m.property?.datatype,
        };

        rmlDoc.addPredicateObject(
          { uri: m.property!.uri },
          object,
          targetClass.uri,
        );
      }
    } else { // blank node
      const firstMapping = classMappings[0];
      rmlDoc.addSubject({
        template: `${normalizeOntology(ontology.uri)}${targetClass.label.toLowerCase()}/$(${firstMapping.column.name})`,
        classUri: targetClass.uri,
      });

      for (const m of classMappings) {
        const object: ObjectType = {
          column: m.column.name,
          datatype: m.property?.datatype,
        };

        rmlDoc.addPredicateObject(
          { uri: m.property!.uri },
          object,
          targetClass.uri
        );
      }
    }
  }

  return rmlDoc.serialize();
}

function groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of array) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function extractPrefix(uri: string): string {
  const match = uri.match(/\/([^/]+)\/?$/);
  if (match) {
    return match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  return 'ont';
}

function normalizeOntology(uri: string): string {
  return uri.endsWith('/') ? uri : uri + '/';
}
