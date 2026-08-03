import { Request, Response } from "express";
import { ai } from "../services/gemini";

export async function analyzeAnimal(
  req: Request,
  res: Response
) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: "Say Hello",
    });

    res.json({
      success: true,
      result: response.text,
    });
  } catch (error: any) {
  console.error("FULL ERROR:");
  console.dir(error, { depth: null });

  res.status(500).json({
    success: false,
    message: error?.message || "Unknown error",
  });

  }
}