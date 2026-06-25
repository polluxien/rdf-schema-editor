import { useMemo, useState } from "react";
import type { Edge } from "@xyflow/react";
import { Database, Key, Link2, Search, Tags, X } from "lucide-react";
import { useAppContext } from "../../../hooks/useAppContext";
import type { ClassSubject, Mapping, OntologyClass, OntologyProperty } from "../../../types";
import { STANDARD_PROPERTIES } from "../../../lib/rdfVocabulary";

interface RelationshipDialogProps {
  selectedEdgeData: Edge;
  closeDialog: () => void;
  destroyRelationship: (mapping: Mapping | undefined) => void;
}

type LinkKind = "property" | "subject";

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
    addMapping,
    removeMapping,
    flowNodes,
    setFlowNodes,
    setFlowEdges,
    baseIri,
  } = useAppContext();
  const [query, setQuery] = useState("");

  const columnId = selectedEdgeData.source.replace("column-", "");
  const classId = selectedEdgeData.target.replace("class-", "");
  const classNodeId = `class-${classId}`;
  const column = dataset?.columns.find((c) => c.id === columnId);
  const columnName = column?.name ?? columnId;
  const ontologyClass = ontology?.classes.find((c) => c.id === classId);
  const mapping = mappings.find(
    (item) => item.sourceColumnId === columnId && item.targetClassId === classId,
  );

  const existingSubject = (
    flowNodes.find((n) => n.id === classNodeId)?.data as { subject?: ClassSubject } | undefined
  )?.subject;

  const isSubjectEdge = (selectedEdgeData.data as { kind?: string } | undefined)?.kind === "subject";

  const [linkKind, setLinkKind] = useState<LinkKind>(isSubjectEdge ? "subject" : "property");
  // Auto-fill the subject template from the workspace base IRI + class name, so
  // the user never has to paste a base URL. e.g. http://example.org/observation/{HerbariumID}
  const [subjectTemplate, setSubjectTemplate] = useState(() => {
    if (existingSubject?.mode === "template") return existingSubject.template ?? "";
    const slug = shortName(ontologyClass?.uri ?? classId).toLowerCase();
    return `${baseIri.replace(/\/+$/, "")}/${slug}/{${columnName}}`;
  });

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
    (property) => property.id === mapping?.targetPropertyId,
  );

  const setNodeSubject = (subject: ClassSubject | undefined) => {
    setFlowNodes((nds) =>
      nds.map((n) => (n.id === classNodeId ? { ...n, data: { ...n.data, subject } } : n)),
    );
  };

  const setEdgeKind = (kind: "subject" | undefined) => {
    setFlowEdges((eds) =>
      eds.map((e) =>
        e.id === selectedEdgeData.id ? { ...e, data: { ...e.data, kind } } : e,
      ),
    );
  };

  const handlePropertySelect = (propertyId?: string) => {
    // Coming back from a subject edge: restore the value mapping and clear the
    // subject this edge defined.
    let activeMapping = mapping;
    if (!activeMapping) {
      activeMapping = { id: selectedEdgeData.id, sourceColumnId: columnId, targetClassId: classId };
      addMapping(activeMapping);
    }
    if (isSubjectEdge) {
      setEdgeKind(undefined);
      setNodeSubject(undefined);
    }
    updateMappingProperty(activeMapping.id, propertyId);
  };

  const handleUseAsSubject = () => {
    setNodeSubject({ mode: "template", template: subjectTemplate.trim() });
    // A subject key is not a predicate-object pair → drop the value mapping.
    if (mapping) removeMapping(mapping.id);
    setEdgeKind("subject");
    closeDialog();
  };

  const insertPlaceholder = () => setSubjectTemplate((t) => `${t}{${columnName}}`);

  const btnBase = "rounded px-3 py-1.5 text-sm transition-colors";
  const toggleBtn = (active: boolean) =>
    `flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-blue-500 text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

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
            <Database size={13} />
            Column
          </div>
          <div className="truncate text-blue-700 dark:text-blue-300">{columnName}</div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
            <Tags size={13} />
            Class
          </div>
          <div className="truncate text-purple-700 dark:text-purple-300">
            {ontologyClass?.label ?? classId}
          </div>
        </div>
      </div>

      {/* Property vs. subject toggle */}
      <div className="flex gap-1 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <button type="button" className={toggleBtn(linkKind === "property")} onClick={() => setLinkKind("property")}>
          Map to property
        </button>
        <button type="button" className={toggleBtn(linkKind === "subject")} onClick={() => setLinkKind("subject")}>
          Subject (key)
        </button>
      </div>

      {linkKind === "subject" ? (
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-2 rounded border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-200">
            <Key size={14} className="mt-0.5 shrink-0" />
            <span>
              This column becomes the subject IRI of <b>{ontologyClass?.label ?? classId}</b>.
              Pre-filled from the workspace base IRI (change it in the top toolbar); edit the template freely.
            </span>
          </div>
          <input
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
            placeholder={`http://example.org/id/{${columnName}}`}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={insertPlaceholder}
            className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300"
          >
            {`insert {${columnName}}`}
          </button>
          <button
            type="button"
            onClick={handleUseAsSubject}
            disabled={!subjectTemplate.trim()}
            className={`${btnBase} w-full bg-purple-500 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Use as subject IRI
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-4">
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

          <div className="max-h-80 overflow-y-auto rounded border border-gray-200 dark:border-gray-800">
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => {
                const isSelected = property.id === mapping?.targetPropertyId;
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
      )}

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={() => handlePropertySelect(undefined)}
          disabled={linkKind === "subject" || !mapping?.targetPropertyId}
          className={`${btnBase} text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-gray-300 dark:hover:bg-gray-800`}
        >
          Clear
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (isSubjectEdge) {
                setFlowEdges((eds) => eds.filter((e) => e.id !== selectedEdgeData.id));
                setNodeSubject(undefined);
              } else {
                destroyRelationship(mapping);
              }
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
