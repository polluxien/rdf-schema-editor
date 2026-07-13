import express, { NextFunction, Response } from "express";
import { body, param, validationResult } from "express-validator";
import {
  optionalAuthentication,
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
import { ConflictError, NotFoundError } from "@/errors";

export const userRouter = express.Router();

// service layer throws these exact error types for "no such user",
// "id belongs to someone else", and "name/email already taken" -> map to
// the matching HTTP status; anything else is unexpected and bubbles to the
// global 500 handler
function handleUserServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message });
  }
  next(err);
}

//? create user (registration — public, but only an already-authenticated
//? admin may grant isAdmin to the new user; anonymous/self-registration is
//? always forced to isAdmin=false regardless of what the body says)
userRouter.post(
  "/",
  optionalAuthentication,
  body("name").isString().isLength({ min: 3, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 3, max: 100 }),
  body("isAdmin").optional().isBoolean(),
  body("gender").optional().isIn(Object.values(Gender)),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const isAdmin = req.isAdmin ? Boolean(req.body.isAdmin) : false;
      const user = await createUser({ ...req.body, isAdmin });
      return res.status(201).json(user);
    } catch (error) {
      handleUserServiceError(error, res, next);
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
    // only the user themselves or an admin may view the full record
    if (req.userID !== req.params.id && !req.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const user = await getCurrentUser(req.params.id as string);
      return res.status(200).json(user);
    } catch (err) {
      handleUserServiceError(err, res, next);
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
      handleUserServiceError(err, res, next);
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
      handleUserServiceError(err, res, next);
    }
  },
);
