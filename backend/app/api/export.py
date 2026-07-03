"""WebM -> MP4 transcode seam. The browser records WebM; ffmpeg (in the
image) is implementation — callers just get an MP4 back, or fall back to
keeping their WebM if this endpoint fails."""

import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

router = APIRouter(prefix="/api/export", tags=["export"])

MAX_UPLOAD_BYTES = 500 * 1024 * 1024


@router.post("/mp4")
async def to_mp4(video: UploadFile) -> FileResponse:
    data = await video.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "video too large")

    tmp = Path(tempfile.mkdtemp(prefix="export-"))
    src = tmp / "in.webm"
    dst = tmp / "timelapse.mp4"
    src.write_bytes(data)

    proc = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(src),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            # h264 needs even dimensions; round down if the canvas was odd
            "-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2",
            "-movflags", "+faststart", "-an", str(dst),
        ],
        capture_output=True,
        timeout=300,
    )
    if proc.returncode != 0 or not dst.exists():
        raise HTTPException(500, f"ffmpeg failed: {proc.stderr[-500:].decode(errors='replace')}")

    def cleanup() -> None:
        for p in (src, dst):
            p.unlink(missing_ok=True)
        tmp.rmdir()

    return FileResponse(
        dst,
        media_type="video/mp4",
        filename="timelapse.mp4",
        background=BackgroundTask(cleanup),
    )
