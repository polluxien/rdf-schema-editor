import express from "express";
import { body, validationResult } from "express-validator";
import { verifyJWT, verifyPasswordAndCreateJWT } from "@/services/JWTServices";
import { optionalAuthentication } from "./authentification";

export const loginRouter = express.Router();

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
        secure: true,
        sameSite: "none",
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
    const loginResourceBack = verifyJWT(token);
    if (!loginResourceBack) {
      res.clearCookie("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
      });
      return res.status(200).json(false);
    }
    return res.status(200).json(loginResourceBack);
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
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });
    return res.status(200).json({ message: "Cookie erfolgreich gelöscht!" });
  } catch (err) {
    next(err);
  }
});
