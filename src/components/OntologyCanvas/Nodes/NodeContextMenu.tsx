interface NodeContextMenuProps {
  menuProps: { x: number; y: number; nodeId: string };
  deleteNode: (id: string) => void;
  jumpToColumnInDataset: (columnId: string) => void;
}

function NodeContextMenu({
  menuProps,
  deleteNode,
  jumpToColumnInDataset,
}: NodeContextMenuProps) {
  const { x, y, nodeId } = menuProps;

  const actionHandler = (action: string) => {
    // Depending on the action, call the appropriate handler function
    switch (action) {
      case "Jump to Column in Dataset":
        jumpToColumnInDataset(nodeId);
        break;
      case "Delete":
        deleteNode(nodeId);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="fixed w-48 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50"
      style={{ top: y, left: x }}
    >
      {["Jump to Column in Dataset", "Delete"].map((action) => (
        <button
          key={action}
          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-600 hover:text-white"
          onClick={() => actionHandler(action)}
        >
          {action}
        </button>
      ))}
    </div>
  );
}

export default NodeContextMenu;
