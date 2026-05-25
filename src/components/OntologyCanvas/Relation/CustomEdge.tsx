import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useEdgeEdit } from "./EdgeEditContext";

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
}: EdgeProps) {
  const onEdit = useEdgeEdit();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} interactionWidth={20} />
      <EdgeLabelRenderer>
        <div
          className={`edge-label nodrag nopan ${selected ? "selected" : ""}`}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(id);
            }}
            className="group relative px-2 py-2 rotate-45 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer shadow-md transition-colors duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            title="Edit Relationship"
          >
            {/*
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
              Edit Relationship
            </span>
            */}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default CustomEdge;
