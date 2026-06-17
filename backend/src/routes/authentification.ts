import { NextFunction, Request, Response } from "express";
import { verifyJWT } from "@/services/JWTServices";

import { LoginType } from "../../../sharedTypes/loginTypes";
import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    export interface Request {
      /**
       * Mongo-ID of currently logged in pfleger; or undefined, if pfleger is a guest.
       */
      pflegerId?: string;
      /**
       * Role of currently logged in pfleger; or undefined, if pfleger is a guest.
       */
      role?: "u" | "a";
    }
  }
}

export function requiresAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.pflegerId = undefined;
  try {
    const cookie = req.cookies.access_token;

    // console.log("Authorization Header:", auth);
    // console.log("Access Token Cookie:", cookie);

    if (!cookie) {
      return res.status(401).json({ error: "Unauthorized" }); // Kein oder falscher Authorization-Header
    }
    let resource = verifyJWT(cookie);
    if (!resource) {
      return res.status(401).json({ error: "Unauthorized" }); // Kein oder falscher Authorization-Header
    }
    req.role = resource.role;
    req.pflegerId = resource.id;
    next();
  } catch (err) {
    res.status(401); // Unauthorized
    next(err);
  }
}

export function optionalAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.pflegerId = undefined;
  try {
    const cookie = req.cookies.access_token;
    const loginResource = verifyJWT(cookie);
    if (loginResource) {
      req.pflegerId = loginResource.id;
      req.role = loginResource.role;
    } else {
      return res.status(401).json({ error: "Unauthorized" }); // Kein oder falscher Authorization-Header
    }
    next();
  } catch (err) {
    next();
  }
}
