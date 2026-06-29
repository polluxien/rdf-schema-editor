import type { ColorMode } from "@xyflow/react";
import { useAppContext } from "../../hooks/useAppContext";
import { useState, useRef } from "react";

// ? didnt want to delete option 2 yet
const UI_COLOR_SELECT = 0;

const modes: ColorMode[] = ["light", "dark"];

const modeColor: Record<ColorMode, string> = {
  light: "bg-gray-200",
  dark: "bg-gray-700",
  system: "bg-gray-500",
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

  const toggleMode = () => {
    return colorMode === "light" ? "dark" : "light";
  };

  return (
      <div>
        {
          // * OPTION 1
        }
        {UI_COLOR_SELECT == 0 ? (
          <button
            type="button"
            title={`Switch to ${toggleMode()} mode`}
            onClick={() => setColorMode(toggleMode())}
            className={`
        w-3.5 h-3.5 rounded-full border transition-all duration-200 
        ${
          colorMode === "dark"
            ? "bg-gray-700 border-gray-600 hover:bg-gray-200 hover:border-gray-300 hover:ring-2 ring-blue-400"
            : "bg-gray-200 border-gray-300 hover:bg-gray-700 hover:border-gray-600 hover:ring-2 ring-blue-400"
        }
      `}
          />
        ) : (
          // * OPTION 2
          // ? Idea: looks really nice, but onlymakes sense if there are more than 2 options (e.g. system) and currently clutters the UI a bit. Maybe add an option in the future to enable/disable this feature?
          <div
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              aria-label="Color mode"
              className={`w-4 h-4 rounded-full ${modeColor[colorMode]} cursor-pointer border border-gray-100 dark:border-gray-800`}
            />

            {open && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pr-5">
                {modes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    title={mode}
                    onClick={() => {
                      setColorMode(mode);
                      setOpen(false);
                    }}
                    className={`w-4 h-4 rounded-full transition-opacity ${modeColor[mode]} ${
                      colorMode === mode
                        ? `ring-2 ring-grey-200 ring-offset-white dark:ring-offset-gray-900`
                        : "opacity-50 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
}

export default ColorModeToggle;
