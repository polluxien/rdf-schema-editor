export type Gender = "Male" | "Female" | "Divers" | "Prefer not to say";

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  isAdmin?: boolean;
};

export type UserType = {
  _id: string;
  name: string;
  email: string;
  gender: Gender;
  isAdmin: boolean;
  apiKey?: string;
  createdAt?: string;
  updatedAt?: string;
};
