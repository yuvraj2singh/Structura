export const APP_NAME = "Structura";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = "AI-powered collaborative visual workspace for developers";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  BOARD: "/board",
  SETTINGS: "/settings",
};

export const THEMES = {
  DARK: "dark",
  LIGHT: "light",
};

export const DEFAULT_BOARD_TITLE = "Untitled Board";

export const CANVAS_DEFAULTS = {
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 10,
  ZOOM_STEP: 0.1,
  GRID_SIZE: 24,
  SNAP_THRESHOLD: 8,
};

export const ELEMENT_TYPES = {
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  LINE: "line",
  ARROW: "arrow",
  TEXT: "text",
  FREEHAND: "freehand",
  IMAGE: "image",
  // DSA types
  ARRAY_CELL: "array-cell",
  LINKED_LIST_NODE: "linked-list-node",
  TREE_NODE: "tree-node",
  GRAPH_NODE: "graph-node",
  GRAPH_EDGE: "graph-edge",
  STACK_NODE: "stack-node",
  QUEUE_NODE: "queue-node",
  HEAP_NODE: "heap-node",
};

export const TOOL_TYPES = {
  SELECT: "select",
  PAN: "pan",
  PEN: "pen",
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  LINE: "line",
  ARROW: "arrow",
  TEXT: "text",
  IMAGE: "image",
  ERASER: "eraser",
};

export const DSA_TYPES = {
  ARRAY_1D: "1d-array",
  ARRAY_2D: "2d-array",
  LINKED_LIST: "linked-list",
  STACK: "stack",
  QUEUE: "queue",
  HEAP: "heap",
  TREE: "tree",
  BST: "bst",
  GRAPH: "graph",
  STRING: "string",
};

export const PERMISSIONS = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
};

export const SHARE_MODES = {
  PRIVATE: "private",
  LINK_VIEW: "link-view",
  LINK_EDIT: "link-edit",
};

export const AI_COMMANDS = {
  CREATE: "CREATE",
  INSERT: "INSERT",
  DELETE: "DELETE",
  MOVE: "MOVE",
  HIGHLIGHT: "HIGHLIGHT",
  CONNECT: "CONNECT",
  UPDATE: "UPDATE",
  EXPLAIN: "EXPLAIN",
  DRY_RUN: "DRY_RUN",
};

export const AUTOSAVE_DELAY = 2000; // 2 seconds of complete inactivity
export const CURSOR_THROTTLE = 50;  // ms

export const MAX_BOARD_SIZE_MB = 10;
export const MAX_UNDO_HISTORY = 100;
