// userService.test.ts
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "@/models/User";
import {
  createUser,
  deleteAllUser,
  deleteUser,
  getAllUsers,
  getCurrentUser,
  updateUser,
} from "@/services/userServices";

// helper for valid user data — override fields per test as needed
const validUser = (overrides = {}) => ({
  name: "Alice",
  email: "alice@example.com",
  password: "secret123",
  ...overrides,
});

describe("createUser", () => {
  test("creates a user and returns it with an id", async () => {
    const user = await createUser(validUser());

    expect(user).toBeDefined();
    expect(user._id).toBeDefined();
    expect(user.name).toBe("Alice");
  });

  test("persists the user in the database", async () => {
    const user = await createUser(validUser());

    const found = await User.findById(user._id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Alice");
  });

  // edge case: required field missing -> mongoose validation should reject
  test("rejects creation when a required field is missing", async () => {
    await expect(createUser({ name: "NoEmail" } as any)).rejects.toThrow();
  });

  // edge case: duplicate unique field (assumes email is unique in schema)
  test("rejects a duplicate email", async () => {
    await createUser(validUser());
    await expect(createUser(validUser())).rejects.toThrow();
  });
});

describe("getCurrentUser", () => {
  test("returns the user for a valid id", async () => {
    const created = await createUser(validUser());

    const user = await getCurrentUser(created._id.toString());
    expect(user.name).toBe("Alice");
  });

  // edge case: valid ObjectId format but no such user
  test("throws when the user does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    await expect(getCurrentUser(missingId)).rejects.toThrow(
      "User could not be found",
    );
  });

  // edge case: malformed id (not a valid ObjectId)
  test("throws on a malformed id", async () => {
    await expect(getCurrentUser("not-a-valid-id")).rejects.toThrow();
  });
});

describe("getAllUsers", () => {
  // edge case: empty collection
  test("returns an empty array when there are no users", async () => {
    const users = await getAllUsers();
    expect(users).toEqual([]);
  });

  test("returns all existing users", async () => {
    await createUser(validUser({ name: "Alice", email: "a@example.com" }));
    await createUser(validUser({ name: "Bob", email: "b@example.com" }));

    const users = await getAllUsers();
    expect(users).toHaveLength(2);
  });
});

describe("updateUser", () => {
  test("updates a field and returns the updated user", async () => {
    const created = await createUser(validUser());

    const updated = await updateUser(created._id.toString(), {
      name: "Alice Updated",
    });
    expect(updated.name).toBe("Alice Updated");
  });

  test("persists the update", async () => {
    const created = await createUser(validUser());
    await updateUser(created._id.toString(), { name: "Persisted" });

    const found = await User.findById(created._id);
    expect(found?.name).toBe("Persisted");
  });

  // edge case: updating a non-existent user
  test("throws when the user does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    await expect(updateUser(missingId, { name: "Ghost" })).rejects.toThrow(
      "User could not be found",
    );
  });

  // edge case: empty update should not wipe existing fields
  test("leaves fields unchanged on an empty update", async () => {
    const created = await createUser(validUser());

    const updated = await updateUser(created._id.toString(), {});
    expect(updated.name).toBe("Alice");
  });
});

describe("deleteUser", () => {
  test("removes the user from the database", async () => {
    const created = await createUser(validUser());

    await deleteUser(created._id.toString());

    const found = await User.findById(created._id);
    expect(found).toBeNull();
  });

  test("deletes only the targeted user", async () => {
    const a = await createUser(validUser({ name: "Alice", email: "a@example.com" }));
    const b = await createUser(validUser({ name: "Bob", email: "b@example.com" }));

    await deleteUser(a._id.toString());

    expect(await User.findById(a._id)).toBeNull();
    expect(await User.findById(b._id)).not.toBeNull();
  });

  // edge case: deleting a non-existent user
  test("throws when the user does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    await expect(deleteUser(missingId)).rejects.toThrow(
      "User could not be found",
    );
  });
});
