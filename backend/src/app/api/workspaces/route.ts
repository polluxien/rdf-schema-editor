import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { getCurrentUser } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const workspaces = await Workspace.find({ userId: user.id })
      .select("_id name description createdAt updatedAt")
      .sort({ updatedAt: -1 });

    const result = workspaces.map((ws: { _id: { toString(): string }; name: string; description: string }) => ({
      id: ws._id.toString(),
      name: ws.name,
      description: ws.description,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get workspaces error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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

    return NextResponse.json({
      id: workspace._id.toString(),
      name: workspace.name,
      description: workspace.description,
    });
  } catch (error) {
    console.error("Create workspace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
