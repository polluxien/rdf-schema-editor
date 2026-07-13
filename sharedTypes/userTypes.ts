export type Gender = "Male" | "Female" | "Divers" | "Prefer not to say";

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  gender?: Gender;
  isAdmin?: boolean;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  gender?: Gender;
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
