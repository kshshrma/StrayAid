import { Request, Response } from "express";
import { model } from "../services/gemini";

export async function analyzeAnimal(
  req: Request,
  res: Response
) {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    const prompt = `
You are an expert veterinarian.

The following is an image URL of an animal.

Image URL:
${imageUrl}

Guess the animal and return ONLY valid JSON.

{
  "animal_type": "",
  "severity": "",
  "priority": "",
  "ai_advice": ""
}
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    res.json({
      success: true,
      result: response.text(),
    });

  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}