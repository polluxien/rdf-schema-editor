import type { DatasetColumn, OntologyClass } from "../types";

// * Helper functions
export const getLabelListBySequence = (
  searchTerm: string,
  sortType: string,
  viewMode: string,
  type: "column" | "ontology",
  list: DatasetColumn[] | OntologyClass[],
): (DatasetColumn | OntologyClass)[] => {
  // get list
  // list is already the array — no need to access .columns or .classes
  let items: (DatasetColumn | OntologyClass)[] = list ? [...list] : [];

  // filter by search term
  if (searchTerm !== "" && items.length > 0) {
    items = items.filter((item) => {
      const label =
        type === "column"
          ? (item as DatasetColumn).name
          : (item as OntologyClass).label;
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  //filter by search term
  if (searchTerm !== "" && items.length > 0) {
    items = items.filter((item) => {
      const label =
        viewMode === "column"
          ? (item as DatasetColumn).name
          : (item as OntologyClass).label;
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  // sort by name or position
  items.sort((a, b) => {
    const labelA =
      viewMode === "column"
        ? (a as DatasetColumn).name
        : (a as OntologyClass).label;
    const labelB =
      viewMode === "column"
        ? (b as DatasetColumn).name
        : (b as OntologyClass).label;

    switch (sortType) {
      case "BY_POSITION_START":
        return 0;
      case "BY_POSITION_END":
        return 0;
      case "BY_NAME_ABC":
        return labelA.localeCompare(labelB);
      case "BY_NAME_CBA":
        return labelB.localeCompare(labelA);
      default:
        return 0;
    }
  });
  return sortType === "BY_POSITION_END" ? items.reverse() : items;
};
