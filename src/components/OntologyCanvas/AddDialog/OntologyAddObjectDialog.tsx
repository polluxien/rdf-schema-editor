import { useEffect, useRef, useState } from "react";
import { SegmentedToggle } from "./ToggleComponent";
import { useAppContext } from "../../../hooks/useAppContext";
import type { DatasetColumn, OntologyClass } from "../../../types";

interface OntologyAddObjectDialogProps {
  addNodesToCanvas: (newNode: Node) => void;
  closeDialog: () => void;
}

function OntologyAddObjectDialog({
  addNodesToCanvas,
  closeDialog,
}: OntologyAddObjectDialogProps) {
  const { ontology, dataset } = useAppContext();

  const [viewMode, setViewMode] = useState<"object" | "ontology">("object");

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
  const handleAddObject = (type: "object" | "ontology", obj: unknown) => {
    let newNode: Node;

    // TODO: Dynamische Positionierung implementieren
    const basePosition = { x: 50, y: 80 };

    if (type === "object") {
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
    type: "object" | "ontology",
  ): (DatasetColumn | OntologyClass)[] => {
    // get list
    let items: (DatasetColumn | OntologyClass)[] = [];
    if (type === "object" && dataset?.columns) {
      items = [...dataset.columns] as DatasetColumn[];
    } else if (ontology?.classes) {
      items = [...ontology.classes] as OntologyClass[];
    }

    //filter by search term
    if (searchTerm !== "" && items.length > 0) {
      items = items.filter((item) => {
        const label =
          viewMode === "object"
            ? (item as DatasetColumn).name
            : (item as OntologyClass).label;
        return label.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // sort by name or position
    items.sort((a, b) => {
      const labelA =
        viewMode === "object"
          ? (a as DatasetColumn).name
          : (a as OntologyClass).label;
      const labelB =
        viewMode === "object"
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

  const createID = (label: unknown) => {
    return (
      // eslint-disable-next-line react-hooks/purity
      (label as string).toLowerCase() + Math.random().toString(36).substr(2, 5)
    );
  };

  const hasData =
    viewMode === "object"
      ? dataset?.columns && dataset.columns.length > 0
      : ontology?.classes && ontology.classes.length > 0;
  const currentList = getLabelListBySequence(viewMode);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg w-80">
      {/* close button */}
      <div className="w-full mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
        <span className="text-sm font-medium text-gray-200">Add Object</span>
        <button
          className="text-gray-400 hover:text-red-400 transition-colors"
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
            className="w-full bg-gray-700 text-gray-200 placeholder:text-gray-500 border border-gray-600 rounded-md 
                   py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 
                   transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white 
                 p-1.5 rounded-md border border-gray-600 transition-colors group"
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
            className="absolute right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-20"
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
                    : "text-gray-300 hover:bg-gray-600 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show list of objects and ontology classes */}
      <div className="mt-4 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600">
        {!hasData ? (
          <div className="text-gray-500 text-sm text-center mt-4">
            {viewMode === "object"
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
              viewMode === "object"
                ? (item as DatasetColumn).name
                : (item as OntologyClass).label;
            return (
              <button
                key={createID(label)}
                className={` w-full text-left text-gray-300 text-sm p-2 ${viewMode === "object" ? "hover:bg-blue-500" : "hover:bg-purple-700"} rounded cursor-pointer transition-colors`}
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
