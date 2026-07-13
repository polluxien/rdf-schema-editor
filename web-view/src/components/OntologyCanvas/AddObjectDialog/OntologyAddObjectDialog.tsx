import { useEffect, useRef, useState } from "react";
import type { Node as FlowNode } from "@xyflow/react";
import { SegmentedToggle } from "./ToggleComponent";
import { useAppContext } from "../../../hooks/useAppContext";
import type { DatasetColumn, OntologyClass } from "../../../types";

interface OntologyAddObjectDialogProps {
  addNodesToCanvas: (newNode: FlowNode) => void;
  closeDialog: () => void;
}

function OntologyAddObjectDialog({
  addNodesToCanvas,
  closeDialog,
}: OntologyAddObjectDialogProps) {
  const { ontology, dataset } = useAppContext();

  const [viewMode, setViewMode] = useState<"column" | "ontology">("column");

  // * Sequence of labels
  const [searchTerm, setSearchTerm] = useState("");

  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [sortType, setSortType] = useState<
    "BY_NAME_ABC" | "BY_NAME_CBA" | "BY_POSITION_START" | "BY_POSITION_END"
  >("BY_POSITION_START");

  // ? Close sort menu when clicking outside dialog -> sequence
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setSortMenuOpen(false);
      }
    };
    if (sortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortMenuOpen]);

  // * Add objects tocanvas
  const handleAddObject = (type: "column" | "ontology", obj: unknown) => {
    let newNode: FlowNode;

    // TODO: Dynamische Positionierung implementieren
    const basePosition = { x: 50, y: 80 };

    if (type === "column") {
      const column = obj as DatasetColumn;
      newNode = {
        id: `column-${column.id}`,
        type: "datasetColumn",
        position: basePosition,
        data: {
          label: column.name,
          sampleValues: column.sampleValues,
          columnData: column,
        },
      };
    } else {
      const cls = obj as OntologyClass;
      newNode = {
        id: `class-${cls.id}`,
        type: "ontologyClass",
        position: basePosition,
        data: { label: cls.label, uri: cls.uri, classData: cls },
      };
    }

    if (newNode) {
      addNodesToCanvas(newNode);
    }
  };

  // * Helper functions
  const getLabelListBySequence = (
    type: "column" | "ontology",
  ): (DatasetColumn | OntologyClass)[] => {
    // get list
    let items: (DatasetColumn | OntologyClass)[] = [];
    if (type === "column" && dataset?.columns) {
      items = [...dataset.columns] as DatasetColumn[];
    } else if (ontology?.classes) {
      items = [...ontology.classes] as OntologyClass[];
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

  const hasData =
    viewMode === "column"
      ? dataset?.columns && dataset.columns.length > 0
      : ontology?.classes && ontology.classes.length > 0;
  const currentList = getLabelListBySequence(viewMode);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg w-80 dark:bg-gray-800 dark:border-gray-600">
      {/* close button */}
      <div className="w-full mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">Add Object</span>
        <button
          className="text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-400"
          onClick={closeDialog}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {/* Toggle between adding an object to the ontology or dataset */}
      <div className="w-full mb-4 flex items-center justify-center">
        <SegmentedToggle
          value={viewMode}
          onChange={(val) => setViewMode(val)}
        />
      </div>
      {/* Search objects and choose sequence*/}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search..."
            aria-label="Search objects"
            className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md 
                   py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                   dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 dark:border-gray-600
                   transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="flex-shrink-0 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900
                 p-1.5 rounded-md border border-gray-300 transition-colors group
                 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 dark:hover:text-white dark:border-gray-600"
          title="Sort labels"
          aria-label="Sort labels"
          onClick={() => setSortMenuOpen(!sortMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
        </button>
        {sortMenuOpen && (
          <div
            ref={sortMenuRef}
            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20 dark:bg-gray-700 dark:border-gray-600"
          >
            {[
              { id: "BY_POSITION_START", label: "Sort by Position (Start)" },
              { id: "BY_POSITION_END", label: "Sort by Position (End)" },
              { id: "BY_NAME_ABC", label: "Sort by Name (A-Z)" },
              { id: "BY_NAME_CBA", label: "Sort by Name (Z-A)" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setSortType(
                    option.id as
                      | "BY_NAME_ABC"
                      | "BY_NAME_CBA"
                      | "BY_POSITION_START"
                      | "BY_POSITION_END",
                  );
                  setSortMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                  sortType === option.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show list of objects and ontology classes */}
      <div className="mt-4 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
        {!hasData ? (
          <div className="text-gray-500 text-sm text-center mt-4">
            {viewMode === "column"
              ? "No objects available. Please import a dataset."
              : "No ontology classes available. Please import an ontology."}
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-4 italic">
            No matches found :/
          </div>
        ) : (
          currentList.map((item) => {
            const label =
              viewMode === "column"
                ? (item as DatasetColumn).name
                : (item as OntologyClass).label;
            return (
              <button
                key={item.id}
                className={`w-full text-left text-gray-700 text-sm p-2 ${viewMode === "column" ? "hover:bg-blue-100 dark:hover:bg-blue-500" : "hover:bg-purple-100 dark:hover:bg-purple-700"} rounded cursor-pointer transition-colors dark:text-gray-300`}
                onClick={() => handleAddObject(viewMode, item)}
              >
                {label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default OntologyAddObjectDialog;
