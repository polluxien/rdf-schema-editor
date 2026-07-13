import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  requiresAuthentication,
} from "./authentification";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getCurrentUser,
  updateUser,
} from "@/services/userServices";
import { Gender } from "@/models/User";

export const userRouter = express.Router();

//? create user (registration — public)
userRouter.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 3, max: 100 }),
  body("isAdmin").optional().isBoolean(),
  body("gender").optional().isString().isLength({ min: 5, max: 10 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await createUser(req.body);
      return res.status(201).json(user);
    } catch (error) {
      console.error("Create user error:", error);
      next(error);
    }
  },
);

//? get all users (admin only)
userRouter.get("/", requiresAuthentication, async (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const users = await getAllUsers();
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

//? get single user by id
userRouter.get(
  "/:id",
  requiresAuthentication,
  param("id").isMongoId(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await getCurrentUser(req.params.id as string);
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
);

//? update user
userRouter.put(
  "/:id",
  requiresAuthentication,
  param("id").isMongoId(),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("password").optional().isString().isLength({ min: 3, max: 100 }),
  body("gender").optional().isIn(Object.values(Gender)),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // only the user themselves or an admin may update
    if (req.userID !== req.params.id && !req.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const user = await updateUser(req.params.id as string, req.body);
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
);

//? delete user
userRouter.delete(
  "/:id",
  requiresAuthentication,
  param("id").isMongoId(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // only the user themselves or an admin may delete
    if (req.userID !== req.params.id && !req.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      await deleteUser(req.params.id as string);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
