/**
 * Grabs a single frame from a video file entirely in the browser — no
 * server-side ffmpeg needed — and returns it as a JPEG data URL, or null
 * if anything goes wrong (unsupported codec, timeout, etc.). A missing
 * thumbnail should never block a submission.
 */
export function captureVideoThumbnail(file: File, atSeconds = 1): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;

    let settled = false;
    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    const timeout = setTimeout(() => finish(null), 8000);

    video.addEventListener("loadedmetadata", () => {
      // Clamp so a very short clip still gets a valid seek target.
      video.currentTime = Math.min(atSeconds, Math.max(0, video.duration / 2));
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = video.videoWidth > 0 ? Math.min(1, 480 / video.videoWidth) : 1;
        canvas.width = Math.round((video.videoWidth || 480) * scale);
        canvas.height = Math.round((video.videoHeight || 270) * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        clearTimeout(timeout);
        finish(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        finish(null);
      }
    });

    video.addEventListener("error", () => finish(null));
  });
}
