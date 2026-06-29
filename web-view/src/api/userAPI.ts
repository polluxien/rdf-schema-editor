import { fetchWithErrorHandling } from "./fetchWithErrorHandling";
import type {
  UpdateUserPayload,
  UserType,
} from "../../../sharedTypes/userTypes";

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const VITE_REAL_FETCH = import.meta.env.VITE_REAL_FETCH == "true";

export async function getAllUsers(): Promise<UserType[]> {
  if (!VITE_REAL_FETCH) {
    return [
      {
        _id: "Lena-id",
        name: "Lena Hoffmann",
        email: "lena.hoffmann@gmail.com",
        isAdmin: false,
        gender: "Female",
      },
      {
        _id: "Jonas-id",
        name: "Jonas Becker",
        email: "jonas.becker@web.de",
        isAdmin: false,
        gender: "Divers",
      },
      {
        _id: "Sophie-id",
        name: "Sophie Wagner",
        email: "sophie.wagner@outlook.com",
        isAdmin: false,
        gender: "Prefer not to say",
      },
      {
        _id: "Max-id",
        name: "Maximilian Schmidt",
        email: "max.schmidt@gmx.de",
        isAdmin: false,
        gender: "Male",
      },
    ] as UserType[];
  }
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/api/users`, {
    credentials: "include",
  });
  return response.json();
}

export async function getUser(id: string): Promise<UserType> {
  if (!VITE_REAL_FETCH) {
    return {
      _id: "mock-admin-id",
      name: "Max",
      email: "max@email.de",
      isAdmin: true,
      gender: "Prefer not to say",
    };
  }
  const response = await fetchWithErrorHandling(
    `${API_BASE_URL}/api/users/${id}`,
    {
      credentials: "include",
    },
  );
  return response.json();
}

export async function updateUser(
  id: string,
  data: UpdateUserPayload,
): Promise<UserType> {
  const response = await fetchWithErrorHandling(
    `${API_BASE_URL}/api/users/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    },
  );
  return response.json();
}

export async function deleteUser(id: string): Promise<void> {
  await fetchWithErrorHandling(`${API_BASE_URL}/api/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}
