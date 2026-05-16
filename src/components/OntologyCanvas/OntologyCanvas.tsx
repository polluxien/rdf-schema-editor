import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Edge,
  type OnConnect,
  type NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppContext } from "../../hooks/useAppContext";
import OntologyClassNode from "./OntologyClassNode";
import DatasetColumnNode from "./DatasetColumnNode";
import OntologyAddObjectDialog from "./AddDialog/OntologyAddObjectDialog";

const nodeTypes: NodeTypes = {
  ontologyClass: OntologyClassNode,
  datasetColumn: DatasetColumnNode,
};

export default function OntologyCanvas() {
  //Controlling visability of the "Add Object" dialog ‚
  const [ontologyAddObjectDialog, setOntologyAddObjectDialog] = useState(false);

  const { ontology, dataset, addMapping } = useAppContext();

  // ? Man könnte später vlt einstellen ob man die Nodes automatisch anlegen will oder klassich manuell
  // ? muss aber so oder so überarbeitet werden

  /*
  const initialNodes = useMemo(() => {
    const nodes: Node[] = [];

    if (ontology) {
      ontology.classes.forEach((cls, index) => {
        nodes.push({
          id: `class-${cls.id}`,
          type: "ontologyClass",
          position: { x: 400, y: 80 + index * 120 },
          data: { label: cls.label, uri: cls.uri, classData: cls },
          is,
        });
      });
    }

    if (dataset) {
      dataset.columns.forEach((col, index) => {
        nodes.push({
          id: `column-${col.id}`,
          type: "datasetColumn",
          position: { x: 50, y: 80 + index * 80 },
          data: {
            label: col.name,
            sampleValues: col.sampleValues,
            columnData: col,
          },
        });
      });
    }

    return nodes;
  }, [ontology, dataset]);
  */

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const addNodesToCanvas = (newNode: Node) => {
    setNodes((nds) => [...nds, newNode]);
  };

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: "#a855f7" } },
          eds,
        ),
      );

      const sourceId = params.source?.replace("column-", "") || "";
      const targetId = params.target?.replace("class-", "") || "";

      if (sourceId && targetId) {
        addMapping({
          id: crypto.randomUUID(),
          sourceColumnId: sourceId,
          targetClassId: targetId,
        });
      }
    },
    [setEdges, addMapping],
  );

  /*
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  */

  const hasContent = ontology || dataset;

  return (
    <div className="flex-1 bg-gray-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-950"
      >
        <Background color="#374151" gap={20} />
        <Controls className="bg-gray-800 border-gray-600 text-white [&>button]:bg-gray-800 [&>button]:border-gray-600 [&>button]:text-white [&>button:hover]:bg-gray-700" />
        {hasContent && (
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "ontologyClass") return "#a855f7";
              if (node.type === "datasetColumn") return "#3b82f6";
              return "#6b7280";
            }}
            className="bg-gray-800 border-gray-600"
          />
        )}

        {!hasContent && (
          <Panel position="top-center" className="mt-20">
            <div className="text-center text-gray-400 bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg border border-gray-700">
              <p className="text-lg mb-2">No ontology or dataset loaded</p>
              <p className="text-sm">
                Use <strong>Import → Ontology (OWL)</strong> to load an ontology
                <br />
                and <strong>Import → CSV Dataset</strong> to load your data
              </p>
            </div>
          </Panel>
        )}

        {/* Placeholder for future "Add Object" button or other controls when content is present */}
        {!ontologyAddObjectDialog && (
          <Panel position="top-right" className="m-4">
            <button
              onClick={() => setOntologyAddObjectDialog(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-600 text-white"
            >
              Add Object
            </button>
          </Panel>
        )}

        {hasContent && (
          <Panel position="top-left" className="m-4">
            <div className="flex gap-4 text-sm">
              {dataset && (
                <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded border border-gray-700">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-gray-300">Dataset Columns</span>
                </div>
              )}
              {ontology && (
                <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded border border-gray-700">
                  <div className="w-3 h-3 rounded bg-purple-500"></div>
                  <span className="text-gray-300">Ontology Classes</span>
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
      {/* DialogComponent for adding new objects to the ontology or dataset, can be triggered from a button in the UI */}
      {ontologyAddObjectDialog && (
        <div className="absolute top-4 right-4">
          <OntologyAddObjectDialog
            addNodesToCanvas={addNodesToCanvas}
            closeDialog={() => setOntologyAddObjectDialog(false)}
          />
        </div>
      )}
    </div>
  );
}
