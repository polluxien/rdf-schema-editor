import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface DatasetColumnNodeData {
  label: string;
  sampleValues: string[];
}

function DatasetColumnNode({ data }: NodeProps) {
  const nodeData = data as unknown as DatasetColumnNodeData;

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg px-4 py-3 min-w-[150px] shadow-lg dark:bg-blue-900 dark:border-blue-500">
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-600"
      />
      <div className="text-blue-950 font-medium text-sm dark:text-white">{nodeData.label}</div>
      {nodeData.sampleValues && nodeData.sampleValues.length > 0 && (
        <div className="text-blue-700 text-xs mt-1 truncate max-w-[150px] dark:text-blue-300">
          e.g., {nodeData.sampleValues.filter(Boolean).slice(0, 2).join(", ")}
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-600"
      />
    </div>
  );
}

export default memo(DatasetColumnNode);
