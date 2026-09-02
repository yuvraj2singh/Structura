import { z } from "zod";

export const createBoardSchema = z.object({
  title:     z.string().min(1).max(120).default("Untitled Board"),
  shareMode: z.enum(["private", "link-view", "link-edit"]).default("private"),
});

export const updateBoardSchema = z.object({
  title:    z.string().min(1).max(120).optional(),
  elements: z.array(z.any()).optional(),
  shareMode: z.enum(["private", "link", "link-view", "link-edit"]).optional(),
  updatedAt: z.string().optional(),
}).partial();

export const elementSchema = z.object({
  id:       z.string(),
  type:     z.string(),
  x:        z.number(),
  y:        z.number(),
  width:    z.number().optional(),
  height:   z.number().optional(),
  rotation: z.number().optional(),
  style:    z.record(z.any()).optional(),
  data:     z.record(z.any()).optional(),
});
