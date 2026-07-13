import express from "express";
import { body, param, validationResult } from "express-validator";
import { requiresAuthentication } from "./authentification";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "@/services/workspaceServices";

export const workspaceRouter = express.Router();

workspaceRouter.use(requiresAuthentication);

// service layer throws this exact message for both "no such id" and
// "id belongs to a different user" -> surface as 404 with the real message;
// anything else is an unexpected error and should bubble to the 500 handler
function handleNotFoundOr500(
  err: unknown,
  res: express.Response,
  next: express.NextFunction,
) {
  if (err instanceof Error && err.message === "Workspace could not be found") {
    return res.status(404).json({ error: err.message });
  }
  next(err);
}

//? get all workspaces of the current user
workspaceRouter.get("/", async (req, res, next) => {
  try {
    const workspaces = await getWorkspaces(req.userID as string);
    return res.status(200).json(workspaces);
  } catch (err) {
    next(err);
  }
});

//? create and save a new workspace for the current user
workspaceRouter.post(
  "/",
  body("name").optional().isString().isLength({ min: 1, max: 100 }),
  body("description").optional().isString(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, description, data } = req.body;
      const workspace = await createWorkspace(req.userID as string, {
        name,
        description,
        data,
      });
      return res.status(201).json(workspace);
    } catch (err) {
      next(err);
    }
  },
);

//? get a single workspace of the current user
workspaceRouter.get(
  "/:id",
  param("id").isMongoId(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const workspace = await getWorkspace(
        req.userID as string,
        req.params!.id as string,
      );
      return res.status(200).json(workspace);
    } catch (err) {
      handleNotFoundOr500(err, res, next);
    }
  },
);

//? update (save) an existing workspace of the current user
workspaceRouter.put(
  "/:id",
  param("id").isMongoId(),
  body("name").optional().isString().isLength({ min: 1, max: 100 }),
  body("description").optional().isString(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, description, data } = req.body;
      const workspace = await updateWorkspace(
        req.userID as string,
        req.params!.id as string,
        { name, description, data },
      );
      return res.status(200).json(workspace);
    } catch (err) {
      handleNotFoundOr500(err, res, next);
    }
  },
);

//? delete a workspace of the current user
workspaceRouter.delete(
  "/:id",
  param("id").isMongoId(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      await deleteWorkspace(req.userID as string, req.params!.id as string);
      return res.status(204).send();
    } catch (err) {
      handleNotFoundOr500(err, res, next);
    }
  },
);
