/**
 * DSA Input Parsers
 * Each parser accepts a raw string and returns a normalized structure.
 */

/** Tokenize a flat string of numbers/values, space or comma separated */
function tokenize(str) {
  return str
    .replace(/[\[\]()]/g, "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (isNaN(t) ? t : Number(t)));
}

/** Parse 1D array: "1 2 3 4 5" or "[1,2,3]" */
export function parseArray(str) {
  const values = tokenize(str);
  if (!values.length) throw new Error("Enter at least one value");
  return values.map((v, i) => ({ index: i, value: v }));
}

/** Parse 2D array / matrix */
export function parseArray2D(str) {
  // Accept [[1,2],[3,4]] or "1 2 / 3 4" or "1 2\n3 4"
  const clean = str.trim();
  let rows;
  if (clean.startsWith("[[")) {
    // JSON-style
    try {
      const parsed = JSON.parse(clean);
      rows = parsed.map((row) => row.map(Number));
    } catch {
      throw new Error('Invalid 2D array. Use format [[1,2],[3,4]]');
    }
  } else {
    rows = clean.split(/[\n/]+/).map((row) =>
      row.replace(/[\[\]]/g, "").split(/[\s,]+/).filter(Boolean).map(Number)
    );
  }
  if (!rows.length) throw new Error("Enter at least one row");
  return rows;
}

/** Parse linked list: "1 2 3 4" or "1->2->3" */
export function parseLinkedList(str) {
  const values = tokenize(str.replace(/->/g, " ").replace(/→/g, " "));
  if (!values.length) throw new Error("Enter at least one value");
  return values.map((v, i) => ({ value: v, index: i, isNull: i === values.length - 1 }));
}

/** Parse stack: "1 2 3" — last value is top */
export function parseStack(str) {
  const values = tokenize(str);
  if (!values.length) throw new Error("Enter at least one value");
  return values.map((v, i) => ({
    value: v,
    index: i,
    isTop: i === values.length - 1,
    isBottom: i === 0,
  }));
}

/** Parse queue: "1 2 3" — first is front, last is rear */
export function parseQueue(str) {
  const values = tokenize(str);
  if (!values.length) throw new Error("Enter at least one value");
  return values.map((v, i) => ({
    value: v,
    index: i,
    isFront: i === 0,
    isRear: i === values.length - 1,
  }));
}

/** Build BST from insertion-order values */
class BSTNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

function insertBST(root, value) {
  if (!root) return new BSTNode(value);
  if (value < root.value) root.left = insertBST(root.left, value);
  else root.right = insertBST(root.right, value);
  return root;
}

function flattenBST(node, id = "0", depth = 0, x = 0) {
  if (!node) return [];
  const nodes = [{ id, value: node.value, depth, x }];
  if (node.left) nodes.push(...flattenBST(node.left, id + "L", depth + 1, x - 1));
  if (node.right) nodes.push(...flattenBST(node.right, id + "R", depth + 1, x + 1));
  return nodes;
}

/** Parse tree / BST: supports numbers list "50 30 70 20 40" or edge pairs "1 2\n1 3" or array "[1,2,3,null,4]" */
export function parseTree(str) {
  const clean = str.trim();
  if (!clean) throw new Error("Enter tree values or edge pairs");

  // Check if user entered edge pairs like "1 2\n1 3" or "1-2, 1-3"
  const lines = clean.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  const isEdgeList = lines.length > 1 && lines.every((l) => /[-–→>\s,]+/.test(l.trim()));

  if (isEdgeList) {
    // Parse generic tree from parent-child edges
    const nodes = new Map();
    const childrenMap = new Map();
    const hasParent = new Set();

    for (const line of lines) {
      const parts = line.split(/[-–→>\s,]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const parent = parts[0];
        const child = parts[1];
        if (!nodes.has(parent)) nodes.set(parent, { id: `node-${parent}`, value: isNaN(parent) ? parent : Number(parent) });
        if (!nodes.has(child)) nodes.set(child, { id: `node-${child}`, value: isNaN(child) ? child : Number(child) });

        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        childrenMap.get(parent).push(child);
        hasParent.add(child);
      }
    }

    // Find root (node without parent)
    const rootKey = [...nodes.keys()].find((k) => !hasParent.has(k)) || [...nodes.keys()][0];
    if (!rootKey) throw new Error("Could not determine tree root from edges");

    const result = [];
    let counter = 0;

    function layoutSubtree(nodeKey, depth = 0) {
      const children = childrenMap.get(nodeKey) || [];
      const leftChild = children[0] || null;
      const rightChild = children[1] || null;

      if (leftChild) layoutSubtree(leftChild, depth + 1);
      const myX = counter++;
      if (rightChild) layoutSubtree(rightChild, depth + 1);

      // Other children if > 2
      for (let i = 2; i < children.length; i++) {
        layoutSubtree(children[i], depth + 1);
      }

      result.push({
        id: `node-${nodeKey}`,
        value: isNaN(nodeKey) ? nodeKey : Number(nodeKey),
        depth,
        x: myX,
        leftId: leftChild ? `node-${leftChild}` : null,
        rightId: rightChild ? `node-${rightChild}` : null,
      });
    }

    layoutSubtree(rootKey, 0);
    return result;
  }

  // Otherwise standard BST insertion or level-order
  const values = tokenize(str);
  if (!values.length) throw new Error("Enter at least one value");
  let root = null;
  for (const v of values) root = insertBST(root, v);

  // Compute positions using in-order traversal
  const result = [];
  let counter = 0;

  function assignX(node, depth) {
    if (!node) return null;
    assignX(node.left, depth + 1);
    const myX = counter++;
    assignX(node.right, depth + 1);
    result.push({
      id: `node-${node.value}`,
      value: node.value,
      depth,
      x: myX,
      leftId: node.left ? `node-${node.left.value}` : null,
      rightId: node.right ? `node-${node.right.value}` : null,
    });
  }

  assignX(root, 0);
  return result;
}

/** Parse max-heap from array, then heapify */
export function parseHeap(str) {
  const values = tokenize(str).map(Number).filter((v) => !isNaN(v));
  if (!values.length) throw new Error("Enter at least one value");

  const heap = [...values];
  // Max-heapify
  for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) {
    heapifyDown(heap, i, heap.length);
  }

  function heapifyDown(arr, i, n) {
    let largest = i;
    const l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      heapifyDown(arr, largest, n);
    }
  }

  return heap.map((value, i) => ({
    index: i,
    value,
    parentIndex: i === 0 ? null : Math.floor((i - 1) / 2),
    leftIndex: 2 * i + 1 < heap.length ? 2 * i + 1 : null,
    rightIndex: 2 * i + 2 < heap.length ? 2 * i + 2 : null,
    depth: Math.floor(Math.log2(i + 1)),
  }));
}

/**
 * Parse graph supporting:
 * - Integer or string nodes
 * - Directed or Undirected
 * - Weighted or Unweighted
 * - Formats:
 *   "1 - 2" or "1 2" or "1 -> 2"
 *   "1 - 2 : 5" or "1 2 5" or "1 2 : 5"
 *   "1 2, 2 3, 3 1" or line-separated
 */
export function parseGraph(str, options = { directed: false, weighted: false }) {
  const clean = str.trim();
  if (!clean) throw new Error("Enter edges (e.g., 1 2, 2 3, 3 1)");

  // Split lines by newline, semicolon, or comma-separated pairs
  const rawSegments = clean
    .split(/[\n;]+/)
    .flatMap((line) => {
      // If line contains multiple comma-separated edge statements
      if (line.includes(",") && !/^\s*\[/.test(line)) {
        return line.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [line.trim()];
    })
    .filter(Boolean);

  const nodes = new Map();
  const edges = [];

  for (const segment of rawSegments) {
    let from = null;
    let to = null;
    let weight = null;

    // Match "1 - 2 : 5" or "1-2:5" or "1 -> 2 : 5"
    const colonMatch = segment.match(/^([^-–→>:\s]+)\s*[-–→>\s]+\s*([^-–→>:\s]+)\s*:\s*(-?\d+(?:\.\d+)?)/);
    if (colonMatch) {
      from = colonMatch[1].trim();
      to = colonMatch[2].trim();
      weight = Number(colonMatch[3]);
    } else {
      // Match whitespace or symbol separation: "1 2 5" or "1 2" or "1 - 2" or "1 -> 2"
      const tokens = segment
        .replace(/[-–→>]+/g, " ")
        .replace(/[:]/g, " ")
        .split(/[\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      if (tokens.length >= 3 && !isNaN(tokens[2])) {
        from = tokens[0];
        to = tokens[1];
        weight = Number(tokens[2]);
      } else if (tokens.length >= 2) {
        from = tokens[0];
        to = tokens[1];
        weight = options.weighted ? 1 : null;
      } else if (tokens.length === 1) {
        // Single isolated node
        const single = tokens[0];
        if (!nodes.has(single)) {
          nodes.set(single, {
            id: single,
            label: isNaN(single) ? single : Number(single),
            numericKey: isNaN(single) ? null : Number(single),
          });
        }
        continue;
      }
    }

    if (from && to) {
      if (!nodes.has(from)) {
        nodes.set(from, {
          id: from,
          label: isNaN(from) ? from : Number(from),
          numericKey: isNaN(from) ? null : Number(from),
        });
      }
      if (!nodes.has(to)) {
        nodes.set(to, {
          id: to,
          label: isNaN(to) ? to : Number(to),
          numericKey: isNaN(to) ? null : Number(to),
        });
      }

      edges.push({
        from,
        to,
        weight: options.weighted ? (weight !== null && !isNaN(weight) ? weight : 1) : null,
        directed: options.directed,
      });
    }
  }

  if (!nodes.size) {
    throw new Error("Invalid graph input. Try: 1 2 or 1 - 2 : 5");
  }

  // Sort nodes: numeric nodes sorted numerically (1, 2, 3...) for natural circular layout
  const sortedNodes = [...nodes.values()].sort((a, b) => {
    if (a.numericKey !== null && b.numericKey !== null) return a.numericKey - b.numericKey;
    return String(a.label).localeCompare(String(b.label));
  });

  return {
    nodes: sortedNodes,
    edges,
    directed: options.directed ?? false,
    weighted: options.weighted ?? false,
  };
}

/** Parse string: "HELLO" */
export function parseString(str) {
  const chars = str.trim().split("");
  if (!chars.length) throw new Error("Enter at least one character");
  return chars.map((ch, i) => ({ index: i, value: ch }));
}

/** Main dispatcher */
export function parseInput(type, rawStr, options = {}) {
  const str = rawStr.trim();
  switch (type) {
    case "array":   return { type, data: parseArray(str) };
    case "array2d": return { type, data: parseArray2D(str) };
    case "list":    return { type, data: parseLinkedList(str) };
    case "stack":   return { type, data: parseStack(str) };
    case "queue":   return { type, data: parseQueue(str) };
    case "tree":    return { type, data: parseTree(str) };
    case "heap":    return { type, data: parseHeap(str) };
    case "graph":   return { type, data: parseGraph(str, options) };
    case "string":  return { type, data: parseString(str) };
    default: throw new Error(`Unknown structure type: ${type}`);
  }
}
