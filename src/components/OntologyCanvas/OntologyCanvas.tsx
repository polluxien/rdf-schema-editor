import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type NodeTypes,
  type OnConnect,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppContext } from "../../hooks/useAppContext";
import OntologyClassNode from "./Nodes/OntologyClassNode";
import OntologyAddObjectDialog from "./AddObjectDialog/OntologyAddObjectDialog";
import DatasetColumnNode from "./Nodes/DatasetColumnNode";
import NodeContextMenu from "./Nodes/NodeContextMenu";

const nodeTypes: NodeTypes = {
  ontologyClass: OntologyClassNode,
  datasetColumn: DatasetColumnNode,
};

export default function OntologyCanvas() {
  const { setFocusedColumnId } = useAppContext();

  const [ontologyAddObjectDialog, setOntologyAddObjectDialog] = useState(false);
  //State context menu for colume Header nodes
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const {
    ontology,
    dataset,
    addMapping,
    flowNodes,
    flowEdges,
    setFlowNodes,
    setFlowEdges,
  } = useAppContext();

  //* Handlers for react flow changes (nodes, edges, connections)
  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      setFlowNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setFlowNodes],
  );

  const addNodesToCanvas = (newNode: Node) => {
    setFlowNodes((nds) => [...nds, newNode]);
  };

  /*
  const getNodeById = (id: string) => {
    return flowNodes.find((node) => node.id === id);
  };
  */

  const deleteNode = (id: string) => {
    setFlowNodes((nds) => nds.filter((node) => node.id !== id));
    setFlowEdges((eds) =>
      eds.filter((edge) => edge.source !== id && edge.target !== id),
    );
    setMenu(null);
  };

  const jumpToColumnInDataset = (nodeId: string) => {
    const columnId = nodeId.replace("column-", "");
    setFocusedColumnId(columnId);
    setMenu(null);
  };

  // * Handlers for react flow relationships (edges)
  const onEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      setFlowEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setFlowEdges],
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      setFlowEdges((eds) =>
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
    [setFlowEdges, addMapping],
  );

  const hasContent = ontology || dataset;

  return (
    <div className="flex-1 bg-gray-950 relative">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-950"
        //Context menu handling: open custom menu on right-click, close on any click or move
        onNodeContextMenu={(event, node) => {
          // ? only show context menu for dataset column nodes (at the moment, could be extended to ontology class nodes as well)
          if (!node.id.startsWith("column-")) return;
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
        }}
        onPaneClick={() => setMenu(null)}
        onNodeClick={() => setMenu(null)}
        onMove={() => setMenu(null)}
        onClick={() => setMenu(null)}
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
      {ontologyAddObjectDialog && (
        <div className="absolute top-4 right-4">
          <OntologyAddObjectDialog
            addNodesToCanvas={addNodesToCanvas}
            closeDialog={() => setOntologyAddObjectDialog(false)}
          />
        </div>
      )}
      {
        //saftey safty check to only show context menu when all necessary data is available
        menu?.nodeId && menu?.x !== undefined && menu?.y !== undefined && (
          <div>
            <NodeContextMenu
              menuProps={menu}
              deleteNode={deleteNode}
              jumpToColumnInDataset={jumpToColumnInDataset}
            />
          </div>
        )
      }
    </div>
  );
}
