import { IUser, User } from "@/models/User";
import { login } from "@/services/loginAuthService";
import { HydratedDocument } from "mongoose";
import { describe } from "node:test";

let dummyUser: HydratedDocument<IUser>;

describe("login tests", async () => {
  beforeEach(async () => {
    dummyUser = await User.create({
      name: "Harry",
      password: "password",
      isAdmin: false,
    });
    await dummyUser.save();
  });

  test("login test - correct cred", async () => {
    const res = await login(dummyUser.name, "password");

    //will return Object
    expect(res).toEqual(
      expect.objectContaining({
        id: dummyUser.id,
        isAdmin: dummyUser.isAdmin,
      }),
    );
  });

  test("login test falsch - Wrong Name", async () => {
    const res = await login("Megan", dummyUser.password);
    expect(res).toBeFalsy();
  });

  test("login test falsch - Wrong Password", async () => {
    const res = await login(dummyUser.name, "123456789");
    expect(res).toBeFalsy();
  });
});
