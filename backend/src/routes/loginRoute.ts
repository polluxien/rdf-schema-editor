import express from "express";
import { body, validationResult } from "express-validator";
import { JsonWebTokenError } from "jsonwebtoken";
import { verifyJWT, verifyPasswordAndCreateJWT } from "@/services/JWTServices";
import { optionalAuthentication } from "./authentification";

export const loginRouter = express.Router();

// Secure/SameSite=None cookies require an actual HTTPS connection to be sent
// by the browser at all. NODE_ENV=production does not imply HTTPS (e.g. the
// docker-compose stack runs production builds over plain http://localhost),
// so this is controlled by its own env var instead.
const useSecureCookie = process.env.COOKIE_SECURE === "true";
const cookieSameSite = useSecureCookie ? ("none" as const) : ("lax" as const);

//? create login
loginRouter.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }),
  body("password").isString().isLength({ min: 3, max: 100 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const jwttokenString = await verifyPasswordAndCreateJWT(
        req.body.name,
        req.body.password,
      );

      if (!jwttokenString) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const loginResourceBack = verifyJWT(jwttokenString);
      res.cookie("access_token", jwttokenString, {
        httpOnly: true,
        expires: new Date(loginResourceBack.exp * 1000),
        secure: useSecureCookie,
        sameSite: cookieSameSite,
      });
      return res.status(200).json(loginResourceBack);
    } catch (error) {
      console.error("Get login error:", error);
      next(error);
    }
  },
);

loginRouter.get("/", optionalAuthentication, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    //acess_token avaidable
    const token = req.cookies["access_token"];
    if (!token) {
      return res.status(200).json(false);
    }

    //token verifiyd
    try {
      const loginResourceBack = verifyJWT(token);
      return res.status(200).json(loginResourceBack);
    } catch (err) {
      if (!(err instanceof JsonWebTokenError)) throw err;
      // invalid/expired token -> clear the stale cookie and report logged-out
      res.clearCookie("access_token", {
        httpOnly: true,
        secure: useSecureCookie,
        sameSite: cookieSameSite,
      });
      return res.status(200).json(false);
    }
  } catch (err) {
    next(err);
  }
});

loginRouter.delete("/", async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: cookieSameSite,
    });
    return res.status(200).json({ message: "Cookie successfully deleted!" });
  } catch (err) {
    next(err);
  }
});
