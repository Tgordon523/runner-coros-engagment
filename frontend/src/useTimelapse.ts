/** React adapter for the Timelapse clock: pumps `tick` from
 * requestAnimationFrame and mirrors the clock's state into render.
 *
 * All playback rules — wrap-around, speed, stopping a recording exactly at
 * the loop boundary — live in timelapse.ts, where a test can drive them
 * without a browser. Nothing here decides anything.
 */

import { useEffect, useRef, useState } from "react";
import type { CaptureSurface, RecorderState } from "./recording";
import {
  createClock,
  INITIAL_CLOCK,
  type Clock,
  type ClockState,
  type ClockTimeline,
} from "./timelapse";

export interface Timelapse {
  time: number;
  playing: boolean;
  speed: number; // run-seconds per real second
  setPlaying: (p: boolean | ((p: boolean) => boolean)) => void;
  setSpeed: (s: number) => void;
  seek: (t: number) => void;
  reset: () => void;
  recording: RecorderState;
  /** Record one full loop from t=0, then stop and export. */
  record: (surface: CaptureSurface) => void;
  stopRecording: () => void;
}

export function useTimelapse(
  timeline: ClockTimeline,
  active: boolean
): Timelapse {
  const [state, setState] = useState<ClockState>(INITIAL_CLOCK);
  const clockRef = useRef<Clock | null>(null);
  if (!clockRef.current) clockRef.current = createClock(timeline, setState);
  const clock = clockRef.current;
  // the tracks or the timing mode changed under a running clock
  clock.retarget(timeline);

  useEffect(() => {
    if (!state.playing || !active) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function frame(now) {
      clock.tick((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(raf);
  }, [state.playing, active, clock]);

  return {
    time: state.time,
    playing: state.playing,
    speed: state.speed,
    recording: state.recording,
    setPlaying: clock.setPlaying,
    setSpeed: clock.setSpeed,
    seek: clock.seek,
    reset: clock.reset,
    record: clock.record,
    stopRecording: clock.stopRecording,
  };
}
