# 2026-09-25 - Regulate showreel (animatic rev1, rendered with sound)

Brief (Steven, 2026-09-24): "a dynamic 15-20 second motion graphics video that shows what an incredible motion designer you are for this brand. Like a showreel for a resume. Go all out. Entirely grounded in the brand."

Status: rendered, awaiting Steven's KEEP / TWEAK / KILL. Nothing posted. Posting stays human (SPEC ruling 6).

## Files

- `animatics/regulate-showreel.html` - the animatic. Its header carries the core mechanic, the laws in play, the scene table in ms and the full copy list. It is seekable (`window.__seek(ms)`), so it is also the render source.
- `animatics/regulate-showreel.sound.mjs` - synthesized sound design (no samples, no licences, deterministic). Cue times are the animatic's clock.
- `bin/animatic-render.mjs` - new: frame-exact capture of any seekable animatic to a 60fps MP4 (headless Chrome over DevTools, one seek per frame, piped to ffmpeg). `--stills a,b,c` writes PNGs at given times for review strips.
- `bin/lib/dsp.mjs` - new: small deterministic synthesis kit (seeded noise, biquads, Karplus-Strong pluck, Freeverb-style reverb, 24-bit WAV writer).
- Render: `workspace/regulate-showreel/final/regulate-showreel.mp4` (gitignored); copy in the hivemind at `marketing/assets/showreel-2026-09/`.

## Core mechanic

The response that never finished, finished: one white point carries the body's unfinished stress response through the tools in a single unbroken take, every scene a re-spacing of the last one's geometry, the event density falling from activated to regulated until the point comes to rest as the white full stop in "regulate."

## How it was made

1. Taste step: Brand Book (laws), BRAND.md (voice), motion-drafts.html and the 3:04 AM animatic (house grammar), the website's figures and headlines (stress cycle, window of tolerance, HRV coherence), and the app's instruments read from code on `regulate` main (Pressure Gauge, Pendulum, Regulate Breath, home rows).
2. Fable 5.1 taste consult on the concept (see the animatic header for adopted rulings): no cuts at all, the point is never recoloured or scaled, no timecode HUD, no citation beside an illustrative trace, and the close's point never moves.
3. Animatic authored as a pure function of time, verified by 10fps strips of the rendered MP4.

## Reproduce

```bash
node animatics/regulate-showreel.sound.mjs /tmp/raw.wav
# measure, then gain-stage to -14 LUFS and limit (true peak <= -1.5 dBTP)
ffmpeg -i /tmp/raw.wav -af "volume=<gain>dB,alimiter=limit=0.83:attack=2:release=60:level=disabled" -c:a pcm_s24le /tmp/master.wav
node bin/animatic-render.mjs animatics/regulate-showreel.html workspace/regulate-showreel/final/regulate-showreel.mp4 --audio /tmp/master.wav
```

## Verification (numbers from this run)

- ffprobe: h264 1080x1920, r_frame_rate 60/1, 1080 frames, duration 18.000000 s; AAC 48 kHz stereo 256k; 2.8 MB.
- Loudness (ffmpeg loudnorm, final MP4): integrated -13.9 LUFS, true peak -1.4 dBTP (lint window: -14 +/-1, TP <= -1.0).
- Safe zones by construction: kicker top at y=170 (> 150); tool labels top at 1540, 26px tall (< 1600); all text right edges <= 960; headlines max-width 864 from x=96.
- Longest static interval: the end-card hold, 15.65 s tagline entrance to 18.0 s (under the 3.0 s pacing limit).
- Motion reviewed as 10fps strips of the rendered MP4, six 3 s segments. Two defects found and fixed before the final render: the seeded noise hash overflowed doubles (every jitter and the dysregulated trace were constant), and the 2 s ease-in exhale stalled at the top of the column.
- Audio reviewed by spectrogram (it cannot be listened to in-session): heartbeat saturated for 150-250 Hz harmonics so it survives phone speakers; cues land on the picture's clock.

## Porting note

The Remotion engine has no beat kinds for a continuous-camera graph, gauge, pendulum or trace, so a 1:1 port would be a new engineering goal. The capture path renders the animatic itself frame-exactly at 60fps, so the MP4 here is already the animatic at full quality. Port only if Steven wants the reel parameterised in the engine.

## Batch 1 social reels (same day, Steven: "i quite like it tbf ... remake some of our existing marketing videos ... brand ready reels")

Showreel verdict recorded as KEEP ("i quite like it tbf. nice animation and noises").

- New shared kit: `animatics/lib/reel-kit.js` + `lib/reel.css` (motion, type, player, and the wordmark whose full stop is the white point), `bin/lib/sfx.mjs` (sound motifs; `fullStop()` is the sonic signature that ends every reel), `bin/render-reel.sh <id>` (score, master to -14 LUFS / TP <= -1.5, render, probe).
- `bin/animatic-render.mjs --virtual`: a clock injected before page scripts virtualizes performance.now, Date, rAF and timers, and drives every CSS animation/transition through currentTime. CSS-animated mocks now render frame-exact. `--css` and `--viewport WxH@S` isolate the phone film (`animatics/capture/phone-only.css`, 300x533.33@3.6 = the contract's x scale).
- Reels: 01 3:04 AM (the KEPT rev5d file untouched, 19.6s, new score `regulate-3am.sound.mjs`); 02 The Sigh (`regulate-sigh-reel.html`, 16.5s: concept 01 on the app's sigh instrument, orb removed, the fastest-claim cut); 03 11:47 AM (`regulate-1147-reel.html`, 15.5s: concept 04 on the app's Pressure Gauge, taps ratchet, pings shatter).
- Verified: all three h264 1080x1920 at 60/1 (1176 / 990 / 930 frames), integrated -13.6 / -13.7 / -13.7 LUFS, TP -1.4 / -1.4 / -1.5 dBTP; full-length 3fps strips reviewed; spectrograms checked (the room-tone bed was cut 10 dB after the first pass).
- Handoff with captions, first comments, alt text and claims preflight: hivemind `marketing/reels-2026-09/README.md`.
