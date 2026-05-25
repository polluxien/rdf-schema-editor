import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  Panel,
  Background,
  Controls,
  MiniMap,
  ControlButton,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppContext } from "../../hooks/useAppContext";

//Component imports
import OntologyClassNode from "./Nodes/OntologyClassNode";
import OntologyAddObjectDialog from "./AddObjectDialog/OntologyAddObjectDialog";
import DatasetColumnNode from "./Nodes/DatasetColumnNode";
import NodeContextMenu from "./Nodes/NodeContextMenu";
import CustomEdge from "./Relation/CustomEdge";
import { EdgeEditProvider } from "./Relation/EdgeEditContext";
import RelationshipDialog from "./Relation/RelationshipDialog";

const nodeTypes: NodeTypes = {
  ontologyClass: OntologyClassNode,
  datasetColumn: DatasetColumnNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export default function OntologyCanvas() {
  const { setFocusedColumnId, colorMode } = useAppContext();

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
  // -----------------------------------------------------------------------------
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
  // -----------------------------------------------------------------------------

  // * Handlers for react flow relationships (edges)
  // -----------------------------------------------------------------------------
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
  const edges = useMemo(
    () =>
      flowEdges.map((edge) =>
        edge.type === "custom" ? edge : { ...edge, type: "custom" },
      ),
    [flowEdges],
  );
  // -----------------------------------------------------------------------------

  // ? Flow UI Controls
  // -----------------------------------------------------------------------------
  const [showBigMap, setShowBigMap] = useState(false);

  const hasContent = ontology || dataset;

  return (
    <div className="flex-1 relative bg-gray-50 dark:bg-gray-950">
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
          attributionPosition="bottom-right"
          colorMode={colorMode ?? "dark"}
          fitView
        >
          <Background gap={20} />


          <Controls
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            style={{ bottom: 17, left: 0 }}
          >
            
            <ControlButton
              onClick={() => setShowBigMap((prev) => !prev)}
              title={showBigMap ? "Hide MiniMap" : "Show MiniMap"}
            >
              {showBigMap ? (
                <svg
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="1"
                    y="1"
                    width="13"
                    height="13"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="3"
                    y="3"
                    width="5"
                    height="4"
                    rx="0.5"
                    fill="currentColor"
                    opacity="0.5"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="11"
                    height="11"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="4"
                    y="4"
                    width="7"
                    height="5"
                    rx="0.5"
                    fill="currentColor"
                    opacity="0.5"
                  />

                </svg>
              )}
            </ControlButton>
          </Controls>

          {showBigMap && (
            <MiniMap
              position="bottom-left"
              style={{ marginLeft: "55px" }}
              nodeColor={(node) => {
                if (node.type === "ontologyClass") return "#a855f7";
                if (node.type === "datasetColumn") return "#3b82f6";
                return "#6b7280";
              }}
            />
          )}

          {!hasContent && (
            <Panel position="top-center" className="mt-20">
              <div className="text-center text-gray-600 bg-white/85 backdrop-blur-sm p-8 rounded-lg border border-gray-200 shadow-sm dark:text-gray-400 dark:bg-gray-800/80 dark:border-gray-700">
                <p className="text-lg mb-2 text-gray-900 dark:text-gray-200">
                  No ontology or dataset loaded
                </p>
                <p className="text-sm">
                  Use <strong>Import → Ontology (OWL)</strong> to load an
                  ontology
                  <br />
                  and <strong>Import → CSV Dataset</strong> to load your data
                </p>
              </div>
            </Panel>
          )}

          {!showOntologyAddObjectDialog && (
            <Panel position="top-right" className="m-4">
              <div className="relative group">
                <button
                  onClick={() => setShowOntologyAddObjectDialog(true)}
                  className="flex items-center gap-2 bg-white/85 text-gray-700 backdrop-blur-sm px-3 py-1.5 rounded border border-gray-200 shadow-sm hover:bg-gray-100 dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700/80"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </button>

                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white border border-gray-200 text-gray-800 text-sm px-2 py-1 rounded pointer-events-none shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  add object
                </div>
              </div>
            </Panel>
          )}

          {hasContent && (
            <Panel position="top-left" className="m-4">
              <div className="flex gap-4 text-sm">
                {dataset && (
                  <div className="flex items-center gap-2 bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded border border-gray-200 shadow-sm dark:bg-gray-800/80 dark:border-gray-700">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Dataset Columns
                    </span>
                  </div>
                )}
                {ontology && (
                  <div className="flex items-center gap-2 bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded border border-gray-200 shadow-sm dark:bg-gray-800/80 dark:border-gray-700">
                    <div className="w-3 h-3 rounded bg-purple-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Ontology Classes
                    </span>
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
