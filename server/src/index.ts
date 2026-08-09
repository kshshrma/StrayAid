import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import aiRoutes from "./routes/ai";
import { ai } from "./services/gemini";
import rescueRoutes from "./routes/rescue";
const app = express();

app.use(cors());
app.use(express.json());

// Existing AI routes
app.use("/api/ai", aiRoutes);
app.use(
  "/api/rescue",
  rescueRoutes
);
// Home Route
app.get("/", (_, res) => {
  res.send("🚀 StrayAid Backend Running");
});

// TEMPORARY: List available Gemini models
app.get("/models", async (_, res) => {
  try {
    const models = await ai.models.list();

    const availableModels: string[] = [];

    for await (const model of models) {
      availableModels.push(model.name ?? "Unknown");
    }

    res.json({
      success: true,
      models: availableModels,
    });
  } catch (error: any) {
    console.error("Models Error:");
    console.dir(error, { depth: null });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});