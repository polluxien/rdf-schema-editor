import { Document } from 'yaml'
import type { SubjectType, PredicateType, ObjectType } from './rmlExport';

export class RMLDocument {
  private doc: Document;
  
  constructor(prefixes: Map<string, string> = undefined, dataSource: string = undefined) {
    
    this.doc = new Document([
      { mapping: 
        { data: undefined } 
      }
    ]);

    this.setPrefixes(prefixes)
    this.setDataSource(dataSource)
  }
  
  addSubject(subject: SubjectType): this { 
    return this;
  }

  addPredicateObject(predicate: PredicateType, object: ObjectType): this { 
    return this;
  }

  setDataSource(file_name: string): this {
    (this.doc.getIn(["mapping", "data"]) as Document).set("sources", file_name + "~" + file_name.split(".").pop());
    return this;
  } 

  setPrefixes(prefixes: Map<string, string>) {
    this.doc.set("prefixes", prefixes)
  }

  serialize(): string { return this.doc.toString(); }

}
