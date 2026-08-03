import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import aiRoutes from "./routes/ai";

// Load .env from the server folder
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

console.log("PORT:", process.env.PORT);
console.log("Gemini Key:", process.env.GEMINI_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());

// AI Routes
app.use("/api/ai", aiRoutes);

// Test Route
app.get("/", (_req, res) => {
  res.send("🚀 StrayAid Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});