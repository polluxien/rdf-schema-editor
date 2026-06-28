import type { LoginType } from "../../../sharedTypes/loginTypes";
import { fetchWithErrorHandling } from "./fetchWithErrorHandling";

// Mock data and real fetch configuration
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const REAL_FETCH = import.meta.env.VITE_REAL_FETCH === "true";

// Utility function to handle fetch with error handling
const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

//skip login
const ALLREADY_LOGGED_IN = import.meta.env.ALLREADY_LOGGED_IN;

// Function to post login data and get login information
export async function postLogin(
  name: string,
  password: string,
): Promise<LoginType> {
  const url = `${API_BASE_URL}/api/login`;

  // ! Mock
  if (ALLREADY_LOGGED_IN) {
    if (!REAL_FETCH) {
      // Return mock data instead of making a real request
      if (name === "max" && password === "123") {
        return { id: "mock-admin-id", isAdmin: true, exp: 3600 } as LoginType;
      }
    } else {
      //hier user erstellen und einloggen 
    }
  }

  // ! Real fetch with error handling

  const response = await fetchWithErrorHandling(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include" as RequestCredentials,
    body: JSON.stringify({ name, password }),
  });
  console.log(`Response status: ${response.status}`);
  if (response.ok) {
    const loginInfo: LoginType = await response.json();
    return loginInfo;
  }
  if (response.status === 401) {
    throw new Error("Invalid credentials");
  }
  throw new Error(
    `Error connecting to ${API_BASE_URL}: ${response.statusText}`,
  );
}

// Function to get login information, returns false if not logged in
export async function getLogin(
  signal?: AbortSignal,
): Promise<LoginType | false> {
  const url = `${API_BASE_URL}/api/login`;

  // ! Mock
  if (USE_MOCK_DATA && !REAL_FETCH) {
    // Return mock data instead of making a real request
    return false; // Simulate not logged in
  }

  // ! Real fetch with error handling
  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    credentials: "include" as RequestCredentials,
    signal,
  });
  if (response.ok) {
    const loginInfo: LoginType | false = await response.json();
    return loginInfo;
  }
  if (response.status === 401) {
    throw new Error("Invalid credentials");
  }
  throw new Error(
    `Error connecting to ${API_BASE_URL}: ${response.statusText}`,
  );
}

// Function to delete login information, effectively logging out the user
export async function deleteLogin(): Promise<void> {
  const url = `${API_BASE_URL}/api/login`;

  // ! Mock
  if (USE_MOCK_DATA && !REAL_FETCH) {
    // Return mock data instead of making a real request
    return;
  }

  // ! Real fetch with error handling

  const response = await fetchWithErrorHandling(url, {
    method: "DELETE",
    credentials: "include",
  });
  if (response.ok) {
    return;
  }
  throw new Error(`Error logging out, status: ${response.status}`);
}
