/** The clock's job is the loop boundary: a recording must end exactly where
 * the animation ends, whatever size the tick that got there. */

import { describe, expect, it } from "vitest";
import type { CaptureSurface, RecorderState } from "./recording";
import { createClock } from "./timelapse";

const SURFACE: CaptureSurface = { canvases: () => [] };

/** Stand-in for the MediaRecorder flow — the second adapter behind the seam. */
function fakeRecorder(returns: "recording" | null = "recording") {
  const states: RecorderState[] = [];
  let stopped = false;
  const start = (_s: CaptureSurface, onState: (s: RecorderState) => void) => {
    if (returns === null) return null;
    onState("recording");
    states.push("recording");
    return {
      stop: () => {
        stopped = true;
        onState("idle");
        states.push("idle");
      },
    };
  };
  return { start, states, wasStopped: () => stopped };
}

function clockAt(duration: number, tailPadding: number, speed = 1) {
  const recorder = fakeRecorder();
  const clock = createClock({ duration, tailPadding }, () => {}, recorder.start);
  clock.setSpeed(speed);
  return { clock, recorder };
}

describe("recording stops at the loop boundary", () => {
  it("runs to the end, then stops — not a tick early or late", () => {
    const { clock, recorder } = clockAt(10, 60);
    clock.record(SURFACE);

    for (let i = 0; i < 9; i++) clock.tick(1);
    expect(clock.state.time).toBe(9);
    expect(recorder.wasStopped()).toBe(false);

    clock.tick(1);
    expect(recorder.wasStopped()).toBe(true);
    expect(clock.state.time).toBe(10);
    expect(clock.state.playing).toBe(false);
  });

  it("pins to the boundary when one tick jumps clean past it", () => {
    // a slow frame at high speed: 60 run-seconds in one tick over a 10s loop
    const { clock, recorder } = clockAt(10, 60, 60);
    clock.record(SURFACE);

    clock.tick(1);
    expect(recorder.wasStopped()).toBe(true);
    // the wrapped time would have been 60 % 70 = 60 — a second pass
    expect(clock.state.time).toBe(10);
  });

  it("reports recording then idle", () => {
    const { clock, recorder } = clockAt(10, 60);
    clock.record(SURFACE);
    expect(clock.state.recording).toBe("recording");
    clock.tick(20);
    expect(recorder.states).toEqual(["recording", "idle"]);
  });

  it("starts each recording from t=0", () => {
    const { clock } = clockAt(10, 60);
    clock.seek(7);
    clock.record(SURFACE);
    expect(clock.state.time).toBe(0);
    expect(clock.state.playing).toBe(true);
  });

  it("stays put when there is nothing to capture", () => {
    const recorder = fakeRecorder(null);
    const clock = createClock({ duration: 10, tailPadding: 60 }, () => {}, recorder.start);
    clock.seek(4);
    clock.record(SURFACE);
    expect(clock.state.time).toBe(4);
    expect(clock.state.playing).toBe(false);
  });
});

describe("playback without a recording", () => {
  it("wraps through the tail padding and keeps looping", () => {
    const { clock } = clockAt(10, 5);
    clock.setPlaying(true);

    for (let i = 0; i < 14; i++) clock.tick(1);
    expect(clock.state.time).toBe(14); // inside the tail padding

    clock.tick(1);
    expect(clock.state.time).toBe(0);
    expect(clock.state.playing).toBe(true);
  });

  it("ignores ticks while paused", () => {
    const { clock } = clockAt(10, 5);
    clock.seek(3);
    clock.tick(5);
    expect(clock.state.time).toBe(3);
  });

  it("scales the step by speed", () => {
    const { clock } = clockAt(1000, 60, 30);
    clock.setPlaying(true);
    clock.tick(2);
    expect(clock.state.time).toBe(60);
  });

  it("retargets a running clock without stopping it", () => {
    const { clock } = clockAt(10, 5);
    clock.setPlaying(true);
    clock.retarget({ duration: 100, tailPadding: 5 });
    clock.tick(20);
    expect(clock.state.time).toBe(20); // no wrap: the new loop is longer
    expect(clock.state.playing).toBe(true);
  });
});

describe("state changes are published", () => {
  it("hands out a fresh object each change, so React re-renders", () => {
    const seen: unknown[] = [];
    const clock = createClock({ duration: 10, tailPadding: 5 }, (s) => seen.push(s));
    clock.setPlaying(true);
    clock.tick(1);
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });
});
