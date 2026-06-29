import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useEdgeEdit } from "./EdgeEditContext";

const magicNumberStrokeWidth = 2.5;

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const onEdit = useEdgeEdit();

  //get the correct label for the edge, if there is a propertyLabel in the data, use it, otherwise return null
  const label = (() => {
    const raw = data?.label;
    if (!raw) return null;
    return raw.toString().split("#").pop() || raw.toString();
  })();

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
      <BaseEdge
        id={id}
        type="custom"
        path={edgePath}
        style={{
          stroke: "#FFA500",
          strokeWidth: magicNumberStrokeWidth,
        }}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        {label && (
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 26}px)`,
              pointerEvents: "none",
            }}
          >
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 text-xs border border-orange-300 shadow-sm dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700">
              <i>[{label}]</i>
            </span>
          </div>
        )}
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
            // Angepasste Klassen für Orange-Töne je nach Modus
            className="group relative px-2 py-2 rotate-45 bg-orange-200 text-orange-900 border border-orange-400 hover:bg-orange-300 dark:bg-orange-200 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-700 cursor-pointer shadow-md transition-colors duration-200"
            title="Edit Relationship"
          ></button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default CustomEdge;
