import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface OntologyClassNodeData {
  label: string;
  uri: string;
}

function OntologyClassNode({ data }: NodeProps) {
  const nodeData = data as unknown as OntologyClassNodeData;
  
  return (
    <div className="bg-purple-900 border-2 border-purple-500 rounded-lg px-4 py-3 min-w-[180px] shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-purple-600"
      />
      <div className="text-white font-medium text-sm">{nodeData.label}</div>
      <div className="text-purple-300 text-xs mt-1 truncate max-w-[200px]" title={nodeData.uri}>
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
