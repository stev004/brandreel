import { AbsoluteFill, Sequence } from "remotion";
import { Caption } from "./components/Caption";
import { Close } from "./components/Close";
import { msToFrames } from "./config";
import { closeDurationMs } from "./layout";
import { Moment } from "./templates/Moment";
import { Figure } from "./templates/Figure";
import { Question } from "./templates/Question";
import { Verdict } from "./templates/Verdict";
import type { BrandKit, Script, Words } from "./schema";

export type StackProps = {
  brand: BrandKit;
  script: Script;
  words?: Words;
};

export const Stack = ({ brand, script, words }: StackProps) => {
  let fromFrame = 0;

  const moments = script.beats.map((beat, index) => {
    const durationInFrames = msToFrames(beat.durationMs);
    const template =
      beat.kind === "moment" ? (
        <Moment brand={brand} beat={beat} />
      ) : beat.kind === "question" ? (
        <Question brand={brand} beat={beat} />
      ) : beat.kind === "figure" ? (
        <Figure brand={brand} beat={beat} />
      ) : (
        <Verdict brand={brand} beat={beat} />
      );
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
          <Caption brand={brand} text={script.caption} words={words} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
