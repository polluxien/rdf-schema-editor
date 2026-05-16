interface ToggleProps {
  value: "object" | "ontology";
  onChange: (value: "object" | "ontology") => void;
}

export const SegmentedToggle = ({ value, onChange }: ToggleProps) => {
  const getStylesForOption = (optionValue: "object" | "ontology") => {
    const isActive = value === optionValue;
    return {
      background: isActive ? "#ffffff" : "transparent",
      color: isActive ? "#1f2937" : "#9ca3af",
      minWidth: "70px",
    };
  };
  return (
    <div
      className="flex rounded-full p-1 cursor-pointer select-none"
      style={{ background: "#304674", width: "fit-content" }}
    >
      <div
        onClick={() => onChange("object")}
        className="flex items-center justify-center rounded-full px-4 py-1 text-xs font-bold transition-all duration-200"
        style={getStylesForOption("object")}
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
