import { NextFunction, Request, Response } from "express";
import { verifyJWT } from "@/services/JWTServices";

declare global {
  namespace Express {
    interface Request {
      userID?: string;
      isAdmin?: boolean;
    }
  }
}

// ? Middleware that enforces authentication.
// ? Rejects the request with 401 if no valid access_token cookie is present.
export function requiresAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.userID = undefined;
  req.isAdmin = undefined;

  try {
    const cookie = req.cookies?.access_token;
    if (!cookie) {
      return res.status(401).json({ error: "Unauthorized - Cookie" });
    }

    const resource = verifyJWT(cookie);
    if (!resource) {
      return res.status(401).json({ error: "Unauthorized - JWT" });
    }

    req.userID = resource.id;
    req.isAdmin = resource.isAdmin;
    next();
  } catch (err) {
    next(err);
  }
}

// ? Middleware that allows optional authentication.
// ? Does not reject unauthenticated requests — they continue as anonymous.
export function optionalAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.userID = undefined;
  req.isAdmin = undefined;

  try {
    const cookie = req.cookies?.access_token;
    if (cookie) {
      const resource = verifyJWT(cookie);
      if (resource) {
        req.userID = resource.id;
        req.isAdmin = resource.isAdmin;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
