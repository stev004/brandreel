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

const StagePoint = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const MomentBeat = z.object({
  kind: z.literal("moment"),
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
export type MomentBeatData = z.infer<typeof MomentBeat>;
export type ExhaleBeatData = z.infer<typeof ExhaleBeat>;
export type FigureBeatData = z.infer<typeof FigureBeat>;
export type VerdictBeatData = z.infer<typeof VerdictBeat>;

export const Beat = z.discriminatedUnion("kind", [
  MomentBeat,
  ExhaleBeat,
  QuestionBeat,
  FigureBeat,
  VerdictBeat,
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
