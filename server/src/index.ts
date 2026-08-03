import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/ai", aiRoutes);

app.get("/", (_, res) => {
  res.send("Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});