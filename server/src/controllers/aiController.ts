import { Request, Response } from "express";
import { model } from "../services/gemini";
import { downloadImageAsBase64 } from "../utils/downloadImage";

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

    // Download image from Supabase
    const { base64, mimeType } =
      await downloadImageAsBase64(imageUrl);

    const prompt = `
You are an expert veterinarian.

Analyze this animal image.

Return ONLY valid JSON.

{
  "animal_type": "",
  "severity": "",
  "priority": "",
  "ai_advice": ""
}

animal_type:
Dog
Cat
Cow
Bird
Monkey
Other

severity:
Low
Medium
High
Critical

priority:
Normal
Urgent
Emergency

ai_advice:
Maximum 2 short sentences.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    const response = result.response;

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