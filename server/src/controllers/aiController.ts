import { Request, Response } from "express";
import { ai } from "../services/gemini";
import { downloadImageAsBase64 } from "../utils/downloadImage";
import { supabase } from "../services/supabase";

export async function analyzeAnimal(
  req: Request,
  res: Response
) {
  try {
    console.log("======================================");
    console.log("✅ AI Endpoint Hit");
    console.log(req.body);

    const { reportId, imageUrl } = req.body;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: "Report ID is required",
      });
    }

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

Analyze the uploaded animal image carefully.

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
      model: "gemini-flash-latest",
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

    const result = response.text;

    console.log("Raw AI Response:");
    console.log(result);

    // Remove markdown if Gemini wraps JSON in ```json ... ```
    const cleaned = result
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const aiResult = JSON.parse(cleaned);

    console.log("Parsed AI Result:");
    console.log(aiResult);

    console.log("💾 Updating Supabase...");

    const { error } = await supabase
      .from("reports")
      .update({
        animal_type: aiResult.animal_type,
        severity: aiResult.severity,
        priority: aiResult.priority,
        ai_advice: aiResult.ai_advice,
      })
      .eq("id", reportId);

    if (error) {
      throw error;
    }

    console.log("✅ Report Updated Successfully");

    return res.json({
      success: true,
      ai: aiResult,
    });

  } catch (error: any) {
    console.log("======================================");
    console.log("❌ AI ERROR");

    console.dir(error, { depth: null });

    return res.status(500).json({
      success: false,
      message: error.message || "AI Analysis Failed",
    });
  }
}