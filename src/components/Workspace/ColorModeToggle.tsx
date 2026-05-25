import type { ColorMode } from "@xyflow/react";
import { useAppContext } from "../../hooks/useAppContext";
import { useState, useRef } from "react";

const modes: ColorMode[] = ["light", "dark", "system"];

const modeColor: Record<ColorMode, string> = {
  light: "bg-gray-200",
  dark: "bg-gray-700",
  system: "bg-gradient-to-br from-gray-200 to-gray-700",
};

function ColorModeToggle() {
  const { colorMode, setColorMode } = useAppContext();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`w-3 h-3 rounded-full ${modeColor[colorMode]} cursor-pointer`} />

      {open && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pr-5">
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              title={mode}
              onClick={() => { setColorMode(mode); setOpen(false); }}
              className={`w-3 h-3 rounded-full transition-opacity ${modeColor[mode]} ${
                colorMode === mode ? "ring-1 ring-blue-400 ring-offset-1 ring-offset-gray-900" : "opacity-50 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ColorModeToggle;