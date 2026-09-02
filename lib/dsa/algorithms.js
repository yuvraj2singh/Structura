/**
 * DSA Algorithm Step Generators
 * Each function returns an array of "steps", where each step is:
 * { description: string, highlights: string[], comparisons: number }
 *
 * The highlights are element IDs (matched to what layoutDSA generates)
 * so the canvas can flash them.
 */

/** Binary Search dry-run on a sorted array */
export function binarySearchSteps(values, target) {
  const steps = [];
  let lo = 0, hi = values.length - 1;

  steps.push({
    description: `Binary Search for ${target}. Array: [${values.join(", ")}]`,
    highlights: [],
    comparisons: 0,
  });

  let comparisons = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    comparisons++;

    steps.push({
      description: `lo=${lo}, hi=${hi} → mid=${mid} → arr[mid]=${values[mid]}`,
      highlights: [`array-cell-lo-${lo}`, `array-cell-${mid}`, `array-cell-hi-${hi}`],
      activeIndex: mid,
      lo, hi, mid,
      comparisons,
    });

    if (values[mid] === target) {
      steps.push({
        description: `✓ Found ${target} at index ${mid}!`,
        highlights: [`array-cell-${mid}`],
        found: true, foundIndex: mid,
        comparisons,
      });
      return steps;
    } else if (values[mid] < target) {
      steps.push({ description: `arr[${mid}]=${values[mid]} < ${target} → search right half`, highlights: [], comparisons });
      lo = mid + 1;
    } else {
      steps.push({ description: `arr[${mid}]=${values[mid]} > ${target} → search left half`, highlights: [], comparisons });
      hi = mid - 1;
    }
  }

  steps.push({ description: `✗ ${target} not found in array.`, highlights: [], notFound: true, comparisons });
  return steps;
}

/** Bubble Sort dry-run */
export function bubbleSortSteps(values) {
  const arr = [...values];
  const steps = [];
  const n = arr.length;
  let comparisons = 0;

  steps.push({ description: `Bubble Sort: [${arr.join(", ")}]`, highlights: [], comparisons });

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++;
      steps.push({
        description: `Compare arr[${j}]=${arr[j]} and arr[${j + 1}]=${arr[j + 1]}`,
        highlights: [`cell-${j}`, `cell-${j + 1}`],
        comparisons,
      });

      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        steps.push({
          description: `Swap → [${arr.join(", ")}]`,
          highlights: [`cell-${j}`, `cell-${j + 1}`],
          swapped: true,
          array: [...arr],
          comparisons,
        });
      }
    }
    steps.push({
      description: `Pass ${i + 1} complete. arr[${n - 1 - i}]=${arr[n - 1 - i]} is sorted.`,
      highlights: [`cell-${n - 1 - i}`],
      sorted: [n - 1 - i],
      array: [...arr],
      comparisons,
    });
  }

  steps.push({
    description: `✓ Sorted: [${arr.join(", ")}]`,
    highlights: arr.map((_, i) => `cell-${i}`),
    done: true,
    array: [...arr],
    comparisons,
  });
  return steps;
}

/** Linear Search */
export function linearSearchSteps(values, target) {
  const steps = [];
  let comparisons = 0;

  steps.push({ description: `Linear Search for ${target}`, highlights: [], comparisons });

  for (let i = 0; i < values.length; i++) {
    comparisons++;
    steps.push({
      description: `Check arr[${i}]=${values[i]}`,
      highlights: [`cell-${i}`],
      activeIndex: i,
      comparisons,
    });
    if (values[i] === target) {
      steps.push({
        description: `✓ Found ${target} at index ${i}!`,
        highlights: [`cell-${i}`],
        found: true,
        foundIndex: i,
        comparisons,
      });
      return steps;
    }
  }

  steps.push({ description: `✗ ${target} not found.`, highlights: [], notFound: true, comparisons });
  return steps;
}

/** BST Insertion trace */
export function bstInsertSteps(existingNodes, newValue) {
  const steps = [];
  steps.push({ description: `Insert ${newValue} into BST`, highlights: [] });

  let path = [];
  // Simulate traversal using the sorted node values
  const sorted = [...existingNodes].sort((a, b) => a.value - b.value);
  let current = sorted.find((n) => n.depth === 0); // root

  if (!current) {
    steps.push({ description: `BST is empty. ${newValue} becomes root.`, highlights: [] });
    return steps;
  }

  while (current) {
    path.push(current.id);
    steps.push({
      description: `At node ${current.value}. ${newValue} ${newValue < current.value ? "<" : ">"} ${current.value} → go ${newValue < current.value ? "left" : "right"}`,
      highlights: [current.id],
    });
    const next = newValue < current.value
      ? sorted.find((n) => n.id === current.leftId)
      : sorted.find((n) => n.id === current.rightId);
    if (!next) {
      steps.push({ description: `Position found! Insert ${newValue} as ${newValue < current.value ? "left" : "right"} child of ${current.value}`, highlights: [current.id] });
      break;
    }
    current = next;
  }

  return steps;
}

/** BST Search trace */
export function bstSearchSteps(nodes, target) {
  const steps = [];
  steps.push({ description: `Search for ${target} in BST`, highlights: [] });

  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));
  let current = nodes.find((n) => n.depth === 0); // root

  while (current) {
    steps.push({
      description: `Visit node ${current.value}. ${target} ${target < current.value ? "<" : target > current.value ? ">" : "="} ${current.value}`,
      highlights: [current.id],
    });

    if (current.value === target) {
      steps.push({ description: `✓ Found ${target}!`, highlights: [current.id], found: true });
      return steps;
    }

    const nextId = target < current.value ? current.leftId : current.rightId;
    if (!nextId) {
      steps.push({ description: `✗ ${target} not found in BST.`, highlights: [], notFound: true });
      return steps;
    }
    current = nodeMap[nextId];
  }

  return steps;
}

/** Stack push/pop trace */
export function stackOpsSteps(values, operations) {
  // operations: [{op: "push"|"pop", value?}]
  const stack = [...values];
  const steps = [{ description: `Initial stack (top is last): [${stack.join(", ")}]`, highlights: [], stack: [...stack] }];

  for (const op of operations) {
    if (op.op === "push") {
      stack.push(op.value);
      steps.push({ description: `PUSH ${op.value} → stack: [${stack.join(", ")}]`, highlights: [`cell-${stack.length - 1}`], stack: [...stack] });
    } else if (op.op === "pop") {
      if (!stack.length) {
        steps.push({ description: `POP → Stack Underflow! Stack is empty.`, highlights: [], error: true, stack: [...stack] });
      } else {
        const popped = stack.pop();
        steps.push({ description: `POP ${popped} → stack: [${stack.join(", ")}]`, highlights: [], stack: [...stack] });
      }
    }
  }

  return steps;
}
