import { Request, Response } from "express";
import { ai } from "../services/gemini";
import { downloadImageAsBase64 } from "../utils/downloadImage";

export async function analyzeAnimal(
  req: Request,
  res: Response
) {
  try {
    console.log("======================================");
    console.log("✅ AI Endpoint Hit");
    console.log(req.body);

    const { reportId, imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    console.log("⬇️ Downloading image...");

    const { base64, mimeType } =
      await downloadImageAsBase64(imageUrl);

    console.log("✅ Image downloaded");
    console.log("Mime Type:", mimeType);
    console.log("Base64 Length:", base64.length);

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

    console.log("🚀 Sending image to Gemini...");

    const response = await ai.models.generateContent({
      model: "models/gemini-3.5-flash",
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

    console.log("✅ Gemini Response Received");
    console.log(response);

    const result = response.text;

    console.log("AI Result:");
    console.log(result);

    // We'll save to Supabase later
    if (reportId) {
      console.log("Report ID:", reportId);
    }

    return res.json({
      success: true,
      result,
    });

  } catch (error: any) {
    console.log("======================================");
    console.log("❌ AI ERROR");

    console.dir(error, { depth: null });

    return res.status(500).json({
      success: false,
      message: error?.message || "AI Analysis Failed",
    });
  }
}