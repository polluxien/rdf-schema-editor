import { useMemo, useState } from "react";
import { Key, Tags, X } from "lucide-react";
import { useAppContext } from "../../../hooks/useAppContext";
import type { ClassSubject } from "../../../types";

interface SubjectDialogProps {
  nodeId: string;
  closeDialog: () => void;
}

const MODES: { id: ClassSubject["mode"]; label: string; hint: string }[] = [
  { id: "template", label: "Template IRI", hint: "Build an IRI from columns, e.g. http://ex.org/obs/{ID}" },
  { id: "column", label: "Column as IRI", hint: "A column whose value is already a full IRI" },
  { id: "blankNode", label: "Blank node", hint: "Anonymous node, optionally keyed by a {Column} template" },
];

/** Replace {Column} placeholders with the first sample value, for a preview. */
function previewTemplate(template: string, sampleByColumn: Map<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, col) => sampleByColumn.get(col) ?? `{${col}}`);
}

function SubjectDialog({ nodeId, closeDialog }: SubjectDialogProps) {
  const { dataset, flowNodes, setFlowNodes } = useAppContext();

  const node = flowNodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as { label?: string; uri?: string; subject?: ClassSubject } | undefined;
  const existing = nodeData?.subject;

  const [mode, setMode] = useState<ClassSubject["mode"]>(existing?.mode ?? "template");
  const [template, setTemplate] = useState(existing?.template ?? "");
  const [column, setColumn] = useState(existing?.column ?? "");

  const columns = useMemo(() => dataset?.columns ?? [], [dataset?.columns]);
  const sampleByColumn = useMemo(
    () => new Map(columns.map((c) => [c.name, c.sampleValues[0] ?? ""])),
    [columns],
  );

  const insertPlaceholder = (name: string) => setTemplate((t) => `${t}{${name}}`);

  const preview = useMemo(() => {
    if (mode === "column") return sampleByColumn.get(column) || "(column value)";
    if (!template) return "(empty)";
    return previewTemplate(template, sampleByColumn);
  }, [mode, template, column, sampleByColumn]);

  const canSave = mode === "column" ? !!column : mode === "blankNode" ? true : !!template.trim();

  const handleSave = () => {
    const subject: ClassSubject =
      mode === "column"
        ? { mode, column }
        : { mode, template: template.trim() };

    setFlowNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, subject } } : n)),
    );
    closeDialog();
  };

  const btnBase = "rounded px-3 py-1.5 text-sm transition-colors";

  return (
    <div className="w-[min(92vw,520px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Key size={18} className="text-purple-500" />
          <h2 className="text-sm font-semibold">Subject</h2>
        </div>
        <button
          type="button"
          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          onClick={closeDialog}
          aria-label="Close subject dialog"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-950">
        <Tags size={13} className="text-purple-500" />
        <span className="truncate text-purple-700 dark:text-purple-300">
          {nodeData?.label ?? nodeId}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              title={m.hint}
              className={`rounded border px-2 py-1.5 text-xs transition-colors ${
                mode === m.id
                  ? "border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Template / blank-node template input */}
        {(mode === "template" || mode === "blankNode") && (
          <div className="space-y-2">
            <input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={mode === "template" ? "http://example.org/obs/{ID}" : "obs_{ID}"}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
            {columns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {columns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => insertPlaceholder(c.name)}
                    className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
                  >
                    {`{${c.name}}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Column-as-IRI selector */}
        {mode === "column" && (
          <select
            value={column}
            onChange={(e) => setColumn(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">Select a column…</option>
            {columns.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {/* Live preview */}
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs font-medium uppercase text-gray-500">Preview</div>
          <div className="mt-1 truncate font-mono text-xs text-gray-800 dark:text-gray-200" title={preview}>
            {mode === "blankNode" ? `_:${preview}` : preview}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={closeDialog}
          className={`${btnBase} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`${btnBase} bg-purple-500 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default SubjectDialog;
