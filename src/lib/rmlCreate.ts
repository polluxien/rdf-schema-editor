import { stringify } from 'yaml'
import type { SubjectType, PredicateType, ObjectType } from './rmlExport';
import { NS } from './rdfVocabulary';

interface YARRRMLMapping {
  sources: string[];
  s: string;
  po: (string | [string, string] | [string, string, string] | { p: string; o: { value: string; type?: string; datatype?: string } })[];
}

interface YARRRMLDocument {
  prefixes: Record<string, string>;
  mappings: Record<string, YARRRMLMapping>;
}

export class RMLDocument {
  private doc: YARRRMLDocument;
  private dataSource: string = '';
  
  constructor() {
    this.doc = {
      prefixes: {
        rdf: NS.rdf,
        rdfs: NS.rdfs,
        owl: NS.owl,
        xsd: NS.xsd,
        ex: 'http://example.org/',
      },
      mappings: {},
    };
  }

  setDataSource(fileName: string): this {
    this.dataSource = fileName;
    return this;
  }

  addPrefix(prefix: string, uri: string): this {
    this.doc.prefixes[prefix] = uri;
    return this;
  }

  addSubject(subject: SubjectType): this {
    const mappingKey = this.generateMappingKey(subject.classUri);

    if (!this.doc.mappings[mappingKey]) {
      const sourceRef = this.dataSource.endsWith('.csv')
        ? `${this.dataSource}~csv`
        : this.dataSource;

      this.doc.mappings[mappingKey] = {
        sources: [sourceRef],
        s: subject.template,
        po: [
          ['a', subject.classUri + '~iri'],
        ],
      };
    }

    return this;
  }

  addPredicateObject(predicate: PredicateType, object: ObjectType, classUri: string): this {
    const mappingKey = this.generateMappingKey(classUri);
    const mapping = this.doc.mappings[mappingKey];

    if (!mapping) {
      return this;
    }

    if (object.datatype) {
      mapping.po.push([predicate.uri, `$(${object.column})`, object.datatype]);
    } else {
      mapping.po.push([predicate.uri, `$(${object.column})`]);
    }

    return this;
  }

  private generateMappingKey(classUri: string): string {
    const shortName = classUri.split(/[#/]/).pop() || classUri;
    return shortName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  serialize(): string {
    return stringify(this.doc, { lineWidth: 0 });
  }
}
