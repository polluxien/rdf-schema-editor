import { User, IUser } from "@/models/User";
import { UserType } from "../../../sharedTypes/userTypes";
import { ConflictError, NotFoundError } from "@/errors";
import { Workspace } from "@/models/Workspace";

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
    throw new ConflictError("Name allready in use");
  }

  if (await User.findOne({ email: data.email })) {
    throw new ConflictError("Email allready in use");
  }
  const user = await User.create(data);
  return toUserResponse([user])[0];
}

//  (sharedTypes) ist ein HTTP-Response-DTO — die Konvertierung passiert
// automatisch durch res.json() / Mongoose toJSON(). Intern arbeiten wir mit IUser.
export async function getCurrentUser(id: string): Promise<UserType> {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError("User could not be found");
  }
  return toUserResponse([user])[0];
}

export async function getAllUsers(): Promise<UserType[]> {
  return toUserResponse(await User.find());
}

export async function updateUser(
  id: string,
  data: Partial<UserType> & { password?: string },
): Promise<UserType> {
  if (
    data.name &&
    (await User.findOne({ name: data.name, _id: { $ne: id } }))
  ) {
    throw new ConflictError("Name allready in use");
  }

  if (
    data.email &&
    (await User.findOne({ email: data.email, _id: { $ne: id } }))
  ) {
    throw new ConflictError("Email allready in use");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError("User could not be found");
  }

  // assigned via the document (not findByIdAndUpdate) so the pre("save")
  // hook re-hashes the password when it's part of the update
  Object.assign(user, data);
  await user.save();

  return toUserResponse([user])[0];
}

export async function deleteUser(id: string): Promise<void> {
  const result = await User.findByIdAndDelete(id);
  if (!result) throw new NotFoundError("User could not be found");
  // * delete all workspaces of the user
  await Workspace.deleteMany({ userId: id });
}

// ! only for unit-tests mock nononon
export async function deleteAllUser(): Promise<void> {
  await User.deleteMany({});
  // * delete all workspaces 
  await Workspace.deleteMany({});
}
