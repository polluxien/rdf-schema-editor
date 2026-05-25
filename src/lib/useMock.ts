import type { Dataset, Ontology } from "../types";
import { parseCsvTextToDataset } from "./csvParse";
import { parseOwlToOntology } from "./owlParse";

import csvContent from "../../mockData/CSV_TEST.csv?raw";
import owlContent from "../../mockData/OWL_TEST.owl?raw";

export function loadMockData(): { dataset: Dataset | null; ontology: Ontology | null } {
  try {
    const ontology = parseOwlToOntology(owlContent, "mockData/OWL_TEST.owl");
    const dataset = parseCsvTextToDataset(
      csvContent,
      "mockData/CSV_TEST.csv",
      {
        delimiter: ",",
        quoteChar: '"',
        hasHeader: true,
        charset: "utf-8",
      },
      () => `mock-id-${Math.random().toString(16).slice(2)}`,
    );

    return {
      dataset: dataset || null,
      ontology: ontology || null,
    };
  } catch (error) {
    console.error("Fehler beim Laden der Mockdaten:", error);
    return {
      dataset: null,
      ontology: null,
    };
  }
}
