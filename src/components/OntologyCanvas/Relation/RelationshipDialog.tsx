import type { Edge } from "@xyflow/react";
import { useState } from "react";
import { useAppContext } from "../../../hooks/useAppContext";
import type { OntologyClass, OntologyProperty } from "../../../types";

interface RelationshipDialogProps {
  selectedEdgeData: Edge;
  edgeData: Edge;
  destroyRelationship: (id: string) => void;
  closeDialog: () => void;
}

function RelationshipDialog({
  selectedEdgeData,
  edgeData,
  destroyRelationship,
  closeDialog,
}: RelationshipDialogProps) {
  const { dataset, ontology } = useAppContext();

  const columnId = selectedEdgeData.source.replace("column-", "");
  const classId = selectedEdgeData.target.replace("class-", "");
  const column = dataset?.columns.find((c) => c.id === columnId);
  const ontologyClass: OntologyClass | undefined = ontology?.classes.find(
    (c) => c.id === classId,
  );

  const [selectedProperty, setSelectedProperty] =
    useState<OntologyProperty | null>(ontologyClass?.properties[0] ?? null);

  const setEdgeHasMapping = (hasMapping: boolean) => {
    // This function can be used to update the edge's visual state based on whether a mapping exists.
    // For example, you could add a property to the edge data and use it to conditionally style the edge in the graph.
    // Example:
    // edgeData.hasMapping = hasMapping;
    // Then, in your graph rendering logic, you could check edge.hasMapping to apply different styles.
  };

  edgeData.selected = false; // Ensure the edge is marked as selected when the dialog is open

  const handleSave = () => {
    // attach selectedProperty to edge data here
    closeDialog();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101"
            />
          </svg>
          Mapping
        </div>
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Close"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Column ↔ Class */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
            Dataset column
          </div>
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {column?.name ?? columnId}
          </div>
          {column?.type && (
            <div className="text-xs text-gray-400 mt-0.5">{column.type}</div>
          )}
        </div>

        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7l5 5-5 5M6 12h12"
          />
        </svg>

        <div className="flex-1 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
            OWL class
          </div>
          <div className="text-sm font-medium text-purple-500 dark:text-purple-400">
            {ontologyClass?.label ?? classId}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">owl:Class</div>
        </div>
      </div>

      {/* Property selection */}
      <div className="px-4 pb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Map via property
        </div>

        {ontologyClass && ontologyClass.properties.length > 0 ? (
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {ontologyClass.properties.map((property) => {
              const isSelected = selectedProperty?.id === property.id;
              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => {
                    setEdgeHasMapping(true);
                    setSelectedProperty(property);
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 border transition-colors ${
                    isSelected
                      ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500"
                      : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className={`text-sm font-medium ${isSelected ? "text-purple-700 dark:text-purple-300" : "text-gray-800 dark:text-gray-100"}`}
                      >
                        {property.label || property.uri.split("#").pop()}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${isSelected ? "text-purple-500 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"}`}
                      >
                        {property.rangeUri
                          ? property.rangeUri.split("#").pop()
                          : "—"}
                        {" → "}
                        {property.domainUri
                          ? property.domainUri.split("#").pop()
                          : "—"}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? "border-purple-500 bg-purple-500"
                          : "border-gray-300 dark:border-gray-500"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            No properties found for this class.
          </p>
        )}

        {/* Subclass hint */}
        {ontologyClass?.subClassOfUris &&
          ontologyClass.subClassOfUris.length > 0 && (
            <div className="mt-2.5 flex items-start gap-1.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
              <svg
                className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"
                />
              </svg>
              <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                Subclass of:{" "}
                {ontologyClass.subClassOfUris
                  .map((uri) => (
                    <span
                      key={uri}
                      className="text-gray-600 dark:text-gray-300 font-medium"
                    >
                      {uri.split("#").pop()}
                    </span>
                  ))
                  .reduce<React.ReactNode[]>(
                    (acc, el, i) => (i === 0 ? [el] : [...acc, " · ", el]),
                    [],
                  )}
              </div>
            </div>
          )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={destroyRelationship(selectedEdgeData.id)}
          className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        >
          <svg
            className="w-4 h-4 inline-block mr-1 -mt-px"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedProperty}
          className="flex-1 py-2 text-sm rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors font-medium"
        >
          Save mapping
        </button>
      </div>
    </div>
  );
}

export default RelationshipDialog;
