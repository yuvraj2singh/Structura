import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/**
 * Generate a descriptive, human-readable name for a canvas version state using Gemini AI.
 * Falls back to deterministic summarization if Gemini is unavailable or times out.
 */
export async function generateVersionName({ elements = [], previousElements = [], boardTitle = "" }) {
  if (!elements || elements.length === 0) {
    return "Blank Canvas";
  }

  // 1. Extract text and structure hints from elements
  const textSnippets = elements
    .map((e) => e.text || e.label || "")
    .filter(Boolean)
    .slice(0, 15);

  const elementTypes = elements.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1;
    return acc;
  }, {});

  const typeSummary = Object.entries(elementTypes)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== "your-gemini-api-key") {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = [
        MODEL_NAME,
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      const prompt = `Analyze this whiteboard canvas state and generate a concise 3 to 6 word title summarizing what is on the canvas (e.g., "Binary Search Tree Traversal", "User Auth & JWT Flow", "Microservices Architecture", "Graph Dijkstra Path", "Payment Flowchart", "System Design Map").

Board Title: "${boardTitle || "Untitled"}"
Element Count: ${elements.length} (${typeSummary})
Text Content & Labels: [${textSnippets.join(", ")}]
Previous Element Count: ${previousElements.length}

Requirements:
- Return ONLY the short title text (3 to 6 words).
- Do NOT include quotes, punctuation at the end, or markdown.
- Be specific to the concepts or text found.`;

      for (const modelId of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 30,
            },
          });

          // Timeout promise after 3.5 seconds so save is not delayed
          const generatePromise = model.generateContent(prompt);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI timeout")), 3500)
          );

          const result = await Promise.race([generatePromise, timeoutPromise]);
          const candidateText = result?.response?.text()?.trim();
          if (candidateText && candidateText.length > 2) {
            // Clean up any extra quotation marks or newlines
            return candidateText
              .replace(/^["']|["']$/g, "")
              .replace(/[.#*]/g, "")
              .trim()
              .slice(0, 60);
          }
        } catch {
          // Try next candidate model
          continue;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Deterministic Fallback if AI is offline/unconfigured
  if (textSnippets.length > 0) {
    const mainTopic = textSnippets[0].slice(0, 24);
    if (elements.length > 1) {
      return `${mainTopic} (${elements.length} elements)`;
    }
    return mainTopic;
  }

  // Detect structure type from types
  if (elementTypes["circle"] && elementTypes["line"]) {
    return `Graph / Tree Structure (${elements.length} nodes)`;
  }
  if (elementTypes["rectangle"] && elementTypes["arrow"]) {
    return `Flowchart Architecture (${elements.length} items)`;
  }
  if (elementTypes["pen"]) {
    return `Freehand Sketch (${elements.length} strokes)`;
  }

  return `Canvas Snapshot (${elements.length} elements)`;
}
