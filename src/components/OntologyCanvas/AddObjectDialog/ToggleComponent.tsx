interface ToggleProps {
  value: "column" | "ontology";
  onChange: (value: "column" | "ontology") => void;
}

export const SegmentedToggle = ({ value, onChange }: ToggleProps) => {
  const getStylesForOption = (optionValue: "column" | "ontology") => {
    const isActive = value === optionValue;
    return {
      background: isActive ? "var(--toggle-active-bg)" : "transparent",
      color: isActive ? "var(--toggle-active-text)" : "var(--toggle-text)",
      minWidth: "70px",
    };
  };
  return (
    <div
      className="flex rounded-full p-1 cursor-pointer select-none"
      style={{
        background: "var(--toggle-bg)",
        width: "fit-content",
      }}
    >
      <div
        onClick={() => onChange("column")}
        className="flex items-center justify-center rounded-full px-4 py-1 text-xs font-bold transition-all duration-200"
        style={getStylesForOption("column")}
      >
        Dataset
      </div>
      <div
        onClick={() => onChange("ontology")}
        className="flex items-center justify-center rounded-full px-4 py-1 text-xs font-bold transition-all duration-200"
        style={getStylesForOption("ontology")}
      >
        Ontology
      </div>
    </div>
  );
};
