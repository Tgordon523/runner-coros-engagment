/** Records the live map (basemap + deck layers) to a video file.
 *
 * Implementation: composites every canvas in the map container onto a capture
 * canvas each frame, records the composite with MediaRecorder (WebM), then
 * asks the backend to transcode to MP4 — falling back to the WebM download if
 * that fails. The Timelapse clock drives what gets drawn; this module is its
 * second consumer.
 */

import { useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type RecorderState = "idle" | "recording" | "converting";

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number>(0);

  const start = (container: HTMLElement) => {
    const sources = Array.from(container.querySelectorAll("canvas"));
    if (!sources.length) return;

    const capture = document.createElement("canvas");
    capture.width = sources[0].width;
    capture.height = sources[0].height;
    const ctx = capture.getContext("2d")!;

    const draw = () => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, capture.width, capture.height);
      for (const c of sources) ctx.drawImage(c, 0, 0, capture.width, capture.height);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(capture.captureStream(30), {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
      videoBitsPerSecond: 8_000_000,
    });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      cancelAnimationFrame(rafRef.current);
      const webm = new Blob(chunks, { type: "video/webm" });
      setState("converting");
      try {
        const form = new FormData();
        form.append("video", webm, "timelapse.webm");
        const res = await fetch(`${API_URL}/api/export/mp4`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error(String(res.status));
        download(await res.blob(), "timelapse.mp4");
      } catch {
        download(webm, "timelapse.webm"); // transcode failed; WebM still art
      } finally {
        setState("idle");
      }
    };
    rec.start(250);
    recorderRef.current = rec;
    setState("recording");
  };

  const stop = () => recorderRef.current?.stop();

  return { state, start, stop };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
