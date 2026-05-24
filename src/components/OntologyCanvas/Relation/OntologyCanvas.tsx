import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppContext } from "../../../hooks/useAppContext";

//Component imports
import OntologyClassNode from "../Nodes/OntologyClassNode";
import OntologyAddObjectDialog from "../AddObjectDialog/OntologyAddObjectDialog";
import DatasetColumnNode from "../Nodes/DatasetColumnNode";
import NodeContextMenu from "../Nodes/NodeContextMenu";
import CustomEdge from "./CustomEdge";
import { EdgeEditProvider } from "./EdgeEditContext";
import RelationshipDialog from "./RelationshipDialog";

const nodeTypes: NodeTypes = {
  ontologyClass: OntologyClassNode,
  datasetColumn: DatasetColumnNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export default function OntologyCanvas() {
  const { setFocusedColumnId } = useAppContext();

  const [showOntologyAddObjectDialog, setShowOntologyAddObjectDialog] =
    useState(false);
  // ? Relationship dialog state
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [selectedEdgeData, setSelectedEdgeData] = useState<Edge | null>(null);

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
      setFlowEdges((eds) => addEdge({ ...params, type: "custom" }, eds));

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

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      const edge = flowEdges.find((e) => e.id === edgeId);
      if (edge) {
        setSelectedEdgeData(edge);
        setShowRelationshipDialog(true);
      }
    },
    [flowEdges],
  );

  const handleCloseDialog = () => {
    setShowRelationshipDialog(false);
    setSelectedEdgeData(null);
  };

  const hasContent = ontology || dataset;

  const edges = useMemo(
    () =>
      flowEdges.map((edge) =>
        edge.type === "custom" ? edge : { ...edge, type: "custom" },
      ),
    [flowEdges],
  );

  return (
    <div className="flex-1 bg-gray-950 relative">
      <EdgeEditProvider onEdit={handleEdgeClick}>
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: "custom",
            animated: true,
            style: { stroke: "#a855f7" },
          }}
          onEdgeClick={(_, edge) => handleEdgeClick(edge.id)}
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
          onPaneClick={() => {
            setMenu(null);
            handleCloseDialog();
          }}
          onNodeClick={() => setMenu(null)}
          onMove={() => setMenu(null)}
          onClick={() => setMenu(null)}
          // ? Attribution is required by the license of reactflow, but we can style it to be less obtrusive
          attributionPosition="bottom-left"
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

        {!showOntologyAddObjectDialog && (
          <Panel position="top-right" className="m-4">
            <button
              onClick={() => setShowOntologyAddObjectDialog(true)}
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
      </EdgeEditProvider>
      {showOntologyAddObjectDialog && (
        <div className="absolute top-4 right-4">
          <OntologyAddObjectDialog
            addNodesToCanvas={addNodesToCanvas}
            closeDialog={() => setShowOntologyAddObjectDialog(false)}
          />
        </div>
      )}
      {showRelationshipDialog && selectedEdgeData && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <RelationshipDialog
            closeDialog={handleCloseDialog}
            selectedEdgeData={selectedEdgeData}
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
