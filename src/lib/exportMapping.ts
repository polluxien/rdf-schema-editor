/**
 * End-to-end mapping export: canvas state → model → YARRRML → RML/Turtle.
 * Returns both serializations plus any builder warnings so the UI can surface
 * unfinished parts of the mapping.
 */
import { canvasToModel, type CanvasState } from "./canvasToModel";
import { toYarrrml } from "./yarrrml";
import { yarrrmlToRml } from "./yarrrmlToRml";

export interface MappingExport {
  yarrrml: string;
  rml: string;
  warnings: string[];
}

export async function buildMappingExport(state: CanvasState): Promise<MappingExport> {
  const { document, warnings } = canvasToModel(state);
  const yarrrml = toYarrrml(document);
  // Pass the ontology prefixes through so the RML uses readable CURIEs.
  const rml = await yarrrmlToRml(yarrrml, document.prefixes);
  return { yarrrml, rml, warnings };
}
