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

/** Parse tree / BST: "50 30 70 20 40" — inserts in order into BST */
export function parseTree(str) {
  const values = tokenize(str);
  if (!values.length) throw new Error("Enter at least one value");
  let root = null;
  for (const v of values) root = insertBST(root, v);

  // Compute positions using in-order traversal
  const result = [];
  let counter = 0;

  function assignX(node, depth) {
    if (!node) return null;
    const leftResult = assignX(node.left, depth + 1);
    const myX = counter++;
    const rightResult = assignX(node.right, depth + 1);
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

/** Parse graph: "A-B\nA-C\nB-D" or "A-B:5\nA-C:2" (weighted) */
export function parseGraph(str) {
  const lines = str.trim().split("\n").filter(Boolean);
  const nodes = new Map();
  const edges = [];

  for (const line of lines) {
    const weightMatch = line.match(/(.+)-(.+):(\d+)/);
    if (weightMatch) {
      const [, a, b, w] = weightMatch;
      const from = a.trim(), to = b.trim();
      if (!nodes.has(from)) nodes.set(from, { id: from, label: from });
      if (!nodes.has(to)) nodes.set(to, { id: to, label: to });
      edges.push({ from, to, weight: Number(w) });
    } else {
      const parts = line.split(/[-–→>]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        const from = parts[0], to = parts[1];
        if (!nodes.has(from)) nodes.set(from, { id: from, label: from });
        if (!nodes.has(to)) nodes.set(to, { id: to, label: to });
        edges.push({ from, to, weight: null });
      }
    }
  }

  if (!nodes.size) throw new Error("Enter edges like: A-B or A-B:5");
  return { nodes: [...nodes.values()], edges };
}

/** Parse string: "HELLO" */
export function parseString(str) {
  const chars = str.trim().split("");
  if (!chars.length) throw new Error("Enter at least one character");
  return chars.map((ch, i) => ({ index: i, value: ch }));
}

/** Main dispatcher */
export function parseInput(type, rawStr) {
  const str = rawStr.trim();
  switch (type) {
    case "array":   return { type, data: parseArray(str) };
    case "array2d": return { type, data: parseArray2D(str) };
    case "list":    return { type, data: parseLinkedList(str) };
    case "stack":   return { type, data: parseStack(str) };
    case "queue":   return { type, data: parseQueue(str) };
    case "tree":    return { type, data: parseTree(str) };
    case "heap":    return { type, data: parseHeap(str) };
    case "graph":   return { type, data: parseGraph(str) };
    case "string":  return { type, data: parseString(str) };
    default: throw new Error(`Unknown structure type: ${type}`);
  }
}
