"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import useCanvasStore from "@/store/useCanvasStore";
import useThemeStore from "@/store/useThemeStore";
import { renderCanvas } from "@/lib/canvas/renderer";

import {
  createRectangle,
  createCircle,
  createLine,
  createArrow,
  createText,
  createFreehand,
  hitTest,
  applyResize,
  getResizeHandles,
} from "@/lib/canvas/elements";

import { ELEMENT_TYPES } from "@/lib/constants";
import { throttle } from "@/lib/utils";

const HANDLE_RADIUS = 8;
const MIN_DRAG_DIST = 4;

export default function Canvas({
  onCursorMove,
  onElementAdded,
  onElementsUpdated,
  onElementsDeleted,
  className = "",
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({});

  const imageInputRef = useRef(null);
  const pendingImagePt = useRef(null);

  const onElementAddedRef = useRef(onElementAdded);
  const onElementsUpdatedRef = useRef(onElementsUpdated);
  const onElementsDeletedRef = useRef(onElementsDeleted);

  useEffect(() => {
    onElementAddedRef.current = onElementAdded;
  }, [onElementAdded]);

  useEffect(() => {
    onElementsUpdatedRef.current = onElementsUpdated;
  }, [onElementsUpdated]);

  useEffect(() => {
    onElementsDeletedRef.current = onElementsDeleted;
  }, [onElementsDeleted]);

  const { theme } = useThemeStore();
  const store = useCanvasStore();

  /* =====================================================
     RESIZE CANVAS
  ===================================================== */

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;

      if (!parent) return;

      const rect = parent.getBoundingClientRect();

      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const observer = new ResizeObserver(resize);

    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    resize();

    return () => observer.disconnect();
  }, []);

  /* =====================================================
     RENDER LOOP
  ===================================================== */

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const loop = () => {
      const {
        elements,
        selectedIds,
        pan,
        zoom,
      } = useCanvasStore.getState();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      renderCanvas(
        ctx,
        elements,
        selectedIds,
        pan,
        zoom,
        {
          showGrid: true,
          theme: useThemeStore.getState().theme,
        }
      );

      /* -----------------------------------------------
         Draw current preview
      ------------------------------------------------ */

      const s = stateRef.current;

      if (s.isDrawing && s.previewEl) {
        ctx.save();

        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        renderPreview(
          ctx,
          s.previewEl,
          useThemeStore.getState().theme
        );

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [theme]);



  /* =====================================================
     IMAGE INPUT
  ===================================================== */

  useEffect(() => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.id = "canvas-image-input";

    const handleChange = (e) => {
      const file = e.target.files?.[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        const src = event.target.result;

        const pt =
          pendingImagePt.current || {
            x: 100,
            y: 100,
          };

        const img = new window.Image();

        img.onload = () => {
          const maxW = 400;
          const maxH = 300;

          let w = img.naturalWidth;
          let h = img.naturalHeight;

          if (w > maxW) {
            h = (h * maxW) / w;
            w = maxW;
          }

          if (h > maxH) {
            w = (w * maxH) / h;
            h = maxH;
          }

          const el = {
            id: `img-${Date.now()}`,

            type:
              ELEMENT_TYPES.IMAGE ??
              "image",

            x: pt.x - w / 2,
            y: pt.y - h / 2,

            width: w,
            height: h,

            position: "absolute",

            visible: true,

            opacity: 1,

            locked: false,

            zIndex: 100,

            rotation: 0,

            data: {
              src,
            },

            style: {
              stroke: "transparent",
              strokeWidth: 0,
              fill: "transparent",
            },
          };

          useCanvasStore
            .getState()
            .addElement(el);

          useCanvasStore
            .getState()
            .setSelected([el.id]);

          onElementAddedRef.current?.(el);
        };

        img.src = src;
      };

      reader.readAsDataURL(file);

      input.value = "";
    };

    input.addEventListener(
      "change",
      handleChange
    );

    document.body.appendChild(input);

    imageInputRef.current = input;

    return () => {
      input.removeEventListener(
        "change",
        handleChange
      );

      input.remove();
    };
  }, []);

  /* =====================================================
     WHEEL / ZOOM
  ===================================================== */

  const handleWheel = useCallback((e) => {
    e.preventDefault();

    const {
      pan,
      zoom,
      setPan,
      setZoom,
    } = useCanvasStore.getState();

    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect =
      canvas.getBoundingClientRect();

    const mx =
      e.clientX - rect.left;

    const my =
      e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      const factor =
        e.deltaY > 0 ? 0.92 : 1.08;

      const newZoom = Math.max(
        0.05,
        Math.min(10, zoom * factor)
      );

      setPan({
        x:
          mx -
          (mx - pan.x) *
            (newZoom / zoom),

        y:
          my -
          (my - pan.y) *
            (newZoom / zoom),
      });

      setZoom(newZoom);
    } else {
      setPan({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    canvas.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      }
    );

    return () => {
      canvas.removeEventListener(
        "wheel",
        handleWheel
      );
    };
  }, [handleWheel]);

  /* =====================================================
     CANVAS POINT
  ===================================================== */

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;

    const rect =
      canvas.getBoundingClientRect();

    const {
      pan,
      zoom,
    } = useCanvasStore.getState();

    const sx =
      e.clientX - rect.left;

    const sy =
      e.clientY - rect.top;

    return {
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom,
      sx,
      sy,
    };
  };

  /* =====================================================
     RESIZE HANDLE HIT TEST
  ===================================================== */

  const hitHandle = (el, pt) => {
    const {
      pan,
      zoom,
    } = useCanvasStore.getState();

    const handles =
      getResizeHandles(el);

    for (const h of handles) {
      const hsx =
        h.x * zoom + pan.x;

      const hsy =
        h.y * zoom + pan.y;

      if (
        Math.hypot(
          hsx - pt.sx,
          hsy - pt.sy
        ) < HANDLE_RADIUS
      ) {
        return h.id;
      }
    }

    return null;
  };

  /* =====================================================
     DOUBLE CLICK
  ===================================================== */

  const onDblClick = useCallback((e) => {
    const pt = getCanvasPoint(e);

    const {
      elements,
      activeTool,
    } = useCanvasStore.getState();

    const reversed =
      [...elements].reverse();

    const hit = reversed.find((el) =>
      hitTest(el, pt.x, pt.y)
    );

    if (
      hit &&
      hit.type === ELEMENT_TYPES.TEXT
    ) {
      spawnTextEditor(hit, pt);

      return;
    }

    if (activeTool === "text") {
      const newEl = createText(
        pt.x,
        pt.y,
        "",
        useCanvasStore
          .getState()
          .activeStyle
      );

      useCanvasStore
        .getState()
        .addElement(newEl);

      useCanvasStore
        .getState()
        .setSelected([newEl.id]);

      onElementAddedRef.current?.(
        newEl
      );

      spawnTextEditor(
        newEl,
        pt
      );
    }
  }, []);

  /* =====================================================
     TEXT EDITOR
  ===================================================== */

  const spawnTextEditor = (
    el,
    pt
  ) => {
    const canvas =
      canvasRef.current;

    const {
      pan,
      zoom,
    } =
      useCanvasStore.getState();

    const rect =
      canvas.getBoundingClientRect();

    const sx =
      el.x * zoom +
      pan.x +
      rect.left;

    const sy =
      el.y * zoom +
      pan.y +
      rect.top;

    const existing =
      document.getElementById(
        "canvas-text-editor"
      );

    if (existing) {
      existing.remove();
    }

    const ta =
      document.createElement(
        "textarea"
      );

    ta.id =
      "canvas-text-editor";

    ta.value =
      el.data?.text ??
      el.label ??
      "";

    const isDark =
      theme === "dark";

    ta.style.cssText = `
      position: fixed;
      left: ${sx}px;
      top: ${sy}px;

      min-width: ${Math.max(
        140,
        (el.width || 0) * zoom
      )}px;

      min-height: ${Math.max(
        40,
        (el.height || 0) * zoom
      )}px;

      font-size: ${Math.max(
        12,
        (el.style?.fontSize ?? 18) *
          zoom
      )}px;

      font-family:
        var(--font-sans, sans-serif);

      color: ${
        isDark
          ? "#fafafa"
          : "#0f0f10"
      };

      background: ${
        isDark
          ? "#1c1c1f"
          : "#ffffff"
      };

      border:
        2px solid
        var(--accent, #6366f1);

      border-radius: 6px;

      padding: 6px 10px;

      resize: both;

      outline: none;

      z-index: 9999;

      line-height: 1.4;

      box-shadow:
        0 4px 20px
        rgba(0,0,0,0.25);
    `;

    const commit = () => {
      const text =
        ta.value.trim();

      useCanvasStore
        .getState()
        .updateElement(
          el.id,
          {
            data: {
              ...el.data,
              text,
            },
            label: text,
          }
        );

      onElementsUpdatedRef.current?.([
        {
          ...el,
          data: {
            ...el.data,
            text,
          },
          label: text,
        },
      ]);

      ta.remove();
    };

    ta.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key === "Escape") {
          ta.remove();
        }

        if (
          ev.key === "Enter" &&
          !ev.shiftKey
        ) {
          ev.preventDefault();

          commit();
        }
      }
    );

    ta.addEventListener(
      "blur",
      commit
    );

    document.body.appendChild(
      ta
    );

    ta.focus();

    ta.select();
  };

  /* =====================================================
     POINTER DOWN
  ===================================================== */

  const onPointerDown =
    useCallback((e) => {
      const canvas =
        canvasRef.current;

      canvas.setPointerCapture(
        e.pointerId
      );

      const pt =
        getCanvasPoint(e);

      const {
        activeTool,
        elements,
        selectedIds,
        pan,
      } =
        useCanvasStore.getState();

      const s =
        stateRef.current;

      s.startPt = pt;
      s.lastPt = pt;
      s.moved = false;
      s.previewEl = null;

      /* IMAGE */

      if (activeTool === "image") {
        pendingImagePt.current =
          pt;

        imageInputRef.current?.click();

        return;
      }

      /* PAN */

      if (
        activeTool === "hand" ||
        e.button === 1 ||
        s.spaceDown
      ) {
        s.mode = "pan";

        s.panStart = {
          x: pan.x,
          y: pan.y,
        };

        s.lastScreenPt = {
          x: pt.sx,
          y: pt.sy,
        };

        return;
      }

      /* SELECT */

      if (
        activeTool === "select"
      ) {
        if (
          selectedIds.length === 1
        ) {
          const selEl =
            elements.find(
              (el) =>
                el.id ===
                selectedIds[0]
            );

          if (selEl) {
            const hid =
              hitHandle(
                selEl,
                pt
              );

            if (hid) {
              s.mode =
                "resize";

              s.resizeHandle =
                hid;

              s.resizeEl = {
                ...selEl,
              };

              return;
            }
          }
        }

        const reversed =
          [...elements].reverse();

        const hit =
          reversed.find(
            (el) =>
              hitTest(
                el,
                pt.x,
                pt.y
              )
          );

        if (hit) {
          const groupIds =
            hit.groupId
              ? elements
                  .filter(
                    (el) =>
                      el.groupId ===
                      hit.groupId
                  )
                  .map(
                    (el) => el.id
                  )
              : [hit.id];

          if (e.shiftKey) {
            groupIds.forEach(
              (id) =>
                useCanvasStore
                  .getState()
                  .addSelected(id)
            );
          } else {
            const alreadySelected =
              groupIds.every(
                (id) =>
                  selectedIds.includes(
                    id
                  )
              );

            if (
              !alreadySelected
            ) {
              useCanvasStore
                .getState()
                .setSelected(
                  groupIds
                );
            }
          }

          s.mode = "move";

          s.moveStart = {
            x: pt.x,
            y: pt.y,
          };

          s.moveEls =
            elements
              .filter((el) =>
                useCanvasStore
                  .getState()
                  .selectedIds.includes(
                    el.id
                  )
              )
              .map((el) => ({
                id: el.id,
                x: el.x,
                y: el.y,
                points:
                  el.data?.points
                    ? el.data.points.map(
                        (p) => ({
                          x: p.x,
                          y: p.y,
                        })
                      )
                    : null,
              }));

          return;
        }

        s.mode =
          "box-select";

        s.boxStart = {
          x: pt.x,
          y: pt.y,
        };

        useCanvasStore
          .getState()
          .clearSelected();

        return;
      }

      /* TEXT */

      if (
        activeTool === "text"
      ) {
        const newEl =
          createText(
            pt.x,
            pt.y,
            "",
            useCanvasStore
              .getState()
              .activeStyle
          );

        useCanvasStore
          .getState()
          .addElement(
            newEl
          );

        useCanvasStore
          .getState()
          .setSelected([
            newEl.id,
          ]);

        onElementAddedRef.current?.(
          newEl
        );

        spawnTextEditor(
          newEl,
          pt
        );

        return;
      }

      /* DRAW */

      s.mode = "draw";

      s.drawPoints = [
        {
          x: pt.x,
          y: pt.y,
        },
      ];

      s.isDrawing = true;
    }, []);

  /* =====================================================
     POINTER MOVE
  ===================================================== */

  const onPointerMove =
    useCallback(
      throttle((e) => {
        const pt =
          getCanvasPoint(e);

        const s =
          stateRef.current;

        const {
          activeTool,
        } =
          useCanvasStore.getState();

        if (!s.mode) {
          onCursorMove?.(
            pt.x,
            pt.y
          );

          return;
        }

        s.moved = true;

        const dx =
          pt.x -
          s.lastPt.x;

        const dy =
          pt.y -
          s.lastPt.y;

        s.lastPt = pt;

        /* PAN */

        if (
          s.mode === "pan"
        ) {
          const {
            pan,
            setPan,
          } =
            useCanvasStore.getState();

          const dsx =
            pt.sx -
            (s.lastScreenPt
              ?.x ?? pt.sx);

          const dsy =
            pt.sy -
            (s.lastScreenPt
              ?.y ?? pt.sy);

          s.lastScreenPt = {
            x: pt.sx,
            y: pt.sy,
          };

          setPan({
            x: pan.x + dsx,
            y: pan.y + dsy,
          });

          return;
        }

        /* MOVE */

        if (
          s.mode === "move"
        ) {
          const mdx =
            pt.x -
            s.moveStart.x;

          const mdy =
            pt.y -
            s.moveStart.y;

          const updates =
            s.moveEls.map(
              (mel) => {
                const u = {
                  id: mel.id,
                  x:
                    mel.x +
                    mdx,
                  y:
                    mel.y +
                    mdy,
                };

                if (mel.points) {
                  u.data = {
                    points:
                      mel.points.map(
                        (p) => ({
                          x:
                            p.x +
                            mdx,
                          y:
                            p.y +
                            mdy,
                        })
                      ),
                  };
                }

                return u;
              }
            );

          useCanvasStore
            .getState()
            .updateElements(
              updates
            );

          return;
        }

        /* RESIZE */

        if (
          s.mode === "resize"
        ) {
          const updated =
            applyResize(
              s.resizeEl,
              s.resizeHandle,
              dx,
              dy
            );

          useCanvasStore
            .getState()
            .updateElement(
              s.resizeEl.id,
              updated
            );

          s.resizeEl = {
            ...s.resizeEl,
            ...updated,
          };

          return;
        }

        /* DRAW PREVIEW */

        if (
          s.mode === "draw"
        ) {
          const {
            x: sx,
            y: sy,
          } = s.startPt;

          const {
            x: ex,
            y: ey,
          } = pt;

          const activeStyle =
            useCanvasStore
              .getState()
              .activeStyle;

          if (
            activeTool ===
              "pen" ||
            activeTool ===
              "eraser"
          ) {
            s.drawPoints.push({
              x: pt.x,
              y: pt.y,
            });

            s.previewEl = {
              type:
                ELEMENT_TYPES.FREEHAND,

              data: {
                points: [
                  ...s.drawPoints,
                ],
              },

              style: {
                stroke:
                  activeTool ===
                  "eraser"
                    ? "#0e0e11"
                    : activeStyle.stroke,

                strokeWidth: 2,
              },
            };
          }

          else if (
            activeTool ===
            "rectangle"
          ) {
            s.previewEl = {
              type:
                ELEMENT_TYPES.RECTANGLE,

              x: Math.min(
                sx,
                ex
              ),

              y: Math.min(
                sy,
                ey
              ),

              width:
                Math.abs(
                  ex - sx
                ),

              height:
                Math.abs(
                  ey - sy
                ),

              style:
                activeStyle,
            };
          }

          else if (
            activeTool ===
            "circle"
          ) {
            s.previewEl = {
              type:
                ELEMENT_TYPES.CIRCLE,

              x: Math.min(
                sx,
                ex
              ),

              y: Math.min(
                sy,
                ey
              ),

              width:
                Math.abs(
                  ex - sx
                ),

              height:
                Math.abs(
                  ey - sy
                ),

              style:
                activeStyle,
            };
          }

          else if (
            activeTool ===
            "line"
          ) {
            s.previewEl = {
              type:
                ELEMENT_TYPES.LINE,

              x: sx,
              y: sy,

              width: 0,
              height: 0,

              data: {
                x2: ex,
                y2: ey,
              },

              style:
                activeStyle,
            };
          }

          else if (
            activeTool ===
            "arrow"
          ) {
            s.previewEl = {
              type:
                ELEMENT_TYPES.ARROW,

              x: sx,
              y: sy,

              width: 0,
              height: 0,

              data: {
                x2: ex,
                y2: ey,
              },

              style:
                activeStyle,
            };
          }
        }
      }, 16),
      [onCursorMove]
    );

  /* =====================================================
     POINTER UP
  ===================================================== */

  const onPointerUp =
    useCallback((e) => {
      const pt =
        getCanvasPoint(e);

      const s =
        stateRef.current;

      const {
        activeTool,
        activeStyle,
      } =
        useCanvasStore.getState();

      /* DRAW */

      if (
        s.mode === "draw" &&
        s.moved
      ) {
        const {
          x: sx,
          y: sy,
        } = s.startPt;

        const {
          x: ex,
          y: ey,
        } = pt;

        let el = null;

        if (
          Math.hypot(
            ex - sx,
            ey - sy
          ) >=
          MIN_DRAG_DIST
        ) {
          switch (
            activeTool
          ) {
            case "rectangle":
              el =
                createRectangle(
                  Math.min(
                    sx,
                    ex
                  ),
                  Math.min(
                    sy,
                    ey
                  ),
                  Math.abs(
                    ex - sx
                  ),
                  Math.abs(
                    ey - sy
                  ),
                  activeStyle
                );
              break;

            case "circle":
              el =
                createCircle(
                  Math.min(
                    sx,
                    ex
                  ) +
                    Math.abs(
                      ex - sx
                    ) /
                      2,

                  Math.min(
                    sy,
                    ey
                  ) +
                    Math.abs(
                      ey - sy
                    ) /
                      2,

                  Math.abs(
                    ex - sx
                  ) /
                    2,

                  activeStyle
                );
              break;

            case "line":
              el =
                createLine(
                  sx,
                  sy,
                  ex,
                  ey,
                  activeStyle
                );
              break;

            case "arrow":
              el =
                createArrow(
                  sx,
                  sy,
                  ex,
                  ey,
                  activeStyle
                );
              break;

            case "pen":
              el =
                createFreehand(
                  s.drawPoints,
                  activeStyle
                );
              break;

            case "eraser": {
              const pts =
                s.drawPoints;

              const toDelete =
                useCanvasStore
                  .getState()
                  .elements
                  .filter(
                    (elem) =>
                      pts.some(
                        (p) =>
                          hitTest(
                            elem,
                            p.x,
                            p.y
                          )
                      )
                  )
                  .map(
                    (elem) =>
                      elem.id
                  );

              if (
                toDelete.length
              ) {
                useCanvasStore
                  .getState()
                  .deleteElements(
                    toDelete
                  );

                onElementsDeletedRef.current?.(
                  toDelete
                );
              }

              break;
            }
          }
        }

        if (el) {
          useCanvasStore
            .getState()
            .addElement(el);

          useCanvasStore
            .getState()
            .setSelected([
              el.id,
            ]);

          onElementAddedRef.current?.(
            el
          );
        }
      }

      /* MOVE */

      if (
        s.mode === "move"
      ) {
        useCanvasStore
          .getState()
          ._pushHistory();

        const movedEls =
          useCanvasStore
            .getState()
            .elements
            .filter((el) =>
              s.moveEls?.some(
                (m) =>
                  m.id ===
                  el.id
              )
            );

        if (
          movedEls.length
        ) {
          onElementsUpdatedRef.current?.(
            movedEls
          );
        }
      }

      /* RESIZE */

      if (
        s.mode === "resize"
      ) {
        const resized =
          useCanvasStore
            .getState()
            .elements.find(
              (el) =>
                el.id ===
                s.resizeEl?.id
            );

        if (resized) {
          onElementsUpdatedRef.current?.([
            resized,
          ]);
        }
      }

      s.mode = null;
      s.isDrawing = false;
      s.previewEl = null;
      s.drawPoints = [];
    }, []);

  /* =====================================================
     SPACE = TEMPORARY PAN
  ===================================================== */

  useEffect(() => {
    const dn = (e) => {
      if (
        e.code === "Space" &&
        e.target.tagName !==
          "INPUT" &&
        e.target.tagName !==
          "TEXTAREA" &&
        !e.target.isContentEditable
      ) {
        e.preventDefault();

        stateRef.current.spaceDown =
          true;
      }
    };

    const up = (e) => {
      if (
        e.code === "Space"
      ) {
        stateRef.current.spaceDown =
          false;
      }
    };

    window.addEventListener(
      "keydown",
      dn
    );

    window.addEventListener(
      "keyup",
      up
    );

    return () => {
      window.removeEventListener(
        "keydown",
        dn
      );

      window.removeEventListener(
        "keyup",
        up
      );
    };
  }, []);

  /* =====================================================
     CURSOR
  ===================================================== */

  const getCursor = () => {
    const {
      activeTool,
    } =
      useCanvasStore.getState();

    if (
      stateRef.current.spaceDown
    ) {
      return "grab";
    }

    const cursors = {
      select: "default",
      hand: "grab",
      pen: "crosshair",
      eraser: "cell",
      text: "text",
      rectangle: "crosshair",
      circle: "crosshair",
      line: "crosshair",
      arrow: "crosshair",
      image: "copy",
    };

    return (
      cursors[activeTool] ||
      "default"
    );
  };

  const [cursor, setCursor] =
    useState("default");

  useEffect(() => {
    const update = () => {
      setCursor(
        getCursor()
      );
    };

    const unsub =
      useCanvasStore.subscribe(
        update
      );

    return unsub;
  }, []);

  /* =====================================================
     CANVAS
  ===================================================== */

  return (
    <canvas
      ref={canvasRef}
      id="main-canvas"
      aria-label="Structura canvas"

      onPointerDown={
        onPointerDown
      }

      onPointerMove={
        onPointerMove
      }

      onPointerUp={
        onPointerUp
      }

      onDoubleClick={
        onDblClick
      }

      style={{
        display: "block",
        width: "100%",
        height: "100%",
        cursor,
        touchAction: "none",
      }}

      className={className}
    />
  );
}

/* =====================================================
   PREVIEW RENDERER
===================================================== */

function renderPreview(
  ctx,
  el,
  theme
) {
  if (!el) return;

  ctx.save();

  ctx.globalAlpha = 0.7;

  const style =
    el.style ?? {};

  ctx.strokeStyle =
    style.stroke ??
    "#6366f1";

  ctx.lineWidth =
    style.strokeWidth ?? 2;

  ctx.fillStyle =
    style.fill ??
    "transparent";

  ctx.setLineDash([
    4,
    3,
  ]);

  switch (el.type) {
    case ELEMENT_TYPES.RECTANGLE: {
      ctx.beginPath();

      if (
        ctx.roundRect
      ) {
        ctx.roundRect(
          el.x,
          el.y,
          el.width,
          el.height,
          6
        );
      } else {
        ctx.rect(
          el.x,
          el.y,
          el.width,
          el.height
        );
      }

      if (
        style.fill &&
        style.fill !==
          "transparent"
      ) {
        ctx.fill();
      }

      ctx.stroke();

      break;
    }

    case ELEMENT_TYPES.CIRCLE: {
      const cx =
        el.x +
        el.width / 2;

      const cy =
        el.y +
        el.height / 2;

      ctx.beginPath();

      ctx.ellipse(
        cx,
        cy,
        el.width / 2,
        el.height / 2,
        0,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      break;
    }

    case ELEMENT_TYPES.LINE:
    case ELEMENT_TYPES.ARROW: {
      const x2 =
        el.data?.x2 ??
        el.x + el.width;

      const y2 =
        el.data?.y2 ??
        el.y + el.height;

      ctx.beginPath();

      ctx.moveTo(
        el.x,
        el.y
      );

      ctx.lineTo(
        x2,
        y2
      );

      ctx.stroke();

      break;
    }

    case ELEMENT_TYPES.FREEHAND: {
      const pts =
        el.data?.points ??
        [];

      if (
        pts.length < 2
      ) {
        break;
      }

      ctx.beginPath();

      ctx.setLineDash([]);

      ctx.moveTo(
        pts[0].x,
        pts[0].y
      );

      for (
        let i = 1;
        i < pts.length;
        i++
      ) {
        const mp = {
          x:
            (pts[i - 1].x +
              pts[i].x) /
            2,

          y:
            (pts[i - 1].y +
              pts[i].y) /
            2,
        };

        ctx.quadraticCurveTo(
          pts[i - 1].x,
          pts[i - 1].y,
          mp.x,
          mp.y
        );
      }

      ctx.stroke();

      break;
    }
  }

  ctx.setLineDash([]);

  ctx.globalAlpha = 1;

  ctx.restore();
}