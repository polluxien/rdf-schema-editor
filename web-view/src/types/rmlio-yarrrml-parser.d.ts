// Minimal typing for the one entry point we use from @rmlio/yarrrml-parser.
// The package ships no types and its `main` is broken, so we import the
// generator module directly. `convert` accepts a YARRRML string and returns
// the RML mapping as N3 quads.
declare module "@rmlio/yarrrml-parser/lib/rml-generator.js" {
  import type { Quad } from "n3";
  export default class RMLGenerator {
    constructor(options?: unknown);
    convert(yarrrml: string): Quad[];
  }
}
