import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useEdgeEdit } from "./EdgeEditContext";

const magicNumberStrokeWidth = 4;

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
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, strokeWidth: magicNumberStrokeWidth }}
        interactionWidth={20}
      />
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
