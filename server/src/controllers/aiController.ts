import { Request, Response } from "express";
import { ai } from "../services/gemini";
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

Analyze the uploaded animal image.

Return ONLY valid JSON.

{
  "animal_type": "",
  "severity": "",
  "priority": "",
  "ai_advice": ""
}

Rules:

animal_type:
Dog, Cat, Cow, Bird, Monkey or Other

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

    const response =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
      });

    res.json({
      success: true,
      result: response.text,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "AI Analysis Failed",
    });
  }
}