/** The Timelapse clock: rAF loop, wrap-around, and speed are implementation.
 * Duration and the pause-before-wrap come from the timeline — the clock does
 * no time math of its own. */

import { useEffect, useRef, useState } from "react";
import type { Timeline } from "./timeline";

export interface Playback {
  time: number;
  playing: boolean;
  speed: number; // run-seconds per real second
  setPlaying: (p: boolean | ((p: boolean) => boolean)) => void;
  setSpeed: (s: number) => void;
  seek: (t: number) => void;
  reset: () => void;
}

export function usePlayback(
  timeline: Pick<Timeline, "duration" | "tailPadding">,
  active: boolean
): Playback {
  const { duration, tailPadding } = timeline;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(60);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!playing || !active) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => (duration ? (t + dt * speed) % (duration + tailPadding) : 0));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [playing, active, speed, duration, tailPadding]);

  return {
    time,
    playing,
    speed,
    setPlaying,
    setSpeed,
    seek: setTime,
    reset: () => {
      setTime(0);
      setPlaying(true);
    },
  };
}
