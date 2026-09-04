import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/** All valid structure types we can render on the canvas */
const VALID_STRUCTURE_TYPES = ["array", "graph", "tree", "stack", "queue", "list", "array2d", "heap"];

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env.local." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { code, language = "python", customInput = "" } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Please enter or paste algorithm code" }, { status: 400 });
    }

    if (code.length > 8000) {
      return NextResponse.json({ error: "Code too long (max 8000 chars)" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Only working models — ordered by reliability
    const candidateModels = [
      "gemini-3.5-flash",
      PRIMARY_MODEL,
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    // ── CRITICAL: Very explicit system prompt to prevent wrong DS detection ──
    const systemInstruction = `You are a precise Code Execution Simulator and Data Structure Analyzer.

STEP 1 — IDENTIFY THE PRIMARY DATA STRUCTURE USED IN THE CODE:
Look at the actual data containers manipulated by the algorithm, not the algorithm name.

Rules for structureType selection:
- "array": code manipulates an array/list/vector with index access (arr[i], nums[i]). Examples: binary search, two sum, bubble sort, sliding window, prefix sum, merge sort, two pointers.
- "graph": code uses adjacency list/matrix, graph traversal (BFS/DFS on a graph). Examples: BFS, DFS, Dijkstra, Floyd, topological sort.
- "tree": code uses tree nodes with left/right children OR BST operations. Examples: inorder traversal, BST insert, tree height, LCA.
- "stack": code explicitly pushes/pops from a stack and the MAIN data structure IS the stack. Examples: valid parentheses, next greater element, monotonic stack.
- "queue": code explicitly uses a FIFO queue as main structure. Examples: FIFO queue operations, BFS uses queue but structureType is graph not queue.
- "list": code uses a linked list (node.next, ListNode). Examples: reverse linked list, detect cycle.
- "array2d": code uses a 2D grid/matrix. Examples: matrix rotation, island count, DP table.
- "heap": code explicitly uses a priority queue/heap. Examples: heap sort, k-th largest, merge k sorted lists.

CRITICAL RULE: Two Sum, Binary Search, Bubble Sort, Merge Sort, Quick Sort, Two Pointers, Sliding Window ALL use arrays. Return structureType: "array" for these. DO NOT return stack/queue for array algorithms.

STEP 2 — Generate representative test data (MAXIMUM 12-15 elements).

STEP 3 — Simulate execution step by step accurately.

Output MUST be a valid JSON object:
{
  "algorithmName": "Exact algorithm name",
  "structureType": "array" | "graph" | "tree" | "stack" | "queue" | "list" | "array2d" | "heap",
  "graphOptions": { "directed": false, "weighted": false },
  "initialInput": "space-separated numbers for array, or edges for graph, or values for tree",
  "complexity": { "time": "O(?)", "space": "O(?)" },
  "summary": "What this code does in 1-2 sentences",
  "steps": [
    {
      "step": 1,
      "line": 5,
      "description": "Plain-English explanation of exactly what happens at this line",
      "variables": { "i": 0, "target": 9, "left": 0, "right": 3 },
      "highlights": [0],
      "highlightColor": "#6366f1",
      "action": "visit"
    }
  ]
}

highlightColor values: "#6366f1" (active/current), "#f59e0b" (comparing), "#10b981" (found/success), "#ef4444" (mismatch/removed)
highlights: zero-based indices for array, node labels for graph/tree

Return ONLY the raw JSON. No markdown, no backticks, no extra text.`;

    const userPrompt = `Programming Language: ${language}
${customInput ? `Test Input (use this data): ${customInput}\n` : ""}
Code:
\`\`\`${language}
${code.trim()}
\`\`\`

Analyze this code, detect the correct data structure, and simulate execution. Remember: array algorithms like Two Sum, Binary Search, Sorting MUST use structureType "array".`;

    let responseJson = null;
    let lastError = null;

    for (const modelId of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelId,
          systemInstruction,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1, // Very low — we want deterministic accurate output
            maxOutputTokens: 8192,
          },
        });

        // Per-model timeout to avoid hanging
        const timeoutMs = 20000;
        const fetchPromise = model.generateContent(userPrompt);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${modelId} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        const text = result?.response?.text();
        if (text) {
          try {
            responseJson = JSON.parse(text);
          } catch {
            // Strip any accidental markdown wrapping
            const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            responseJson = JSON.parse(cleaned);
          }
          break;
        }
      } catch (err) {
        console.warn(`[code-dryrun] Model ${modelId} failed:`, err.message);
        lastError = err;
        continue;
      }
    }

    // If all AI models failed, return informative error (no silent fallback that shows wrong DS)
    if (!responseJson) {
      return NextResponse.json({
        error: "AI service is temporarily unavailable. Please try again in a few seconds.",
        retryable: true,
      }, { status: 503 });
    }

    // ── Validate and correct the response ──
    // 1. Ensure structureType is valid
    if (!VALID_STRUCTURE_TYPES.includes(responseJson.structureType)) {
      responseJson.structureType = "array";
    }

    // 2. Ensure initialInput exists and is reasonable
    if (!responseJson.initialInput || typeof responseJson.initialInput !== "string") {
      responseJson.initialInput = "1 2 3 4 5";
    }

    // 3. Trim initialInput to max 20 elements
    if (responseJson.structureType === "array") {
      const nums = responseJson.initialInput.replace(/[\[\],]/g, " ").trim().split(/\s+/).filter(Boolean);
      if (nums.length > 15) {
        responseJson.initialInput = nums.slice(0, 15).join(" ");
      }
    }

    // 4. Ensure steps array exists
    if (!Array.isArray(responseJson.steps) || responseJson.steps.length === 0) {
      return NextResponse.json({
        error: "AI returned an empty simulation. Please try again.",
        retryable: true,
      }, { status: 503 });
    }

    // 5. Sanitize each step — ensure highlights are always arrays
    responseJson.steps = responseJson.steps.map((s, i) => ({
      step: s.step ?? i + 1,
      line: s.line ?? 1,
      description: s.description ?? `Step ${i + 1}`,
      variables: s.variables && typeof s.variables === "object" ? s.variables : {},
      highlights: Array.isArray(s.highlights) ? s.highlights : [],
      highlightColor: s.highlightColor ?? "#6366f1",
      action: s.action ?? "visit",
    }));

    return NextResponse.json(responseJson);
  } catch (err) {
    console.error("[POST /api/dsa/code-dryrun]", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze code and generate dry run." },
      { status: 500 }
    );
  }
}
