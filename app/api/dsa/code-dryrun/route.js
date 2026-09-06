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

    // Active working models ordered by speed and availability
    const candidateModels = [
      PRIMARY_MODEL,
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    // ── CRITICAL: Very explicit system prompt to detect all data structures accurately ──
    const systemInstruction = `You are a precise Code Execution Simulator and Data Structure Analyzer.

STEP 1 — IDENTIFY ALL DATA STRUCTURES USED IN THE CODE:
Thoroughly inspect the code for all data containers, matrix tables, heaps, recursion stacks, queues, hash maps, and trees.
If the code uses MULTIPLE data structures, detect ALL of them!
Examples:
- Matrix DFS / BFS (e.g. Surrounded Regions, Number of Islands, Word Search): Uses "2D Grid / Matrix" and "Call Stack (Recursion)" (or "Queue" for BFS). structureType MUST be "array2d".
- Two Sum with Map: Uses "1D Array" and "Hash Map (Unordered Map)". structureType: "array".
- Dijkstra: Uses "Graph (Adjacency List)" and "Priority Queue (Min Heap)". structureType: "graph".
- Valid Parentheses: Uses "Stack" and "String / Array". structureType: "stack".
- Tree BFS / Level Order: Uses "Binary Tree" and "Queue". structureType: "tree".
- LRU Cache: Uses "Doubly Linked List" and "Hash Map". structureType: "list".

Rules for primary structureType selection:
- "array2d": code manipulates a 2D grid/matrix (e.g., vector<vector<char>>, int[][], grid[r][c], board[i][j]).
- "array": code manipulates an array/list/vector with index access (arr[i], nums[i]).
- "graph": code uses adjacency list/matrix, graph traversal (BFS/DFS on a graph).
- "tree": code uses tree nodes with left/right children OR BST operations.
- "stack": code explicitly pushes/pops from a stack and the main focus is LIFO order.
- "queue": code explicitly uses a FIFO queue.
- "list": code uses a linked list (node.next, ListNode).
- "heap": code explicitly uses a priority queue/heap.

CRITICAL RULE: Two Sum, Binary Search, Bubble Sort, Merge Sort, Quick Sort, Two Pointers, Sliding Window ALL use arrays. Return structureType: "array" for these.

STEP 2 — Generate representative test data (MAXIMUM 4x4 or 3x4 for 2D matrix, 6-8 elements for 1D/stack/tree). For 2D character matrix, space-separate each row on a new line (e.g. "X O X X\nO X O X\nX O X X").

STEP 3 — Simulate execution step by step accurately (MAXIMUM 6 to 10 key steps). Keep descriptions concise (under 20 words each).

STEP 4 — REAL-TIME CANVAS MUTATIONS (CRITICAL):
Whenever the algorithm updates values in a data structure (e.g. board[r][c] = '#', swapping array elements, changing 'O' -> 'X' or '#' -> 'O'):
You MUST include "mutations" in that step so the canvas visually updates the cell/element values!
Format: "mutations": [ { "target": "[r][c]" or flat index, "value": "#" } ]
Optionally also provide "dataSnapshot": string with full updated matrix rows or array elements.

Output MUST be a valid JSON object:
{
  "algorithmName": "Exact algorithm name (e.g. Surrounded Regions (Matrix DFS))",
  "structureType": "array" | "graph" | "tree" | "stack" | "queue" | "list" | "array2d" | "heap",
  "dataStructuresUsed": ["2D Grid / Matrix", "Call Stack (Recursion)"],
  "structures": [
    {
      "name": "board (2D Grid)",
      "type": "array2d",
      "initialInput": "X O X X\nO X O X\nX O X X"
    },
    {
      "name": "Call Stack (Recursion)",
      "type": "stack",
      "initialInput": "dfs(0,1)"
    }
  ],
  "graphOptions": { "directed": false, "weighted": false },
  "initialInput": "space-separated numbers for array, or matrix rows for array2d, or edges for graph, or values for tree/stack",
  "complexity": { "time": "O(?)", "space": "O(?)" },
  "summary": "What this code does and which data structures it utilizes in 1-2 sentences",
  "steps": [
    {
      "step": 1,
      "line": 13,
      "description": "Mark boundary cell (0, 1) as safe '#'",
      "variables": { "r": 0, "c": 1 },
      "highlights": ["[0][1]"],
      "highlightColor": "#f59e0b",
      "action": "mark_safe",
      "mutations": [
        { "target": "[0][1]", "value": "#" }
      ],
      "dataSnapshot": "X # X X\nO X O X\nX O X X"
    }
  ]
}

Note for "structures": Provide 1 to 2 visual structures used by the algorithm (e.g. primary matrix + call stack for recursive DFS; or array + queue for BFS). Each structure type must be one of: "array" | "graph" | "tree" | "stack" | "queue" | "list" | "array2d" | "heap".
highlightColor values: "#6366f1" (active/current), "#f59e0b" (comparing/modifying), "#10b981" (found/success/safe), "#ef4444" (mismatch/removed/captured)
highlights: zero-based flat index or coordinate for array2d (e.g. [0, 1] or "[0][1]"), indices for 1D array, node labels for graph/tree.

Return ONLY the raw JSON. No markdown, no backticks, no extra text.`;

    const userPrompt = `Programming Language: ${language}
${customInput ? `Test Input (use this data): ${customInput}\n` : ""}
Code:
\`\`\`${language}
${code.trim()}
\`\`\`

Analyze this code, detect ALL data structures used (including primary and any secondary structures such as 2D Grid + Call Stack, Array + Hash Map, Graph + Queue, etc.). If the code manipulates a 2D matrix (vector<vector<char>>, int[][], etc.), the structureType MUST be 'array2d'.
CRITICAL: For every step where values in the data structure change (e.g. board[r][c] = '#' or converting surrounded 'O' -> 'X' and safe '#' -> 'O'), you MUST specify the 'mutations' array with target (e.g. "[r][c]") and value (e.g. "#", "X", or "O") so the board cells change their values in real time on the canvas! Keep simulation to 6-10 concise steps.`;
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
            maxOutputTokens: 2048,
          },
        });

        // Per-model timeout to avoid hanging (allow adequate time for deep code analysis)
        const timeoutMs = 45000;
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
        console.error(`[code-dryrun] Model ${modelId} failed:`, err.message);
        lastError = err;
        continue;
      }
    }

    // If all AI models failed, return informative error with details
    if (!responseJson) {
      console.error("[code-dryrun] All candidate models failed. Last error:", lastError?.message);
      return NextResponse.json({
        error: lastError?.message
          ? `AI error (${lastError.message.slice(0, 120)}). Please try again.`
          : "AI service is temporarily unavailable. Please try again in a few seconds.",
        retryable: true,
      }, { status: 503 });
    }

    // ── Validate and correct the response ──
    // 1. Ensure structureType is valid
    if (!VALID_STRUCTURE_TYPES.includes(responseJson.structureType)) {
      responseJson.structureType = "array";
    }

    // 2. Ensure dataStructuresUsed is populated
    if (!Array.isArray(responseJson.dataStructuresUsed) || responseJson.dataStructuresUsed.length === 0) {
      responseJson.dataStructuresUsed = [responseJson.structureType.toUpperCase()];
    }

    // 3. Ensure initialInput exists and is reasonable
    if (!responseJson.initialInput || typeof responseJson.initialInput !== "string") {
      responseJson.initialInput = "1 2 3 4 5";
    }

    // 4. Ensure structures array is populated and sanitized
    if (!Array.isArray(responseJson.structures) || responseJson.structures.length === 0) {
      responseJson.structures = [
        {
          name: responseJson.dataStructuresUsed[0] || responseJson.structureType,
          type: responseJson.structureType,
          initialInput: responseJson.initialInput,
        },
      ];
    } else {
      responseJson.structures = responseJson.structures
        .filter((s) => s && VALID_STRUCTURE_TYPES.includes(s.type) && typeof s.initialInput === "string" && s.initialInput.trim())
        .slice(0, 3)
        .map((s) => ({
          name: s.name || s.type,
          type: s.type,
          initialInput: s.initialInput.trim(),
        }));
      if (responseJson.structures.length === 0) {
        responseJson.structures = [
          {
            name: responseJson.dataStructuresUsed[0] || responseJson.structureType,
            type: responseJson.structureType,
            initialInput: responseJson.initialInput,
          },
        ];
      }
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

    // 5. Sanitize each step — ensure highlights, mutations, and snapshots are preserved or inferred
    responseJson.steps = responseJson.steps.map((s, i) => {
      let mutations = Array.isArray(s.mutations)
        ? s.mutations.filter((m) => m && m.value !== undefined)
        : (s.mutation ? [s.mutation] : []);

      // If no explicit mutations array, infer from common LLM step formats
      if (mutations.length === 0) {
        if (s.newValue !== undefined) {
          mutations = [{ target: s.highlights?.[0] ?? 0, value: s.newValue }];
        } else if (s.description) {
          const cellAssignMatch = s.description.match(/board\[(\d+)\]\[(\d+)\]\s*=\s*['"]?([^'"\s]+)['"]?/i);
          if (cellAssignMatch) {
            mutations = [{ target: `[${cellAssignMatch[1]}][${cellAssignMatch[2]}]`, value: cellAssignMatch[3] }];
          } else {
            const toCharMatch = s.description.match(/(?:to|as|=|is)\s+['"]([XO#])['"]/i);
            if (toCharMatch) {
              const val = toCharMatch[1];
              const r = s.variables?.r ?? s.variables?.i;
              const c = s.variables?.c ?? s.variables?.j;
              if (r !== undefined && c !== undefined) {
                mutations = [{ target: `[${r}][${c}]`, value: val }];
              } else if (s.highlights && s.highlights.length > 0) {
                mutations = s.highlights.map((hl) => ({ target: hl, value: val }));
              }
            }
          }
        }
      }

      return {
        step: s.step ?? i + 1,
        line: s.line ?? 1,
        description: s.description ?? `Step ${i + 1}`,
        variables: s.variables && typeof s.variables === "object" ? s.variables : {},
        highlights: Array.isArray(s.highlights) ? s.highlights : [],
        highlightColor: s.highlightColor ?? "#6366f1",
        action: s.action ?? "visit",
        mutations,
        dataSnapshot: typeof s.dataSnapshot === "string" ? s.dataSnapshot : (typeof s.boardState === "string" ? s.boardState : null),
      };
    });

    return NextResponse.json(responseJson);
  } catch (err) {
    console.error("[POST /api/dsa/code-dryrun]", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze code and generate dry run." },
      { status: 500 }
    );
  }
}
