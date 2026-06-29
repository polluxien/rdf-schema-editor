import { User } from "@/models/User";

//we will only return name and isAdmin for saftey reasons never password !!!!!
export async function login(
  name: string,
  password: string,
): Promise<{ id: string; isAdmin: boolean } | false> {
 // * hier noch option name | email 

  const user = await User.findOne({ name: name }).exec();
  if (!user) return false;
  const isMatch = await user.isCorrectPassword(password);
  if (!isMatch) return false;
  return { id: user.id, isAdmin: user.isAdmin };
}
