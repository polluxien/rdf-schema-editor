import express from "express";

export const userRouter = express.Router();

userRouter.post("/", async (req, res) => {
  try {
    const { name, password } = await req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

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
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }

    const token = await createToken({
      id: user._id.toString(),
      role: user.role,
    });

    await setAuthCookie(token);

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    return res.json({
      id: user._id.toString(),
      role: user.role,
      exp,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
