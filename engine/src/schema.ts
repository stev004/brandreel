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
    logoSvg: z.string().optional(),
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

export const QuestionBeat = z.object({
  kind: z.literal("question"),
  kicker: z.string().optional(),
  lines: z.array(z.string()).min(1).max(3),
  dek: z.string().optional(),
  durationMs: z.number(),
});

export const FigureStamp = z.object({
  tone: z.union([z.literal("done"), z.literal("setback")]),
  text: z.string(),
  offsetMs: z.number(),
});

export const FigureBeat = z.object({
  kind: z.literal("figure"),
  label: z.string(),
  unitLabel: z.string().optional(),
  value: z.object({
    to: z.number(),
    decimals: z.number(),
  }),
  goalText: z.string().optional(),
  axis: z.object({
    min: z.number(),
    max: z.number(),
    achieved: z.number(),
    goal: z.number(),
  }),
  achievedTick: z.string().optional(),
  goalTick: z.string().optional(),
  minTick: z.string().optional(),
  stamps: z.array(FigureStamp),
  flash: z.object({ colorKey: z.string() }).optional(),
  durationMs: z.number(),
});

export const VerdictBeat = z.object({
  kind: z.literal("verdict"),
  lines: z.array(z.string()).min(1).max(3),
  durationMs: z.number(),
});

export type QuestionBeatData = z.infer<typeof QuestionBeat>;
export type FigureBeatData = z.infer<typeof FigureBeat>;
export type VerdictBeatData = z.infer<typeof VerdictBeat>;

export const Beat = z.discriminatedUnion("kind", [
  MomentBeat,
  QuestionBeat,
  FigureBeat,
  VerdictBeat,
]);
type BeatValue = z.infer<typeof Beat>;
type MomentCompatibleFields = {
  eyebrow?: string;
  line: string;
  thoughts?: string[];
  bg?: string;
};
export type Beat = BeatValue & MomentCompatibleFields;

export const Script = z.object({
  id: z.string(),
  brand: z.string(),
  coreMechanic: z.string().min(1),
  modules: z
    .object({
      vo: z.object({ voice: z.string() }).optional(),
      music: z.object({ file: z.string() }).optional(),
    })
    .optional(),
  beats: z.array(Beat),
  close: z.object({
    line: z.string(),
    showWordmark: z.boolean(),
    tagline: z.string().optional(),
    url: z.string().optional(),
    durationMs: z.number().optional(),
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
