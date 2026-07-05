import { useMemo, useState } from "react";
import type { Edge } from "@xyflow/react";
import { Link2, Search, Tags, X } from "lucide-react";
import { useAppContext } from "../../../hooks/useAppContext";
import type { ClassRelation, OntologyClass, OntologyProperty } from "../../../types";
import { STANDARD_PROPERTIES } from "../../../lib/rdfVocabulary";

interface ClassRelationshipDialogProps {
  selectedEdgeData: Edge;
  closeDialog: () => void;
  destroyRelationship: (relation: ClassRelation | undefined) => void;
}

function shortName(uri: string): string {
  return uri.split(/[#/]/).pop() || uri;
}

/**
 * Object properties usable as a class→class predicate: object-typed properties
 * reachable from the source class hierarchy, plus the standard object
 * properties. Properties whose range matches the target class are surfaced
 * first.
 */
function getObjectProperties(
  sourceClass: OntologyClass | undefined,
  targetClass: OntologyClass | undefined,
  classes: OntologyClass[],
): OntologyProperty[] {
  if (!sourceClass) return [];

  const classByUri = new Map(classes.map((cls) => [cls.uri, cls]));
  const visited = new Set<string>();
  const properties = new Map<string, OntologyProperty>();

  const collect = (cls: OntologyClass) => {
    if (visited.has(cls.uri)) return;
    visited.add(cls.uri);
    for (const property of cls.properties) {
      if (property.type === "object") properties.set(property.id, property);
    }
    for (const parentUri of cls.subClassOfUris) {
      const parent = classByUri.get(parentUri);
      if (parent) collect(parent);
    }
  };
  collect(sourceClass);

  for (const property of STANDARD_PROPERTIES) {
    if (property.type === "object" && !properties.has(property.id)) {
      properties.set(property.id, property);
    }
  }

  const targetUri = targetClass?.uri;
  const rangeMatches = (property: OntologyProperty): boolean =>
    !!targetUri &&
    [...(property.rangeUris ?? []), property.rangeUri].filter(Boolean).includes(targetUri);

  return [...properties.values()].sort((a, b) => {
    // Range-matching properties first, then alphabetical.
    const byRange = Number(rangeMatches(b)) - Number(rangeMatches(a));
    if (byRange !== 0) return byRange;
    return (a.label ?? shortName(a.uri)).localeCompare(b.label ?? shortName(b.uri));
  });
}

function ClassRelationshipDialog({
  selectedEdgeData,
  closeDialog,
  destroyRelationship,
}: ClassRelationshipDialogProps) {
  const { ontology, relations, updateRelationProperty } = useAppContext();
  const [query, setQuery] = useState("");

  const sourceClassId = selectedEdgeData.source.replace("class-", "");
  const targetClassId = selectedEdgeData.target.replace("class-", "");
  const sourceClass = ontology?.classes.find((c) => c.id === sourceClassId);
  const targetClass = ontology?.classes.find((c) => c.id === targetClassId);
  const relation = relations.find((r) => r.id === selectedEdgeData.id);

  const availableProperties = useMemo(
    () => getObjectProperties(sourceClass, targetClass, ontology?.classes ?? []),
    [sourceClass, targetClass, ontology?.classes],
  );

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return availableProperties;
    return availableProperties.filter((property) =>
      [property.label, property.uri, property.comment]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [availableProperties, query]);

  const handleSelect = (propertyId?: string) => {
    if (!relation) return;
    updateRelationProperty(relation.id, propertyId);
  };

  const btnBase = "rounded px-3 py-1.5 text-sm transition-colors";

  return (
    <div className="w-[min(92vw,520px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Link2 size={18} className="text-orange-500" />
          <h2 className="text-sm font-semibold">Object relationship</h2>
        </div>
        <button
          type="button"
          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          onClick={closeDialog}
          aria-label="Close relationship dialog"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
            <Tags size={13} />
            From
          </div>
          <div className="truncate text-purple-700 dark:text-purple-300">
            {sourceClass?.label ?? sourceClassId}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
            <Tags size={13} />
            To
          </div>
          <div className="truncate text-purple-700 dark:text-purple-300">
            {targetClass?.label ?? targetClassId}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search object properties"
            className="w-full rounded border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded border border-gray-200 dark:border-gray-800">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((property) => {
              const isSelected = property.id === relation?.propertyId;
              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handleSelect(property.id)}
                  className={`w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 dark:border-gray-800 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
                  }`}
                >
                  <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {property.label ?? shortName(property.uri)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">{property.uri}</div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              No object properties available for this class.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={() => handleSelect(undefined)}
          disabled={!relation?.propertyId}
          className={`${btnBase} text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-gray-300 dark:hover:bg-gray-800`}
        >
          Clear
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              destroyRelationship(relation);
              closeDialog();
            }}
            className={`${btnBase} bg-red-500 text-white hover:bg-red-700`}
          >
            Break Link
          </button>
          <button
            type="button"
            onClick={closeDialog}
            className={`${btnBase} bg-blue-500 text-white hover:bg-blue-700`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClassRelationshipDialog;
