import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a six-digit hex color");

const font = z.object({
  family: z.string(),
  italic: z.boolean().optional(),
});

export const BrandKit = z.object({
  name: z.string(),
  palette: z.object({
    bg: hex,
    fg: hex,
    muted: hex,
    accent: hex,
    extras: z.record(hex),
  }),
  fonts: z.object({
    display: font,
    body: font,
    mono: font,
  }),
  wordmark: z.object({
    text: z.string(),
    dotColor: hex,
  }),
  motion: z.object({
    bezier: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    entranceMs: z.number(),
    holdMsDefault: z.number(),
  }),
  voice: z.object({
    tone: z.array(z.string()),
    notes: z.string().optional(),
  }),
});

export type BrandKit = z.infer<typeof BrandKit>;

export const MomentBeat = z.object({
  kind: z.literal("moment"),
  eyebrow: z.string().optional(),
  line: z.string(),
  thoughts: z.array(z.string()).optional(),
  bg: hex.optional(),
  durationMs: z.number(),
});

export const Beat = z.discriminatedUnion("kind", [MomentBeat]);
export type Beat = z.infer<typeof Beat>;

export const Script = z.object({
  id: z.string(),
  brand: z.string(),
  beats: z.array(Beat),
  close: z.object({
    line: z.string(),
    showWordmark: z.boolean(),
  }),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

export type Script = z.infer<typeof Script>;

export const Words = z.object({
  words: z.array(
    z.object({
      text: z.string(),
      startMs: z.number(),
      endMs: z.number(),
    }),
  ),
});

export type Words = z.infer<typeof Words>;
