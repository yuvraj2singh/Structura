import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/** All valid structure types we can render on the canvas */
const VALID_STRUCTURE_TYPES = ["array", "graph", "tree", "stack", "queue", "list", "array2d", "heap"];

/**
 * Sanitizes raw control characters (unescaped \n, \r, \t, etc.) inside JSON string literals.
 * Prevents "Bad control character in string literal in JSON" syntax errors when AI generates
 * multiline strings for matrices or code snippets.
 */
function sanitizeJsonControlChars(str) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === "\"") {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else if (ch.charCodeAt(0) < 32) {
        result += " ";
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  return result;
}

/**
 * Safely parse JSON from LLMs, automatically recovering from output truncation
 * (e.g., when the token limit is hit mid-string or mid-step) and illegal control chars.
 */
function repairTruncatedJson(str) {
  if (!str || typeof str !== "string") return null;
  let cleaned = str.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  // Pre-sanitize any illegal control characters inside string literals (e.g. matrix newlines)
  cleaned = sanitizeJsonControlChars(cleaned);

  // 1. Standard parse first
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // 2. Scan for last fully-closed step in "steps" array
    try {
      let lastValidStepIndex = -1;
      let inString = false;
      let escaped = false;
      const stack = [];

      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (escaped) { escaped = false; continue; }
        if (ch === "\\") { escaped = true; continue; }
        if (ch === "\"") { inString = !inString; continue; }
        if (!inString) {
          if (ch === "{" || ch === "[") {
            stack.push({ char: ch, index: i });
          } else if (ch === "}" || ch === "]") {
            const top = stack[stack.length - 1];
            if ((ch === "}" && top?.char === "{") || (ch === "]" && top?.char === "[")) {
              stack.pop();
              // When a step object inside steps array completes (depth is 2: root { and steps [)
              if (ch === "}" && stack.length === 2 && stack[0].char === "{" && stack[1].char === "[") {
                lastValidStepIndex = i;
              }
            }
          }
        }
      }

      if (lastValidStepIndex !== -1) {
        const candidate = cleaned.slice(0, lastValidStepIndex + 1) + "]}";
        return JSON.parse(candidate);
      }
    } catch {}

    // 3. Fallback: backwards search for last valid brace
    try {
      for (let end = cleaned.lastIndexOf("}"); end > 0; end = cleaned.lastIndexOf("}", end - 1)) {
        try {
          const candidate = cleaned.slice(0, end + 1);
          let ob = 0, obr = 0, is = false, esc = false;
          for (let i = 0; i < candidate.length; i++) {
            const ch = candidate[i];
            if (esc) { esc = false; continue; }
            if (ch === "\\") { esc = true; continue; }
            if (ch === "\"") { is = !is; continue; }
            if (!is) {
              if (ch === "[") ob++;
              else if (ch === "]") ob--;
              else if (ch === "{") obr++;
              else if (ch === "}") obr--;
            }
          }
          let cl = "";
          while (ob > 0) { cl += "]"; ob--; }
          while (obr > 0) { cl += "}"; obr--; }
          return JSON.parse(candidate + cl);
        } catch {}
      }
    } catch {}

    throw initialErr;
  }
}

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

STEP 3 — SIMULATE THE COMPLETE, GRANULAR DRY RUN:
- Trace every single line hit: loop iterations, pointer advances, condition evaluations (true/false), state updates, and queue/stack changes.
- Generate between 20 to 35 comprehensive sequential steps (maximum 40 steps) to complete the algorithm execution without exceeding token limits.
- Keep descriptions concise and punchy (under 15 words per step).
- Only include "dataSnapshot" on steps where values in the data structure actually change. Do NOT repeat redundant snapshots.

STEP 4 — REAL-TIME CANVAS MUTATIONS (CRITICAL):
Whenever the algorithm updates values in a data structure (e.g. board[r][c] = '#', swapping array elements, changing 'O' -> 'X' or '#' -> 'O'):
You MUST include "mutations" in that step so the canvas visually updates the cell/element values!
Format: "mutations": [ { "target": "[r][c]" or flat index, "value": "#" } ]
Optionally also provide "dataSnapshot": string with full updated matrix rows or array elements.

5. SPECIAL MANDATORY GRAPH & PRIORITY QUEUE PROTOCOL (BFS, DFS, DIJKSTRA, HEAP, ETC.):
When the algorithm uses a Graph or Priority Queue / Heap (e.g. Dijkstra, swimInWater, Prim's, Kth largest, Min-Heap):
1. For graph traversals, structureType MUST be "graph" (or "array2d" if on a 2D grid like swimInWater).
2. If priority queue / min-heap is used:
   - Include "Priority Queue (Min Heap)" in dataStructuresUsed.
   - Provide "pq" in "variables" on EVERY SINGLE STEP!
   - "pq" MUST be an array representing the current active elements in the heap in min-to-max order (e.g. [[0, 0, 0]] or [{dist: 0, node: 0}] or [0, 2, 5]).
   - When pq.pop() occurs: remove the min element from "pq" immediately!
   - When pq.push(...) occurs: insert the new element into "pq" immediately!
   - On intermediate steps (checking conditions, loops, etc.): keep the current "pq" elements intact. NEVER set it to undefined or empty if items are still in the queue!
3. VARIABLES TRACKING (MANDATORY & 100% ACCURATE FOR EVERY SINGLE STEP):
   Every single step MUST accurately report:
   - "pq": The current priority queue contents (e.g. [[0, 0, 0], [2, 0, 1]]).
   - "dist": Current distance table/array/matrix (e.g. [0, INF, INF] or updated values).
   - "visited": An array of all nodes visited/settled so far. Once visited, never drop from subsequent steps!
   - "queue": For standard BFS, exact array of queued nodes in FIFO order. Pop removes head, push appends to tail.
   - "stack": For DFS, array showing active call stack.
   - "current" or "node": The node currently popped or being expanded.
   - "neighbor" or "nb": The neighbor currently being evaluated.
   - "order": Array of nodes in settled/traversal order.
4. GRANULARITY FOR PRIORITY QUEUE / DIJKSTRA:
   - Step: Initialize dist and push start node -> variables: { pq: [[0, 0]], dist: [0, INF, INF] }
   - Step: While !pq.empty() condition check
   - Step: Pop top min element (d, u) -> variables: { d: 0, u: 0, pq: [], dist: [0, INF, INF] }
   - Step: For neighbor v with weight w: relax edge -> update dist[v] and pq.push({dist[v], v}) -> variables: { u: 0, v: 1, pq: [[2, 1]], dist: [0, 2, INF] }
   - Step: Next loop: pop top element from pq -> variables: { u: 1, pq: [], dist: [0, 2, INF] }
   - Maintain continuous, non-vanishing "pq" and "dist" across all steps until completion!
5. HIGHLIGHTS:
   - Highlight the current node or cell being processed.
   - Use highlightColor: "#6366f1" for current, "#f59e0b" for checking/relaxing edge, "#10b981" for enqueued/pushed, "#ef4444" for skipped/outdated.

Output MUST be a valid JSON object:
{
  "algorithmName": "Exact algorithm name (e.g. Dijkstra's Algorithm)",
  "structureType": "graph" | "array2d" | "array" | "heap" | "stack" | "queue" | "tree" | "list",
  "dataStructuresUsed": ["Graph (Adjacency List)", "Priority Queue (Min Heap)"],
  "structures": [
    {
      "name": "Graph (Adjacency)",
      "type": "graph",
      "initialInput": "0-1(2)\n0-2(4)\n1-2(1)"
    },
    {
      "name": "Priority Queue (Min Heap)",
      "type": "heap",
      "initialInput": "0"
    }
  ],
  "graphOptions": { "directed": false, "weighted": true },
  "initialInput": "space-separated numbers for array, or matrix rows for array2d, or edges for graph",
  "complexity": { "time": "O((V + E) log V)", "space": "O(V + E)" },
  "summary": "What this code does and which data structures it utilizes in 1-2 sentences",
  "steps": [
    {
      "step": 1,
      "line": 12,
      "description": "Initialize source distance to 0 and push (0, source) into priority queue",
      "variables": { "u": 0, "dist": [0, "INF", "INF"], "pq": [[0, 0]] },
      "highlights": ["0"],
      "highlightColor": "#10b981",
      "action": "push"
    }
  ]
}

Note for "structures": Provide 1 to 2 visual structures used by the algorithm.
highlightColor values: "#6366f1" (active/current), "#f59e0b" (comparing/modifying), "#10b981" (found/success/safe/enqueued/pushed), "#ef4444" (mismatch/removed/captured/already_visited)
highlights: node labels (e.g. ["1", "2"] or ["1-2"]) for graph, coordinates "[r][c]" for array2d, indices for 1D array.

Return ONLY the raw JSON. No markdown, no backticks, no extra text.`;

    const userPrompt = `Programming Language: ${language}
${customInput ? `Test Input (use this data): ${customInput}\n` : ""}
Code:
\`\`\`${language}
${code.trim()}
\`\`\`

Analyze this code and detect ALL data structures used (primary and secondary).
CRITICAL REQUIREMENTS:
1. Complete Dry-Run: Simulate the algorithm execution with 20 to 35 granular, complete steps (maximum 40 steps) until the algorithm finishes.
2. PRIORITY QUEUE / GRAPH ACCURACY:
   - If a priority_queue / min-heap / queue is used, you MUST maintain and update "pq" (or "queue") in "variables" on EVERY SINGLE STEP!
   - When pq.push() occurs: add the element to "pq".
   - When pq.pop() occurs: remove the min element from "pq".
   - On checking/comparison steps: KEEP THE CURRENT "pq" AND "dist" IN "variables" (do NOT leave them undefined or empty!).
   - Also maintain "dist" (array or object of current distances) across all steps.
3. Real-Time Canvas Mutations: For 2D matrix or array changes, include the 'mutations' array with target and value.`;
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

        // Per-model timeout to avoid hanging (allow adequate time for deep code analysis)
        const timeoutMs = 80000;
        const fetchPromise = model.generateContent(userPrompt);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${modelId} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        const text = result?.response?.text();
        if (text) {
          try {
            responseJson = repairTruncatedJson(text);
            if (responseJson) break;
          } catch (parseErr) {
            console.warn(`[code-dryrun] JSON repair failed for model ${modelId}:`, parseErr.message);
            lastError = parseErr;
            continue;
          }
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
    if (!Array.isArray(responseJson.structures)) {
      responseJson.structures = [];
    }

    // Filter out invalid or empty structures
    responseJson.structures = responseJson.structures
      .filter((s) => s && VALID_STRUCTURE_TYPES.includes(s.type) && typeof s.initialInput === "string" && s.initialInput.trim() && s.initialInput.trim() !== "[]" && s.initialInput.trim() !== "{}")
      .slice(0, 3)
      .map((s) => ({
        name: s.name || s.type,
        type: s.type,
        initialInput: s.initialInput.trim(),
      }));

    // Ensure the primary structure is always present as the FIRST entry in structures
    const hasPrimary = responseJson.structures.some((s) => s.type === responseJson.structureType);
    if (!hasPrimary) {
      responseJson.structures.unshift({
        name: responseJson.dataStructuresUsed?.[0] || (responseJson.structureType === "graph" ? "Graph (Adjacency)" : responseJson.structureType),
        type: responseJson.structureType,
        initialInput: responseJson.initialInput,
      });
    }

    // 3. Trim initialInput to max 20 elements
    if (responseJson.structureType === "array") {
      const nums = responseJson.initialInput.replace(/[\[\],]/g, " ").trim().split(/\s+/).filter(Boolean);
      if (nums.length > 15) {
        responseJson.initialInput = nums.slice(0, 15).join(" ");
      }
    }

    // 4. Ensure steps array exists (checking alternate keys if needed)
    const rawSteps = responseJson.steps || responseJson.dryRun || responseJson.trace || responseJson.simulation || responseJson.executionSteps || [];
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
      return NextResponse.json({
        error: "AI returned an empty simulation. Please try again.",
        retryable: true,
      }, { status: 503 });
    }
    responseJson.steps = rawSteps;

    // 5. Sanitize each step — ensure graph & priority queue state tracking, highlights, mutations, and snapshots are preserved
    let lastVisited = [];
    let lastQueue = [];
    let lastStack = [];
    let lastOrder = [];
    let lastPQ = [];
    let lastDist = null;

    const isGraph = responseJson.structureType === "graph" ||
      responseJson.dataStructuresUsed?.some((ds) => /graph/i.test(ds));

    const parseArrayVal = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        const cleaned = val
          .replace(/^(?:set|deque|list)?\s*[\(\[{]+/, "")
          .replace(/[\)\]}]+$/, "")
          .trim();
        if (!cleaned) return [];
        return cleaned.split(/[\s,]+/).map((t) => (isNaN(t) ? t : Number(t)));
      }
      if (typeof val === "number" || typeof val === "boolean") return [val];
      return [];
    };

    const parsePQVal = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // e.g. "[(0, 0), (2, 1)]" or "[0, 2]"
          const matches = val.match(/\([^\)]+\)|\[[^\]]+\]|[^,\s\[\]]+/g);
          if (matches) return matches.map((m) => m.trim());
        }
      }
      return val ? [val] : [];
    };

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

      // Variable hygiene & state tracking
      const vars = s.variables && typeof s.variables === "object" ? { ...s.variables } : {};

      // ── Priority Queue / Min-Heap Tracking ──
      const rawPQ = vars.pq ?? vars.priority_queue ?? vars.minHeap ?? vars.min_heap ?? vars.heap;
      if (rawPQ !== undefined) {
        vars.pq = parsePQVal(rawPQ);
        lastPQ = vars.pq;
      } else if (lastPQ.length > 0) {
        vars.pq = [...lastPQ];
      }

      // Handle pop descriptions if LLM forgot to update pq
      if (s.description && /(?:pq|heap|priority_queue)\.pop|pop.*(?:top|min|element)/i.test(s.description)) {
        if (rawPQ === undefined && lastPQ.length > 0) {
          vars.pq = lastPQ.slice(1);
          lastPQ = vars.pq;
        }
      }

      // ── Distance Array / Table Tracking ──
      const rawDist = vars.dist ?? vars.distance ?? vars.distances;
      if (rawDist !== undefined) {
        vars.dist = rawDist;
        lastDist = Array.isArray(rawDist) ? [...rawDist] : (typeof rawDist === "object" && rawDist !== null ? { ...rawDist } : rawDist);
      } else if (lastDist !== null) {
        vars.dist = Array.isArray(lastDist) ? [...lastDist] : (typeof lastDist === "object" ? { ...lastDist } : lastDist);
      }

      if (isGraph) {
        // Track visited
        if (vars.visited !== undefined) {
          const parsed = parseArrayVal(vars.visited);
          const merged = new Set([...lastVisited, ...parsed]);
          vars.visited = Array.from(merged);
          lastVisited = vars.visited;
        } else if (lastVisited.length > 0) {
          vars.visited = [...lastVisited];
        }

        // Track queue
        if (vars.queue !== undefined) {
          vars.queue = parseArrayVal(vars.queue);
          lastQueue = vars.queue;
        } else if (lastQueue.length > 0) {
          vars.queue = [...lastQueue];
        }

        // Track stack
        if (vars.stack !== undefined) {
          vars.stack = parseArrayVal(vars.stack);
          lastStack = vars.stack;
        } else if (lastStack.length > 0) {
          vars.stack = [...lastStack];
        }

        // Track order
        if (vars.order !== undefined) {
          vars.order = parseArrayVal(vars.order);
          lastOrder = vars.order;
        } else if (lastOrder.length > 0) {
          vars.order = [...lastOrder];
        }

        // Ensure newly visited node in description is captured
        if (s.description && /visited\.add|mark.*visit/i.test(s.description)) {
          const nodeVal = vars.nb ?? vars.neighbor ?? vars.node ?? vars.current;
          if (nodeVal !== undefined && vars.visited && !vars.visited.includes(nodeVal)) {
            vars.visited = [...vars.visited, nodeVal];
            lastVisited = vars.visited;
          }
        }
      }

      return {
        step: s.step ?? i + 1,
        line: s.line ?? 1,
        description: s.description ?? `Step ${i + 1}`,
        variables: vars,
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
