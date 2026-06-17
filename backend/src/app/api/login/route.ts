import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import {
  createToken,
  setAuthCookie,
  getCurrentUser,
  clearAuthCookie,
} from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let user = await User.findOne({ name });

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        name,
        password: hashedPassword,
        role: "u",
      });
    } else {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
    }

    const token = await createToken({
      id: user._id.toString(),
      role: user.role,
    });

    await setAuthCookie(token);

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    return NextResponse.json({
      id: user._id.toString(),
      role: user.role,
      exp,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(false);
    }

    return NextResponse.json({
      id: user.id,
      role: user.role,
      exp: user.exp,
    });
  } catch (error) {
    console.error("Get login error:", error);
    return NextResponse.json(false);
  }
}

export async function DELETE() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
