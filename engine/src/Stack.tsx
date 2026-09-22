import { AbsoluteFill, Sequence } from "remotion";
import { Caption } from "./components/Caption";
import { Close } from "./components/Close";
import { FPS, msToFrames } from "./config";
import { closeDurationMs } from "./layout";
import { Moment } from "./templates/Moment";
import { Figure } from "./templates/Figure";
import { Question } from "./templates/Question";
import { Verdict } from "./templates/Verdict";
import { Exhale } from "./templates/Exhale";
import { Broll } from "./templates/Broll";
import type { BrandKit, Script, Words } from "./schema";

export type StackProps = {
  brand: BrandKit;
  script: Script;
  words?: Words;
};

export const Stack = ({ brand, script, words }: StackProps) => {
  let fromFrame = 0;
  const brollIntervals: Array<{ fromMs: number; toMs: number }> = [];

  const moments = script.beats.map((beat, index) => {
    const durationInFrames = msToFrames(beat.durationMs);
    const beatStartMs = fromFrame * 1000 / FPS;
    if (beat.kind === "broll") {
      brollIntervals.push({
        fromMs: beatStartMs,
        toMs: (fromFrame + durationInFrames) * 1000 / FPS,
      });
    }
    const template = (() => {
      switch (beat.kind) {
        case "moment": return <Moment brand={brand} beat={beat} />;
        case "exhale": return <Exhale brand={brand} beat={beat} />;
        case "question": return <Question brand={brand} beat={beat} />;
        case "figure": return <Figure brand={brand} beat={beat} />;
        case "verdict": return <Verdict brand={brand} beat={beat} />;
        case "broll": return <Broll brand={brand} beat={beat} words={words} beatStartMs={beatStartMs} />;
        default: {
          const exhaustive: never = beat;
          return exhaustive;
        }
      }
    })();
    const sequence = (
      <Sequence
        key={`${beat.kind}-${index}`}
        from={fromFrame}
        durationInFrames={durationInFrames}
        name={`${beat.kind}-${index}`}
      >
        {template}
      </Sequence>
    );
    fromFrame += durationInFrames;
    return sequence;
  });

  const closeFrames = msToFrames(closeDurationMs(brand, script.close));
  const close = (
    <Sequence from={fromFrame} durationInFrames={closeFrames} name="close">
      <Close brand={brand} close={script.close} />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg }}>
      {moments}
      {close}
      {fromFrame > 0 ? (
        <Sequence from={0} durationInFrames={fromFrame} name="caption">
          <Caption
            brand={brand}
            text={script.caption}
            words={words}
            hiddenIntervals={brollIntervals}
          />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
