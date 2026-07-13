import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
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

  const cookie = req.cookies?.access_token;
  if (!cookie) {
    return res.status(401).json({ error: "Unauthorized - Cookie" });
  }

  try {
    const resource = verifyJWT(cookie);
    req.userID = resource.id;
    req.isAdmin = resource.isAdmin;
    next();
  } catch (err) {
    // an invalid/expired token is an auth failure (401), not a server error
    if (err instanceof JsonWebTokenError) {
      return res.status(401).json({ error: "Unauthorized - JWT" });
    }
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

  const cookie = req.cookies?.access_token;
  if (cookie) {
    try {
      const resource = verifyJWT(cookie);
      req.userID = resource.id;
      req.isAdmin = resource.isAdmin;
    } catch (err) {
      // an invalid/expired token just means "continue as anonymous" here;
      // only a genuinely unexpected error should hit the 500 handler
      if (!(err instanceof JsonWebTokenError)) {
        return next(err);
      }
    }
  }
  next();
}
