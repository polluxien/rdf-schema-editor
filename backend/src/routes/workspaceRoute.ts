import express from "express";
import { connectToDatabase } from "@/services/mongodb";
import { Workspace } from "@/models/Workspace";
import { getCurrentUser } from "@/services/userServices";

export const workspaceRouter = express.Router();

//get an existing Workspace

// ! under Construction
/*
workspaceRouter.get("/", async (req, res) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await connectToDatabase();

    const workspaces = await Workspace.find({ userId: user.id })
      .select("_id name description createdAt updatedAt")
      .sort({ updatedAt: -1 });

    const result = workspaces.map(
      (ws: {
        _id: { toString(): string };
        name: string;
        description: string;
      }) => ({
        id: ws._id.toString(),
        name: ws.name,
        description: ws.description,
      }),
    );

    return res.json(result);
  } catch (error) {
    console.error("Get workspaces error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//create and save new Workspace
workspaceRouter.post("/", async (req, res) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = await req.body;
    const { name, description, data } = body;

    await connectToDatabase();

    const workspace = await Workspace.create({
      userId: user.id,
      name: name || "untitled",
      description: description || "",
      data: data || {
        ontology: null,
        dataset: null,
        mappings: [],
        flowNodes: [],
        flowEdges: [],
      },
    });

    return res.json({
      id: workspace._id.toString(),
      name: workspace.name,
      description: workspace.description,
    });
  } catch (error) {
    console.error("Create workspace error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/*
workspaceRouter.get("/:id", async (req, res) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.params!.id;

    await connectToDatabase();

    const workspace = await Workspace.findOne({
      _id: id,
      userId: user.id,
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: workspace._id.toString(),
      name: workspace.name,
      description: workspace.description,
      data: workspace.data,
    });
  } catch (error) {
    console.error("Get workspace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

workspaceRouter.put("/:id", async (req, res) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.params!.id;

    const body = await req.body;
    const { name, description, data } = body;

    await connectToDatabase();

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (data !== undefined) updateData.data = data;

    const workspace = await Workspace.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: updateData },
      { new: true },
    );

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: workspace._id.toString(),
      name: workspace.name,
      description: workspace.description,
    });
  } catch (error) {
    console.error("Update workspace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

workspaceRouter.delete("/:id", async (req, res) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.params!.id;
    await connectToDatabase();

    const result = await Workspace.deleteOne({
      _id: id,
      userId: user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workspace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
*/
