import { useState } from "react";
import { Key, Eye, EyeOff, Check, Trash2, ExternalLink } from "lucide-react";
import { useApiKey } from "../../hooks/useApiKey";

interface ApiKeySettingsProps {
  onClose?: () => void;
}

export function ApiKeySettings({ onClose }: ApiKeySettingsProps) {
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiKey(inputValue.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setInputValue("");
    clearApiKey();
  };

  const hasChanges = inputValue.trim() !== apiKey;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Key size={18} className="text-blue-500" />
        <h3 className="font-medium">API Key Settings</h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Save your BioPortal API key to avoid entering it on every import.
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          BioPortal API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your API key"
            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Get your API key from{" "}
          <a
            href="https://biodivportal.gfbio.org/account"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center gap-1"
          >
            biodivportal.gfbio.org
            <ExternalLink size={12} />
          </a>
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white rounded-md transition-colors disabled:cursor-not-allowed"
        >
          {saved ? (
            <>
              <Check size={16} />
              Saved
            </>
          ) : (
            "Save"
          )}
        </button>

        {hasApiKey && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 size={16} />
            Clear
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-gray-200"
          >
            Close
          </button>
        )}
      </div>

      {hasApiKey && !hasChanges && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Check size={16} />
          API key is saved
        </div>
      )}
    </div>
  );
}

export default ApiKeySettings;
