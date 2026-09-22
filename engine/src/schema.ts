import { z } from "zod/v3";

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

const StagePoint = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const VisualDirective = z.string().superRefine((directive, context) => {
  const match = /^(template|stock|gen):([^\r\n]+)$/.exec(directive);
  if (!match || !match[2]?.trim() || match[2] !== match[2].trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "visual must be template:<name>, stock:<query>, or gen:<prompt> with a non-empty payload.",
    });
  }
});

// Clip paths are relative to the workspace root and use portable POSIX separators.
const WorkspaceClipPath = z.string().min(1).refine((path) => {
  if (path.includes("\\") || /^[A-Za-z]:/.test(path) || path.startsWith("/")) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}, "clip must be a workspace-relative path without traversal segments.");

export const MomentBeat = z.object({
  kind: z.literal("moment"),
  visual: VisualDirective.optional(),
  eyebrow: z.string().optional(),
  line: z.string(),
  thoughts: z.array(z.string()).optional(),
  // Presence opts into the fixed placed-narrative layout. Omission preserves
  // the existing stacked Moment layout and its brand-derived timing.
  thoughtPositions: z.array(StagePoint).max(5).optional(),
  bg: hex.optional(),
  durationMs: z.number(),
});

export const ExhaleBeat = z.object({
  kind: z.literal("exhale"),
  visual: VisualDirective.optional(),
  thoughts: z.array(z.string()).max(5),
  thoughtPositions: z.array(StagePoint).max(5),
  inLabel: z.string().min(1),
  outLabel: z.string().min(1),
  phaseLabel: z.string().min(1),
  countdown: z.array(z.string()).length(8),
  colorKey: z.string().min(1),
  bg: hex.optional(),
  durationMs: z.number(),
});

export const QuestionBeat = z.object({
  kind: z.literal("question"),
  visual: VisualDirective.optional(),
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
  visual: VisualDirective.optional(),
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
  visual: VisualDirective.optional(),
  lines: z.array(z.string()).min(1).max(3),
  durationMs: z.number(),
});

export const BrollBeat = z.object({
  kind: z.literal("broll"),
  visual: VisualDirective.optional(),
  // Omitted only while a stock/gen directive is awaiting stage-4 resolution.
  clip: WorkspaceClipPath.optional(),
  overlayText: z.string().optional(),
  // "words" reads timed words from workspace words.json; captions are never copied into the script.
  captionSource: z.enum(["words", "none"]),
  durationMs: z.number(),
});

export type QuestionBeatData = z.infer<typeof QuestionBeat>;
export type MomentBeatData = z.infer<typeof MomentBeat>;
export type ExhaleBeatData = z.infer<typeof ExhaleBeat>;
export type FigureBeatData = z.infer<typeof FigureBeat>;
export type VerdictBeatData = z.infer<typeof VerdictBeat>;
export type BrollBeatData = z.infer<typeof BrollBeat>;

export const Beat = z.discriminatedUnion("kind", [
  MomentBeat,
  ExhaleBeat,
  QuestionBeat,
  FigureBeat,
  VerdictBeat,
  BrollBeat,
]);
type BeatValue = z.infer<typeof Beat>;
type MomentCompatibleFields = {
  eyebrow?: string;
  line: string;
  thoughts?: string[];
  thoughtPositions?: { x: number; y: number }[];
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
}).superRefine((script, context) => {
  script.beats.forEach((beat, beatIndex) => {
    if (beat.kind === "broll" && !beat.clip && !/^((stock|gen):)/.test(beat.visual ?? "")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Broll beats need a clip path unless a stock: or gen: visual is pending asset resolution.",
        path: ["beats", beatIndex, "clip"],
      });
    }

    if (beat.kind === "moment" && beat.thoughtPositions &&
      beat.thoughtPositions.length !== (beat.thoughts ?? []).filter((thought) => thought.trim()).length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "thoughtPositions must align with the non-empty thoughts array.",
        path: ["beats", beatIndex, "thoughtPositions"],
      });
    }

    if (beat.kind === "exhale") {
      if (beat.thoughts.length !== beat.thoughtPositions.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "thoughtPositions must align with the thoughts array.",
          path: ["beats", beatIndex, "thoughtPositions"],
        });
      }
      if (beat.thoughts.some((thought) => !thought.trim())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exhale thoughts must be non-empty strings.",
          path: ["beats", beatIndex, "thoughts"],
        });
      }
      if (beat.countdown.some((value) => !value.trim())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exhale countdown values must be non-empty strings.",
          path: ["beats", beatIndex, "countdown"],
        });
      }
      if (![beat.inLabel, beat.outLabel, beat.phaseLabel, beat.colorKey].every((value) => value.trim())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exhale labels and colorKey must be non-empty strings.",
          path: ["beats", beatIndex],
        });
      }
    }
  });
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
