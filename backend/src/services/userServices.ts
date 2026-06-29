import { User, IUser } from "@/models/User";
import { UserType } from "../../../sharedTypes/userTypes";

function toUserResponse(userData: IUser[]): UserType[] {
  return userData.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    gender: user.gender,
    isAdmin: user.isAdmin,
    apiKey: user.apiKey,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

export async function createUser(data: Partial<UserType>): Promise<UserType> {
  if (await User.findOne({ name: data.name })) {
    throw new Error("Name allready in use");
  }

  if (await User.findOne({ email: data.email })) {
    throw new Error("Email allready in use");
  }
  const user = await User.create(data);
  return toUserResponse([user])[0];
}

//  (sharedTypes) ist ein HTTP-Response-DTO — die Konvertierung passiert
// automatisch durch res.json() / Mongoose toJSON(). Intern arbeiten wir mit IUser.
export async function getCurrentUser(id: string): Promise<UserType> {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User could not be found");
  }
  return toUserResponse([user])[0];
}

export async function getAllUsers(): Promise<UserType[]> {
  return toUserResponse(await User.find());
}

export async function updateUser(
  id: string,
  data: Partial<UserType>,
): Promise<UserType> {
  if (
    data.name &&
    (await User.findOne({ name: data.name, _id: { $ne: id } }))
  ) {
    throw new Error("Name allready in use");
  }

  if (data.email && (await User.findOne({ email: data.email }))) {
    throw new Error("Email allready in use");
  }
  // * richtiger position zuweisen an Attributen, das nicht ganzer user geschickt werden muss

  const user = await User.findByIdAndUpdate(id, data, { new: true });
  if (!user) {
    throw new Error("User could not be found");
  }
  return toUserResponse([user])[0];
}

export async function deleteUser(id: string): Promise<void> {
  const result = await User.findByIdAndDelete(id);
  if (!result) throw new Error("User could not be found");
  // * hier noch die jeweiligen Workspaces löschen
}

// ! only for unit-tests mock nononon
export async function deleteAllUser(): Promise<void> {
  await User.deleteMany({});
  // * hier noch die jeweiligen Workspaces löschen
}
