import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH, msToFrames } from "./config";
import { closeDurationMs } from "./layout";
import { BrandKit, Script, Words } from "./schema";
import { Stack, type StackProps } from "./Stack";
import { z } from "zod";

export const StackPropsSchema = z.object({
  brand: BrandKit,
  script: Script,
  words: Words.optional(),
});

const neutralBrand: StackProps["brand"] = {
  name: "neutral",
  palette: {
    bg: "#101010",
    fg: "#f4f4f4",
    muted: "#aaaaaa",
    accent: "#888888",
    extras: {},
  },
  fonts: {
    display: { family: "Playfair Display", italic: true },
    body: { family: "Inter" },
    mono: { family: "IBM Plex Mono" },
  },
  wordmark: { text: "neutral.", dotColor: "#f4f4f4" },
  motion: { bezier: [0.2, 0.7, 0.2, 1], entranceMs: 520, holdMsDefault: 1400 },
  voice: { tone: ["quiet"] },
};

const neutralScript: StackProps["script"] = {
  id: "neutral-preview",
  brand: "neutral",
  coreMechanic: "A quiet line gives the viewer room to breathe.",
  beats: [{ kind: "moment", line: "a quiet moment", durationMs: 1400 }],
  close: { line: "take your time.", showWordmark: true },
  caption: "",
  hashtags: [],
};

export const Root = () => (
  <Composition
    id="Stack"
    component={Stack}
    schema={StackPropsSchema}
    defaultProps={{ brand: neutralBrand, script: neutralScript }}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={
      msToFrames(neutralScript.beats[0].durationMs) +
      msToFrames(closeDurationMs(neutralBrand, neutralScript.close))
    }
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(
        1,
        props.script.beats.reduce((total, beat) => total + msToFrames(beat.durationMs), 0) +
          msToFrames(closeDurationMs(props.brand, props.script.close)),
      ),
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
    })}
  />
);
