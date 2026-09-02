import { AbsoluteFill, Sequence } from "remotion";
import { Caption } from "./components/Caption";
import { Close } from "./components/Close";
import { msToFrames } from "./config";
import { closeDurationMs } from "./layout";
import { Moment } from "./templates/Moment";
import type { BrandKit, Script } from "./schema";

export type StackProps = {
  brand: BrandKit;
  script: Script;
};

export const Stack = ({ brand, script }: StackProps) => {
  let fromFrame = 0;

  const moments = script.beats.map((beat, index) => {
    const durationInFrames = msToFrames(beat.durationMs);
    const sequence = (
      <Sequence
        key={`${beat.kind}-${index}`}
        from={fromFrame}
        durationInFrames={durationInFrames}
        name={`moment-${index}`}
      >
        <Moment brand={brand} beat={beat} />
      </Sequence>
    );
    fromFrame += durationInFrames;
    return sequence;
  });

  const closeFrames = msToFrames(closeDurationMs(brand));
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
          <Caption brand={brand} text={script.caption} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
