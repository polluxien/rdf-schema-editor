import { useState, useCallback } from "react";

const API_KEY_STORAGE_KEY = "bioportal_api_key";

/**
 * Hook for managing the BioPortal API key with localStorage persistence.
 * The API key is stored encrypted in base64 (basic obfuscation, not secure encryption).
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!stored) return "";
    try {
      return atob(stored);
    } catch {
      return "";
    }
  });

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, btoa(key));
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKeyState("");
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }, []);

  const hasApiKey = apiKey.length > 0;

  return { apiKey, setApiKey, clearApiKey, hasApiKey };
}

/**
 * Get the stored API key directly (for use outside React components).
 */
export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (!stored) return "";
  try {
    return atob(stored);
  } catch {
    return "";
  }
}
