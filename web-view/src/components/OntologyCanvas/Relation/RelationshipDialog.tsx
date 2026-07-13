import { useMemo, useState } from "react";
import type { Edge } from "@xyflow/react";
import { ArrowRightLeft, Database, Link2, Search, Tags, X } from "lucide-react";
import { useAppContext } from "../../../hooks/useAppContext";
import type { LinearTransformation, Mapping, OntologyClass, OntologyProperty } from "../../../types";
import { STANDARD_PROPERTIES } from "../../../lib/rdfVocabulary";

interface PredefinedConversion {
  label: string;
  factor: number;
  offset: number;
}

const PREDEFINED_CONVERSIONS: PredefinedConversion[] = [
  { label: "Inches → cm",       factor: 2.54,       offset: 0 },
  { label: "cm → Inches",       factor: 0.393701,   offset: 0 },
  { label: "Feet → Meters",     factor: 0.3048,     offset: 0 },
  { label: "Meters → Feet",     factor: 3.28084,    offset: 0 },
  { label: "kg → lb",           factor: 2.20462,    offset: 0 },
  { label: "lb → kg",           factor: 0.453592,   offset: 0 },
  { label: "°C → °F",           factor: 1.8,        offset: 32 },
  { label: "°F → °C",           factor: 0.555556,   offset: -17.777778 },
  { label: "Miles → km",        factor: 1.60934,    offset: 0 },
  { label: "km → Miles",        factor: 0.621371,   offset: 0 },
];

const CUSTOM_KEY = "__custom__";

interface RelationshipDialogProps {
  selectedEdgeData: Edge;
  closeDialog: () => void;
  destroyRelationship: (mapping: Mapping | undefined) => void;
}

/** Format a number for display: trim unnecessary trailing zeros. */
function fmt(n: number): string {
  return parseFloat(n.toPrecision(7)).toString();
}

function shortName(uri: string): string {
  return uri.split(/[#/]/).pop() || uri;
}

function propertyTypeLabel(type: OntologyProperty["type"]): string {
  if (type === "datatype") return "Datatype";
  if (type === "annotation") return "Annotation";
  return "Object";
}

function addStandardProperties(properties: Map<string, OntologyProperty>) {
  for (const p of STANDARD_PROPERTIES) {
    if (!properties.has(p.id)) properties.set(p.id, p);
  }
}

function getAvailableProperties(
  ontologyClass: OntologyClass | undefined,
  classes: OntologyClass[],
): OntologyProperty[] {
  if (!ontologyClass) return [];

  const classByUri = new Map(classes.map((cls) => [cls.uri, cls]));
  const visited = new Set<string>();
  const properties = new Map<string, OntologyProperty>();

  const collect = (cls: OntologyClass) => {
    if (visited.has(cls.uri)) return;
    visited.add(cls.uri);

    for (const property of cls.properties) {
      properties.set(property.id, property);
    }

    for (const parentUri of cls.subClassOfUris) {
      const parent = classByUri.get(parentUri);
      if (parent) collect(parent);
    }
  };

  collect(ontologyClass);
  addStandardProperties(properties);

  return [...properties.values()].sort((a, b) =>
    (a.label ?? shortName(a.uri)).localeCompare(b.label ?? shortName(b.uri)),
  );
}

function RelationshipDialog({
  selectedEdgeData,
  closeDialog,
  destroyRelationship,
}: RelationshipDialogProps) {
  const {
    dataset,
    ontology,
    mappings,
    updateMappingProperty,
    updateMappingTransformation,
    addMapping,
  } = useAppContext();
  const [query, setQuery] = useState("");

  const [showTransform, setShowTransform] = useState(false);
  const [selectedConversionKey, setSelectedConversionKey] = useState<string>("");
  const [customFactor, setCustomFactor] = useState("1");
  const [customOffset, setCustomOffset] = useState("0");

  const classId = selectedEdgeData.source.replace("class-", "");
  const columnId = selectedEdgeData.target.replace("column-", "");
  const column = dataset?.columns.find((c) => c.id === columnId);
  const columnName = column?.name ?? columnId;
  const ontologyClass = ontology?.classes.find((c) => c.id === classId);
  const mapping = mappings.find((item) => item.id === selectedEdgeData.id);

  const availableProperties = useMemo(
    () => getAvailableProperties(ontologyClass, ontology?.classes ?? []),
    [ontologyClass, ontology?.classes],
  );

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return availableProperties;

    return availableProperties.filter((property) => {
      const haystack = [
        property.label,
        property.uri,
        property.comment,
        property.type,
        ...(property.domainUris ?? []),
        ...(property.rangeUris ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [availableProperties, query]);

  const selectedProperty = availableProperties.find(
    (property) => property.id === mapping?.propertyId,
  );

  // Sync local transformation state from the persisted mapping whenever the
  // dialog opens for a different edge.
  useMemo(() => {
    const t = mapping?.transformation;
    if (!t) {
      setSelectedConversionKey("");
      setCustomFactor("1");
      setCustomOffset("0");
      setShowTransform(false);
      return;
    }
    const preset = PREDEFINED_CONVERSIONS.find(
      (c) => c.factor === t.factor && c.offset === t.offset,
    );
    if (preset) {
      setSelectedConversionKey(preset.label);
    } else {
      setSelectedConversionKey(CUSTOM_KEY);
      setCustomFactor(String(t.factor));
      setCustomOffset(String(t.offset));
    }
    setShowTransform(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping?.id]);

  const handleConversionChange = (key: string) => {
    setSelectedConversionKey(key);
    if (!key) {
      applyTransformation(undefined);
      return;
    }
    if (key === CUSTOM_KEY) return; // wait for user to confirm custom values
    const preset = PREDEFINED_CONVERSIONS.find((c) => c.label === key);
    if (preset) {
      applyTransformation({ label: preset.label, factor: preset.factor, offset: preset.offset });
    }
  };

  const applyTransformation = (transformation: LinearTransformation | undefined) => {
    let activeMapping = mapping;
    if (!activeMapping) {
      activeMapping = { id: selectedEdgeData.id, sourceId: classId, targetId: columnId };
      addMapping(activeMapping);
    }
    updateMappingTransformation(activeMapping.id, transformation);
  };

  const handleCustomApply = () => {
    const factor = parseFloat(customFactor);
    const offset = parseFloat(customOffset);
    if (!Number.isFinite(factor) || !Number.isFinite(offset)) return;
    applyTransformation({ factor, offset });
  };

  const handleClearTransformation = () => {
    setSelectedConversionKey("");
    setCustomFactor("1");
    setCustomOffset("0");
    applyTransformation(undefined);
  };

  const handlePropertySelect = (propertyId?: string) => {
    let activeMapping = mapping;
    if (!activeMapping) {
      activeMapping = { id: selectedEdgeData.id, sourceId: classId, targetId: columnId };
      addMapping(activeMapping);
    }
    updateMappingProperty(activeMapping.id, propertyId);
  };

  const btnBase = "rounded px-3 py-1.5 text-sm transition-colors";

  return (
    <div className="w-[min(92vw,520px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Link2 size={18} className="text-orange-500" />
          <h2 className="text-sm font-semibold">Relationship</h2>
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
            Class
          </div>
          <div className="truncate text-purple-700 dark:text-purple-300">
            {ontologyClass?.label ?? classId}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
            <Database size={13} />
            Column
          </div>
          <div className="truncate text-blue-700 dark:text-blue-300">{columnName}</div>
        </div>
      </div>

      <div className="space-y-3 p-4">
          <div className="rounded border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-200">
            Select the <b>uri</b> property to make this column the subject IRI of{" "}
            <b>{ontologyClass?.label ?? classId}</b>; any other property maps it to a value.
          </div>
          {selectedProperty && (
            <div className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm dark:border-orange-900/60 dark:bg-orange-950/30">
              <span className="text-xs font-medium uppercase text-orange-700 dark:text-orange-300">
                Selected property
              </span>
              <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {selectedProperty.label ?? shortName(selectedProperty.uri)}
              </div>
            </div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search properties"
              className="w-full rounded border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          {/* Transformation section */}
          <div className="rounded border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowTransform((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-teal-500" />
                Linear Transformation
                {mapping?.transformation && (
                  <span className="ml-1 rounded bg-teal-100 px-1.5 py-0.5 text-xs text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                    {mapping.transformation.label ??
                      `×${fmt(mapping.transformation.factor)} +${fmt(mapping.transformation.offset)}`}
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-400">{showTransform ? "▲" : "▼"}</span>
            </button>

            {showTransform && (
              <div className="space-y-2 border-t border-gray-200 px-3 pb-3 pt-2 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Applies <span className="font-mono">output = factor × input + offset</span> to
                  the column value before it is written as an RDF literal.
                </p>

                <select
                  value={selectedConversionKey}
                  onChange={(e) => handleConversionChange(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white py-1.5 px-2 text-sm text-gray-900 outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="">— No transformation —</option>
                  {PREDEFINED_CONVERSIONS.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                  <option value={CUSTOM_KEY}>Custom…</option>
                </select>

                {selectedConversionKey === CUSTOM_KEY && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Factor (a)</label>
                        <input
                          type="number"
                          value={customFactor}
                          onChange={(e) => setCustomFactor(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Offset (b)</label>
                        <input
                          type="number"
                          value={customOffset}
                          onChange={(e) => setCustomOffset(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <div className="rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      y = {customFactor || "a"} × x + {customOffset || "b"}
                    </div>
                    <button
                      type="button"
                      onClick={handleCustomApply}
                      disabled={
                        !Number.isFinite(parseFloat(customFactor)) ||
                        !Number.isFinite(parseFloat(customOffset))
                      }
                      className="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {selectedConversionKey && selectedConversionKey !== CUSTOM_KEY && (
                  <div className="rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {(() => {
                      const p = PREDEFINED_CONVERSIONS.find((c) => c.label === selectedConversionKey)!;
                      return `y = ${fmt(p.factor)} × x + ${fmt(p.offset)}`;
                    })()}
                  </div>
                )}

                {mapping?.transformation && (
                  <button
                    type="button"
                    onClick={handleClearTransformation}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove transformation
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto rounded border border-gray-200 dark:border-gray-800">
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => {
                const isSelected = property.id === mapping?.propertyId;
                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => handlePropertySelect(property.id)}
                    className={`w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 dark:border-gray-800 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/40"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                          {property.label ?? shortName(property.uri)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-gray-500">{property.uri}</div>
                      </div>
                      <span className="shrink-0 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {propertyTypeLabel(property.type)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500">
                      {(property.domainUris ?? []).map((domainUri) => (
                        <span
                          key={`${property.id}-domain-${domainUri}`}
                          className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                        >
                          {shortName(domainUri)}
                        </span>
                      ))}
                      {(property.rangeUris ?? []).map((rangeUri) => (
                        <span
                          key={`${property.id}-range-${rangeUri}`}
                          className="rounded bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                        >
                          {shortName(rangeUri)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No properties available for this class.
              </div>
            )}
          </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={() => handlePropertySelect(undefined)}
          disabled={!mapping?.propertyId}
          className={`${btnBase} text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-gray-300 dark:hover:bg-gray-800`}
        >
          Clear
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              destroyRelationship(mapping);
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

export default RelationshipDialog;
