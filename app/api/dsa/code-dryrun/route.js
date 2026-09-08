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

STEP 3 — SIMULATE THE COMPLETE, EXHAUSTIVE DRY RUN FROM INITIAL CALL TO FINAL TERMINATION:
- Do NOT abbreviate, summarize, or stop early. Simulate as many sequential steps as required (generate 35 to 60+ detailed steps) to complete the ENTIRE algorithm execution.
- Trace every single line hit: each loop iteration (inner and outer loops), pointer advance (left/right, low/high, i/j), array index inspection, condition check (true/false evaluation), swap, state assignment, recursion push, and return value.
- The dry run MUST proceed until the algorithm reaches its natural conclusion (e.g. array is 100% sorted, search target is found or search space exhausted, traversal visits all reachable nodes, recursion unwinds completely).
- Keep descriptions concise and punchy (10–20 words per step) so the JSON is dense, crisp, and informative.

STEP 4 — REAL-TIME CANVAS MUTATIONS (CRITICAL):
Whenever the algorithm updates values in a data structure (e.g. board[r][c] = '#', swapping array elements, changing 'O' -> 'X' or '#' -> 'O'):
You MUST include "mutations" in that step so the canvas visually updates the cell/element values!
Format: "mutations": [ { "target": "[r][c]" or flat index, "value": "#" } ]
Optionally also provide "dataSnapshot": string with full updated matrix rows or array elements.

STEP 5 — SPECIAL MANDATORY GRAPH EXECUTION PROTOCOL (BFS, DFS, DIJKSTRA, ETC.):
When the algorithm traverses or processes a Graph:
1. structureType MUST be "graph".
2. initialInput MUST represent the graph edges, e.g. "1 2\n1 3\n2 1\n2 3\n3 1\n3 2\n3 4\n4 3" or "1-2, 1-3, 2-3, 3-4" or "[[1,2],[1,3],[2,3],[3,4]]".
3. Provide secondary structure in "structures":
   - If BFS: { "name": "Queue (FIFO)", "type": "queue", "initialInput": "1" }
   - If DFS: { "name": "Call Stack", "type": "stack", "initialInput": "dfs(1)" }
4. VARIABLES TRACKING (MANDATORY & 100% ACCURATE FOR EVERY SINGLE STEP):
   Every single step MUST accurately report:
   - "visited": An array of all nodes visited so far (e.g. [1], then [1, 2], then [1, 2, 3]). Once a node is marked visited, it must NEVER disappear from "visited" in subsequent steps!
   - "queue": For BFS, an array showing the EXACT current queue contents in order (e.g. [1] -> after pop: [] -> after enqueuing neighbors: [2, 3] -> after popping 2: [3] -> after enqueuing 4: [3, 4]). Pop removes the head element; append adds to the tail. It must reflect the actual queue at that exact line of code!
   - "stack": For DFS, an array showing the active recursion/call stack (e.g. ["dfs(1)", "dfs(2)"]).
   - "current" or "node": The node currently popped or being expanded (e.g. 1).
   - "neighbor" or "nb": The neighbor currently being evaluated in the adjacency loop.
   - "order": An array of nodes in traversal order (e.g. [1, 2, 3, 4]).
5. GRANULARITY FOR GRAPH BFS/DFS:
   - Step: Enqueue start node and add to visited -> variables: { visited: [1], queue: [1], order: [] }
   - Step: Check while queue condition
   - Step: Pop front node -> variables: { node: 1, visited: [1], queue: [], order: [] }
   - Step: Add node to order -> variables: { node: 1, visited: [1], queue: [], order: [1] }
   - Step: Inspect neighbor 2 -> variables: { node: 1, nb: 2, visited: [1], queue: [], order: [1] }
   - Step: Check "if 2 not in visited" -> True -> mark visited and enqueue -> variables: { node: 1, nb: 2, visited: [1, 2], queue: [2], order: [1] }
   - Step: Inspect neighbor 3 -> variables: { node: 1, nb: 3, visited: [1, 2], queue: [2], order: [1] }
   - Step: Check "if 3 not in visited" -> True -> mark visited and enqueue -> variables: { node: 1, nb: 3, visited: [1, 2, 3], queue: [2, 3], order: [1] }
   - Step: Next queue iteration: pop front node 2 -> variables: { node: 2, visited: [1, 2, 3], queue: [3], order: [1] }
   - Step: For neighbor 1 of node 2 -> "1 already in visited, skip!" -> variables: { node: 2, nb: 1, visited: [1, 2, 3], queue: [3], order: [1, 2] }
   - Continue until the queue is empty!
6. HIGHLIGHTS FOR GRAPHS:
   - Highlight the current node being processed (e.g. ["1"]).
   - When inspecting an edge or neighbor: highlight both node and neighbor, or edge (e.g. ["1", "2"] or ["1-2"]).
   - Use highlightColor: "#6366f1" for current node, "#f59e0b" for checking neighbor, "#10b981" for enqueued/visited, "#ef4444" for already visited (skipped).

Output MUST be a valid JSON object:
{
  "algorithmName": "Exact algorithm name (e.g. Breadth-First Search (Graph))",
  "structureType": "array" | "graph" | "tree" | "stack" | "queue" | "list" | "array2d" | "heap",
  "dataStructuresUsed": ["Graph (Adjacency List)", "Queue (FIFO)"],
  "structures": [
    {
      "name": "Graph (Adjacency)",
      "type": "graph",
      "initialInput": "1 2\n1 3\n2 3\n3 4"
    },
    {
      "name": "Queue (FIFO)",
      "type": "queue",
      "initialInput": "1"
    }
  ],
  "graphOptions": { "directed": false, "weighted": false },
  "initialInput": "space-separated numbers for array, or matrix rows for array2d, or edges for graph, or values for tree/stack",
  "complexity": { "time": "O(V + E)", "space": "O(V)" },
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

Note for "structures": Provide 1 to 2 visual structures used by the algorithm (e.g. primary matrix + call stack for recursive DFS; or graph + queue for BFS). Each structure type must be one of: "array" | "graph" | "tree" | "stack" | "queue" | "list" | "array2d" | "heap".
highlightColor values: "#6366f1" (active/current), "#f59e0b" (comparing/modifying), "#10b981" (found/success/safe/enqueued), "#ef4444" (mismatch/removed/captured/already_visited)
highlights: node labels (e.g. ["1", "2"] or ["1-2"]) for graph, zero-based flat index or coordinate for array2d, indices for 1D array, node labels for tree.

Return ONLY the raw JSON. No markdown, no backticks, no extra text.`;

    const userPrompt = `Programming Language: ${language}
${customInput ? `Test Input (use this data): ${customInput}\n` : ""}
Code:
\`\`\`${language}
${code.trim()}
\`\`\`

Analyze this code and detect ALL data structures used (primary and secondary).
CRITICAL REQUIREMENTS:
1. Complete Dry-Run: Simulate the ENTIRE algorithm execution from start to finish without skipping or summarizing iterations. Generate as many detailed, granular steps as necessary (35 to 60+ steps) until the algorithm completely finishes.
2. GRAPH ACCURACY (BFS/DFS/Dijkstra):
   - For graph traversals, you MUST accurately maintain and update "visited" (array of visited nodes) and "queue" (exact array of queued nodes in FIFO order) in "variables" on EVERY single step!
   - When a node is popped from the queue, immediately remove it from "queue". When a neighbor is added to the queue, immediately append it to "queue". When marked visited, immediately add it to "visited" and keep it in all subsequent steps.
3. Real-Time Canvas Mutations: For every step where values in the data structure change (e.g. board[r][c] = '#', swapping array elements, changing 'O' -> 'X'), you MUST specify the 'mutations' array with target and value so the elements update in real time on the canvas.`;
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

    // 5. Sanitize each step — ensure graph state tracking, highlights, mutations, and snapshots are preserved
    let lastVisited = [];
    let lastQueue = [];
    let lastStack = [];
    let lastOrder = [];

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

      // Graph variable hygiene
      const vars = s.variables && typeof s.variables === "object" ? { ...s.variables } : {};
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
