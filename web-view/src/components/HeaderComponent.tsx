import ProfileAvaterButComp from "./Profile/ProfileAvaterButComp";
import { useNavigate } from "react-router-dom";

//import ColorModeToggle from "./UI-NoPurpose/ColorModeToggle";

function HeaderComponent() {
  const navigate = useNavigate();

  return (
    <header className="shrink-0 bg-gray-100 text-gray-700 select-none dark:bg-gray-900 dark:text-gray-300">
      <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-200 flex items-center justify-between dark:text-gray-600 dark:border-gray-800">
        <span
          className="font-bold text-gray-600 dark:text-gray-400"
          onClick={() => navigate(`/`)}
        >
          rdf-schema-editor
        </span>
        {/*<ColorModeToggle />*/}
        <ProfileAvaterButComp />
      </div>
    </header>
  );
}
export default HeaderComponent;
