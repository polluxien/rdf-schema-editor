import type { Edge } from "@xyflow/react";
import { useAppContext } from "../../../hooks/useAppContext";
import type { OntologyClass } from "../../../types";
interface RelationshipDialogProps {
  selectedEdgeData: Edge;
  closeDialog: () => void;
}

function RelationshipDialog({
  selectedEdgeData,
  closeDialog,
}: RelationshipDialogProps) {
  const { dataset, ontology } = useAppContext();

  const columnId = selectedEdgeData.source.replace("column-", "");
  const classId = selectedEdgeData.target.replace("class-", "");
  const column = dataset?.columns.find((c) => c.id === columnId);
  const ontologyClass: OntologyClass | undefined = ontology?.classes.find(
    (c) => c.id === classId,
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg w-80 dark:bg-gray-800 dark:border-gray-600">
      <div className="w-full mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">Relationship</span>
        <button
          type="button"
          className="text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-400"
          onClick={closeDialog}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <div>
          <span className="text-gray-500 block text-xs mb-1">
            Dataset column
          </span>
          <span className="text-blue-400">{column?.name ?? columnId}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs mb-1">
            Ontology class
          </span>
          <span className="text-purple-400">
            {ontologyClass?.label ?? classId}
          </span>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {ontologyClass ? (
            <>
              {/* --- NORMALANSICHT --- */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2 dark:text-gray-100">
                  Details für: {ontologyClass.label}
                </h3>

                {/* Properties Section */}
                <div className="mb-4">
                  <span className="text-gray-500 block text-xs font-bold uppercase tracking-wider mb-1">
                    Properties
                  </span>
                  {ontologyClass.properties.length > 0 ? (
                    ontologyClass.properties.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-start gap-2 mb-2 pl-2 border-l-2 border-purple-500"
                      >
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 flex-shrink-0"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {property.label || "Kein Label"}
                          </div>
                          <div className="text-xs text-purple-600 break-all">
                            {property.uri}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                            Domain:{" "}
                            {property.domainUri
                              ? property.domainUri.split("#").pop()
                              : "-"}{" "}
                            | Range:{" "}
                            {property.rangeUri
                              ? property.rangeUri.split("#").pop()
                              : "-"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-sm">
                      Keine Properties gefunden für diese Klasse.
                    </span>
                  )}
                </div>

                {/* Subclasses Section */}
                <div>
                  <span className="text-gray-500 block text-xs font-bold uppercase tracking-wider mb-1">
                    Subclasses (Vererbung)
                  </span>
                  {ontologyClass.subClassOfUris &&
                  ontologyClass.subClassOfUris.length > 0 ? (
                    ontologyClass.subClassOfUris.map((subClassUri) => (
                      <div
                        key={subClassUri}
                        className="flex items-start gap-2 mb-1 pl-2 border-l-2 border-green-500"
                      >
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                        <span className="text-xs text-gray-600 break-all dark:text-gray-400">
                          {subClassUri}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-sm">
                      Keine Subclasses definiert.
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-gray-500 italic">
              Class not found in ontology
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RelationshipDialog;
