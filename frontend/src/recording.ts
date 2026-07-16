/** Frame capture and video export for the Timelapse recording.
 *
 * Implementation: composites the map's capture surface onto a canvas each
 * frame, records the composite with MediaRecorder (WebM), then asks the
 * backend to transcode to MP4 — falling back to the WebM download if that
 * fails. Only useTimelapse calls this; the map hands its canvases across
 * CaptureSurface instead of being crawled for them.
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type RecorderState = "idle" | "recording" | "converting";

/** The map's recordable pixels. MapView implements this — it owns the
 * knowledge of which canvases compose the map (and keeps
 * preserveDrawingBuffer on so they can be read back). */
export interface CaptureSurface {
  canvases(): HTMLCanvasElement[];
}

export interface Recording {
  /** Ends capture and kicks off transcode + download. */
  stop(): void;
}

export function startRecording(
  surface: CaptureSurface,
  onState: (s: RecorderState) => void
): Recording | null {
  const sources = surface.canvases();
  if (!sources.length) return null;

  const capture = document.createElement("canvas");
  capture.width = sources[0].width;
  capture.height = sources[0].height;
  const ctx = capture.getContext("2d")!;

  let raf = 0;
  const draw = () => {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, capture.width, capture.height);
    for (const c of sources) ctx.drawImage(c, 0, 0, capture.width, capture.height);
    raf = requestAnimationFrame(draw);
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
    cancelAnimationFrame(raf);
    const webm = new Blob(chunks, { type: "video/webm" });
    onState("converting");
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
      onState("idle");
    }
  };
  rec.start(250);
  onState("recording");
  return { stop: () => rec.stop() };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
