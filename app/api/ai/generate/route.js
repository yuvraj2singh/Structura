import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";
import { parseAIResponse } from "@/lib/ai/parser";
import { getAuthUser } from "@/lib/auth/jwt";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export async function POST(request) {
  try {
    // Auth check (optional — allow unauthenticated for demo)
    // const user = await getAuthUser();
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Add it to .env.local." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { prompt, currentElements = [], mode = "add" } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: "Prompt too long (max 2000 chars)" }, { status: 400 });
    }

    // Build prompts
    const systemInstruction = buildSystemPrompt();
    const userMessage = buildUserPrompt(prompt.trim(), currentElements);

    // Call Gemini with fallback models if a model is unavailable
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      MODEL_NAME,
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
    ].filter((v, i, a) => a.indexOf(v) === i); // unique

    let rawText = "";
    let usedModel = MODEL_NAME;
    let lastError = null;

    for (const modelId of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelId,
          systemInstruction,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: 8192,
          },
        });

        const result = await model.generateContent(userMessage);
        rawText = result.response.text();
        if (rawText) {
          usedModel = modelId;
          break;
        }
      } catch (e) {
        lastError = e;
        console.warn(`[AI Generate] Model ${modelId} failed:`, e.message);
        // Continue to try next candidate model
      }
    }

    if (!rawText) {
      throw lastError || new Error("AI returned an empty response. Try rephrasing your prompt.");
    }

    // Parse and validate
    const { elements, warnings } = parseAIResponse(rawText);

    return NextResponse.json({
      elements,
      warnings,
      mode,
      prompt: prompt.trim(),
      model: MODEL_NAME,
    });
  } catch (err) {
    console.error("[AI Generate]", err);

    // Surface API errors clearly
    if (err.message?.includes("API_KEY_INVALID")) {
      return NextResponse.json({ error: "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local." }, { status: 401 });
    }
    if (err.message?.includes("SAFETY")) {
      return NextResponse.json({ error: "Prompt was blocked by safety filters. Please rephrase." }, { status: 422 });
    }
    if (err.message?.includes("quota") || err.message?.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json({ error: "Gemini API quota exceeded. Try again later." }, { status: 429 });
    }

    return NextResponse.json(
      { error: err.message || "AI generation failed" },
      { status: 500 }
    );
  }
}
