import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectToDatabase } from "./services/mongodb";

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectToDatabase()
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection failed:", err.message));
});
