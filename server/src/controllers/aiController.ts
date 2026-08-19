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
    console.log("AI Endpoint Hit");
    console.log("Request body:", req.body);

    const { reportId, imageUrl } = req.body;

    // --------------------------------------------------
    // 1. Validate request
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 2. Download image
    // --------------------------------------------------

    console.log("Downloading image...");

    const { base64, mimeType } =
      await downloadImageAsBase64(imageUrl);

    console.log("Image downloaded");
    console.log("Mime Type:", mimeType);
    console.log("Base64 Length:", base64.length);

    // --------------------------------------------------
    // 3. AI prompt
    // --------------------------------------------------

    const prompt = `
You are an expert veterinary rescue assistant.

Analyze the uploaded animal image carefully.

Your task is to identify the animal and estimate the visible injury severity.

Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.

The JSON must have exactly these fields:

{
  "animal_type": "",
  "severity": "",
  "priority": "",
  "ai_advice": ""
}

Allowed animal_type values:

Dog
Cat
Cow
Bird
Monkey
Other

Allowed severity values:

Low
Medium
High
Critical

Allowed priority values:

Normal
Urgent
Emergency

Rules:

1. animal_type must be exactly one of the allowed animal types.
2. severity must be exactly one of the allowed severity values.
3. priority must be exactly one of the allowed priority values.
4. ai_advice must be maximum 2 short sentences.
5. Do not invent injuries that cannot reasonably be seen.
6. If the image is unclear, use "Other" for animal_type and "Low" for severity.
7. This is advisory triage only and must not replace a veterinarian.

Example:

{
  "animal_type": "Dog",
  "severity": "Medium",
  "priority": "Urgent",
  "ai_advice": "The animal appears injured around the head area. Keep the animal calm and seek veterinary assistance."
}
`;

    // --------------------------------------------------
    // 4. Send image to Gemini
    // --------------------------------------------------

    console.log(
      "Sending image to Gemini..."
    );

    const response =
      await ai.models.generateContent({
        
        model: "gemini-3.6-flash",
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

    console.log(
      "Gemini Response Received"
    );

    const result = response.text;

    console.log(
      "Raw AI Response:"
    );

    console.log(result);

    if (!result) {
      throw new Error(
        "Gemini returned an empty response"
      );
    }

    // --------------------------------------------------
    // 5. Clean Gemini response
    // --------------------------------------------------

    let cleaned = result.trim();

    // Remove markdown code fences if present
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // --------------------------------------------------
    // 6. Parse JSON safely
    // --------------------------------------------------

    let aiResult: {
      animal_type: string;
      severity: string;
      priority: string;
      ai_advice: string;
    };

    try {
      aiResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini JSON:"
      );

      console.error(cleaned);

      // Try extracting the JSON object
      const jsonMatch =
        cleaned.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error(
          "Gemini returned invalid JSON"
        );
      }

      try {
        aiResult = JSON.parse(
          jsonMatch[0]
        );
      } catch {
        throw new Error(
          "Gemini returned invalid JSON"
        );
      }
    }

    console.log(
      "Parsed AI Result:"
    );

    console.log(aiResult);

    // --------------------------------------------------
    // 7. Validate AI result
    // --------------------------------------------------

    const allowedAnimals = [
      "Dog",
      "Cat",
      "Cow",
      "Bird",
      "Monkey",
      "Other",
    ];

    const allowedSeverity = [
      "Low",
      "Medium",
      "High",
      "Critical",
    ];

    const allowedPriority = [
      "Normal",
      "Urgent",
      "Emergency",
    ];

    if (
      !allowedAnimals.includes(
        aiResult.animal_type
      )
    ) {
      throw new Error(
        `Invalid animal_type returned by AI: ${aiResult.animal_type}`
      );
    }

    if (
      !allowedSeverity.includes(
        aiResult.severity
      )
    ) {
      throw new Error(
        `Invalid severity returned by AI: ${aiResult.severity}`
      );
    }

    if (
      !allowedPriority.includes(
        aiResult.priority
      )
    ) {
      throw new Error(
        `Invalid priority returned by AI: ${aiResult.priority}`
      );
    }

    if (
      typeof aiResult.ai_advice !==
      "string"
    ) {
      throw new Error(
        "Invalid ai_advice returned by AI"
      );
    }

    // --------------------------------------------------
    // 8. Update report in Supabase
    // --------------------------------------------------

    console.log(
      "Updating report in Supabase..."
    );

    const { data: updatedReport, error } =
      await supabase
        .from("reports")
        .update({
          animal_type:
            aiResult.animal_type,

          severity:
            aiResult.severity,

          priority:
            aiResult.priority,

          ai_advice:
            aiResult.ai_advice,
        })
        .eq("id", reportId)
        .select()
        .single();

    if (error) {
      console.error(
        "Supabase report update error:",
        error
      );

      throw error;
    }

    console.log(
      "Report Updated Successfully"
    );

    console.log(
      "Updated Report:",
      updatedReport
    );

    // --------------------------------------------------
    // 9. Return successful response
    // --------------------------------------------------

    return res.status(200).json({
      success: true,

      ai: aiResult,

      report: updatedReport,
    });

  } catch (error: any) {
    console.error(
      "======================================"
    );

    console.error(
      "AI ANALYSIS ERROR"
    );

    console.error(
      error
    );

    console.error(
      "======================================"
    );

    // --------------------------------------------------
    // Gemini/API unavailable
    // --------------------------------------------------

    const errorMessage =
      error?.message ||
      "AI analysis failed";

    if (
      errorMessage.includes(
        "503"
      ) ||
      errorMessage.includes(
        "UNAVAILABLE"
      ) ||
      errorMessage.includes(
        "currently unavailable"
      )
    ) {
      return res.status(503).json({
        success: false,

        message:
          "AI service is temporarily unavailable. Please try again later.",

        code: "AI_UNAVAILABLE",
      });
    }

    // --------------------------------------------------
    // General error
    // --------------------------------------------------

    return res.status(500).json({
      success: false,

      message:
        errorMessage,

      code: "AI_ANALYSIS_FAILED",
    });
  }
}