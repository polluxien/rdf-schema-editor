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
    return (
      <div className="bg-gray-900 border-t border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <div className="flex items-center gap-2 text-gray-400">
            <Table size={16} />
            <span className="font-medium">Dataset</span>
          </div>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p>No dataset loaded</p>
          <p className="text-sm mt-1">
            Import a CSV file to view your data here
          </p>
        </div>
      </div>
    );
  }

  const displayRows = dataset.rows.slice(0, visibleRows);

  return (
    <div className="bg-gray-900 border-t border-gray-700">
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-800 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-gray-300">
          <Table size={16} />
          <span className="font-medium">{dataset.name}</span>
          <span className="text-gray-500 text-sm">
            ({dataset.columns.length} columns, {dataset.rows.length} rows)
          </span>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-800 text-gray-300 sticky top-0">
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
                    className={`px-4 py-2 font-medium border-l border-gray-700 transition-colors cursor-pointer hover:bg-gray-700/50 ${
                      highlightedColumnId === column.id
                        ? "bg-blue-900/60 text-blue-100"
                        : ""
                    }`}
                  >
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-400">
              {displayRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-t border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="px-4 py-2 text-gray-600">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-2 border-l border-gray-800 truncate max-w-[200px] transition-colors ${
                        highlightedColumnId === dataset.columns[cellIndex]?.id
                          ? "bg-blue-900/30"
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

          {dataset.rows.length > visibleRows && (
            <div className="flex justify-center gap-2 p-2 bg-gray-800 border-t border-gray-700">
              <button
                onClick={() =>
                  setVisibleRows((prev) =>
                    Math.min(prev + 10, dataset.rows.length),
                  )
                }
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
              >
                Show more
              </button>
              {visibleRows > 5 && (
                <button
                  onClick={() => setVisibleRows(5)}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
