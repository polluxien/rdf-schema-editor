import { User, IUser } from "@/models/User";

export async function createUser(data: Partial<IUser>): Promise<IUser> {
  // ! hier noch checken ob dublikate vorliegen
  const user = await User.create(data);
  return user;
}

export async function getCurrentUser(id: string): Promise<IUser> {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User could not be found");
  }
  return user;
}

export async function getAllUsers(): Promise<IUser[]> {
  return User.find();
}

export async function updateUser(
  id: string,
  data: Partial<IUser>,
): Promise<IUser> {
  // * hier noch checken ob bei änderungen dublikate vorliegen 

  // * richtiger position zuweisen an Attributen, das nicht ganzer user geschickt werden muss

  const user = await User.findByIdAndUpdate(id, data, { new: true });
  if (!user) {
    throw new Error("User could not be found");
  }
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User could not be found");
  }
  await User.deleteOne({ _id: id });

  // * hier noch die jeweiligen Workspaces löschen
}

// ! only for unit-tests mock nononon
export async function deleteAllUser(): Promise<void> {
  await User.deleteMany({});
  // * hier noch die jeweiligen Workspaces löschen
}
