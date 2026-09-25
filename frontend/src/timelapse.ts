/** The Timelapse clock: playback state and the record-one-full-loop flow,
 * with no React in it.
 *
 * The clock's tick is the only code that knows where the loop ends, so a
 * recording stops exactly at the boundary — no consumer polls the time and
 * races the wrap. Keeping the state machine out of React is what makes that
 * checkable: useTimelapse pumps `tick` from requestAnimationFrame, a test
 * pumps it from a loop. Frame capture and export live in recording.ts.
 */

import {
  startRecording,
  type CaptureSurface,
  type RecorderState,
  type Recording,
} from "./recording";
import { advance, type Timeline } from "./timeline";

/** Just the span the clock runs over — modes and per-point times stay the
 * timeline's business. */
export type ClockTimeline = Pick<Timeline, "duration" | "tailPadding">;

export interface ClockState {
  time: number;
  playing: boolean;
  speed: number; // run-seconds per real second
  recording: RecorderState;
}

export const INITIAL_CLOCK: ClockState = {
  time: 0,
  playing: false,
  speed: 60,
  recording: "idle",
};

export interface Clock {
  readonly state: ClockState;
  /** Advance by `dt` real seconds. A recording that reaches the end of the
   * loop is stopped and exported here. */
  tick(dt: number): void;
  seek(t: number): void;
  setPlaying(p: boolean | ((p: boolean) => boolean)): void;
  setSpeed(s: number): void;
  /** Restart playback from t=0 — the mode/track change reset. */
  reset(): void;
  /** Record one full loop from t=0, then stop and export. */
  record(surface: CaptureSurface): void;
  stopRecording(): void;
  /** Point the clock at a new timeline without disturbing playback. */
  retarget(tl: ClockTimeline): void;
}

export function createClock(
  timeline: ClockTimeline,
  onChange: (s: ClockState) => void,
  // The recorder is injected so the boundary can be exercised without
  // MediaRecorder or a DOM: two adapters, one seam.
  start: typeof startRecording = startRecording
): Clock {
  let tl = timeline;
  let rec: Recording | null = null;
  let state: ClockState = { ...INITIAL_CLOCK };

  const set = (patch: Partial<ClockState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  const stopRecording = () => {
    rec?.stop();
    rec = null;
  };

  return {
    get state() {
      return state;
    },
    retarget: (next) => {
      tl = next;
    },
    seek: (time) => set({ time }),
    setSpeed: (speed) => set({ speed }),
    setPlaying: (p) =>
      set({ playing: typeof p === "function" ? p(state.playing) : p }),
    reset: () => set({ time: 0, playing: true }),
    stopRecording,

    tick: (dt) => {
      if (!state.playing) return;
      const next = advance(state.time, dt * state.speed, tl);
      if (next.atEnd && rec) {
        // The loop closed. End the recording here and pin the clock to the
        // boundary — a single tick can jump past the wrap, and letting the
        // wrapped time through would smear a second pass into the video.
        stopRecording();
        set({ time: tl.duration, playing: false });
        return;
      }
      set({ time: next.time });
    },

    record: (surface) => {
      const started = start(surface, (recording) => set({ recording }));
      if (!started) return; // nothing to capture
      rec = started;
      set({ time: 0, playing: true });
    },
  };
}
