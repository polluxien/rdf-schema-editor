import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface OntologyClassNodeData {
  label: string;
  uri: string;
}

function OntologyClassNode({ data }: NodeProps) {
  const nodeData = data as unknown as OntologyClassNodeData;
  
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
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-600"
      />
    </div>
  );
}

export default memo(OntologyClassNode);
