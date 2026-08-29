/**
 * Client-side thumbnail generation.
 *
 * WHY IN THE BROWSER: a gallery must not download 15 MB radiographs to render
 * 120px tiles, and the only realistic server-side alternative was a native
 * image dependency (sharp) — outside this prompt's "no new deps beyond a
 * multipart parser" budget. The browser already has the decoder, so it
 * downscales before upload and posts the preview as a second part. The server
 * still validates the thumbnail by content and treats it as best-effort.
 */

/** Longest edge of the generated preview, in px. */
const THUMB_MAX = 400;
const THUMB_QUALITY = 0.7;

/**
 * Returns a small JPEG Blob for an image File, or null when the input is not
 * an image (PDFs get an icon in the UI) or the browser cannot decode it.
 */
export async function makeThumbnail(file) {
  if (!file || !String(file.type || "").startsWith("image/")) return null;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });

    const scale = Math.min(1, THUMB_MAX / Math.max(img.width || 1, img.height || 1));
    const w = Math.max(1, Math.round((img.width || 1) * scale));
    const h = Math.max(1, Math.round((img.height || 1) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);

    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", THUMB_QUALITY)
    );
  } catch {
    // Never block an upload because the preview failed.
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Human-readable size for the gallery caption. */
export function formatBytes(n) {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
