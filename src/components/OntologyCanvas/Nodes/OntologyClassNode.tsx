import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key } from "lucide-react";
import type { ClassSubject } from "../../../types";

interface OntologyClassNodeData {
  label: string;
  uri: string;
  subject?: ClassSubject;
}

/** Short, human-readable description of the configured subject. */
function subjectSummary(subject: ClassSubject): string {
  if (subject.mode === "column") return `IRI from column: ${subject.column ?? "?"}`;
  if (subject.mode === "blankNode") return `blank node${subject.template ? `: ${subject.template}` : ""}`;
  return subject.template || "(empty template)";
}

function OntologyClassNode({ data }: NodeProps) {
  const nodeData = data as unknown as OntologyClassNodeData;
  const subject = nodeData.subject;

  return (
    <div className="bg-purple-50 border-2 border-purple-400 rounded-lg px-4 py-3 min-w-[180px] shadow-lg dark:bg-purple-900 dark:border-purple-500">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-600"
      />
      <div className="text-purple-950 font-medium text-sm dark:text-white">{nodeData.label}</div>
      <div className="text-purple-700 text-xs mt-1 truncate max-w-[200px] dark:text-purple-300" title={nodeData.uri}>
        {nodeData.uri}
      </div>
      {subject && (
        <div
          className="mt-2 flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[11px] text-purple-800 dark:bg-purple-950/60 dark:text-purple-200"
          title={subjectSummary(subject)}
        >
          <Key size={11} className="shrink-0" />
          <span className="truncate max-w-[170px] font-mono">{subjectSummary(subject)}</span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-600"
      />
    </div>
  );
}

export default memo(OntologyClassNode);
