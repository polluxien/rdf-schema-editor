/**
 * End-to-end RML import: RML/Turtle → model → canvas state. Inverse of
 * exportMapping (Canvas → YARRRML → RML). Returns the reconstructed canvas
 * data plus any warnings from parsing / rebuilding.
 */
import { rmlToModel } from "./rmlToModel";
import { modelToCanvas, type CanvasContext, type CanvasData } from "./modelToCanvas";

export interface RmlImportResult {
  data: CanvasData;
  warnings: string[];
}

/**
 * @param turtle  the RML/Turtle document
 * @param context optionally the loaded ontology + dataset to attach onto
 *                (merge mode); omit for a self-contained import.
 */
export function importRmlToCanvas(
  turtle: string,
  context: CanvasContext = {},
): RmlImportResult {
  const { document, warnings: parseWarnings } = rmlToModel(turtle);
  const { data, warnings: buildWarnings } = modelToCanvas(document, context);
  return { data, warnings: [...parseWarnings, ...buildWarnings] };
}
