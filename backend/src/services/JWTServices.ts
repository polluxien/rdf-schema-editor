import cookieParser from "cookie-parser";
import { login } from "./loginAuthService";

import dotenv from "dotenv";
import { JsonWebTokenError, JwtPayload, sign, verify } from "jsonwebtoken";
import { LoginType } from "../../../sharedTypes/loginTypes";

dotenv.config();

export async function verifyPasswordAndCreateJWT(
  identifier: string,
  password: string,
): Promise<string | undefined> {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtTtl = process.env.JWT_TTL;
  if (!jwtSecret || !jwtTtl)
    throw new Error("verifyJWT or jwtTtl is not defined");

  const user = await login(identifier, password);
  if (user) {
    const payload: JwtPayload = {
      sub: user.id,
      isAdmin: user.isAdmin,
      exp: Math.floor(Date.now() / 1000) + Number(jwtTtl),
    };
    const jwtString = sign(payload, jwtSecret, {
      algorithm: "HS256",
    });
    return jwtString;
  }
  return undefined;
}

export function verifyJWT(jwtString: string | undefined): LoginType {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new JsonWebTokenError("jwtSecret is not defined");

  try {
    const payload = verify(jwtString!, jwtSecret) as JwtPayload;
    return {
      id: payload.sub as string,
      isAdmin: payload.isAdmin,
      exp: payload.exp!,
    };
  } catch {
    throw new JsonWebTokenError("Wrong Jason Web Token");
  }
}
