/** The Timelapse module: one clock (rAF loop, wrap-around, speed) and the
 * record-one-full-loop flow behind a single interface.
 *
 * The clock's tick is the only code that knows where the loop ends
 * (timeline.advance), so a recording stops exactly at the boundary — no
 * consumer polls the time and races the wrap. Frame capture and export live
 * in recording.ts; the map hands its pixels across CaptureSurface.
 */

import { useEffect, useRef, useState } from "react";
import {
  startRecording,
  type CaptureSurface,
  type RecorderState,
  type Recording,
} from "./recording";
import { advance, type Timeline } from "./timeline";

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
  timeline: Pick<Timeline, "duration" | "tailPadding">,
  active: boolean
): Timelapse {
  const { duration, tailPadding } = timeline;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(60);
  const [recording, setRecording] = useState<RecorderState>("idle");
  const timeRef = useRef(0);
  const recRef = useRef<Recording | null>(null);
  const rafRef = useRef<number>();

  const seek = (t: number) => {
    timeRef.current = t;
    setTime(t);
  };

  useEffect(() => {
    if (!playing || !active) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = advance(timeRef.current, dt * speed, { duration, tailPadding });
      if (next.atEnd && recRef.current) {
        recRef.current.stop();
        recRef.current = null;
        seek(duration);
        setPlaying(false);
        return;
      }
      seek(next.time);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [playing, active, speed, duration, tailPadding]);

  const record = (surface: CaptureSurface) => {
    const rec = startRecording(surface, setRecording);
    if (!rec) return;
    recRef.current = rec;
    seek(0);
    setPlaying(true);
  };

  const stopRecording = () => {
    recRef.current?.stop();
    recRef.current = null;
  };

  return {
    time,
    playing,
    speed,
    setPlaying,
    setSpeed,
    seek,
    reset: () => {
      seek(0);
      setPlaying(true);
    },
    recording,
    record,
    stopRecording,
  };
}
