import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Table } from "lucide-react";
import { useAppContext } from "../../hooks/useAppContext";

export default function DatasetTable() {
  const { dataset, focusedColumnId, setFocusedColumnId } = useAppContext();
  const columnRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleRows, setVisibleRows] = useState(5);
  const [highlightedColumnId, setHighlightedColumnId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!focusedColumnId || !dataset) return;
    setIsExpanded(true);
  }, [focusedColumnId, dataset]);

  useEffect(() => {
    if (!focusedColumnId || !isExpanded) return;

    const columnId = focusedColumnId;
    const frame = requestAnimationFrame(() => {
      columnRefs.current[columnId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setHighlightedColumnId(columnId);
      setFocusedColumnId(null);
    });

    const timer = setTimeout(() => setHighlightedColumnId(null), 2000);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [focusedColumnId, isExpanded, setFocusedColumnId]);

  if (!dataset) {
    return <></>;
  }

  const displayRows = dataset.rows.slice(0, visibleRows);

  return (
    <div className="bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-100 cursor-pointer hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Table size={16} />
          <span className="font-medium">{dataset.name}</span>
          <span className="text-gray-500 text-sm dark:text-gray-500">
            ({dataset.columns.length} columns, {dataset.rows.length} rows)
          </span>
        </div>
        <button className="text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 dark:bg-gray-800 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-500 w-12">#</th>
                {dataset.columns.map((column) => (
                  <th
                    key={column.id}
                    ref={(el) => {
                      columnRefs.current[column.id] = el;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (highlightedColumnId === column.id && isExpanded) {
                        setFocusedColumnId(null);
                        setHighlightedColumnId(null);
                      } else {
                        setFocusedColumnId(column.id);
                      }
                    }}
                    className={`px-4 py-2 font-medium border-l border-gray-200 transition-colors cursor-pointer hover:bg-gray-200/80 dark:border-gray-700 dark:hover:bg-gray-700/50 ${
                      highlightedColumnId === column.id
                        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100"
                        : ""
                    }`}
                  >
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-400">
              {displayRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-t border-gray-100 hover:bg-gray-100/80 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-600">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-2 border-l border-gray-100 truncate max-w-[200px] transition-colors dark:border-gray-800 ${
                        highlightedColumnId === dataset.columns[cellIndex]?.id
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : ""
                      }`}
                      title={cell}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Row controls sit OUTSIDE the scroll box, so they stay centered in the
          visible panel and don't move with the table's horizontal scroll. */}
      {isExpanded && dataset.rows.length > visibleRows && (
        <div className="flex justify-center gap-2 p-2 bg-gray-100 border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <button
            onClick={() =>
              setVisibleRows((prev) => Math.min(prev + 10, dataset.rows.length))
            }
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
          >
            Show more
          </button>
          {visibleRows > 5 && (
            <button
              onClick={() => setVisibleRows(5)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
