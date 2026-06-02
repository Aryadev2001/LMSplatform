/**
 * Lesson video classification + paid-video protection.
 *
 * Direct files we host (Vercel Blob) or any *.mp4/.webm/... URL are served
 * through an auth + enrollment-gated streaming proxy (`/api/lessons/<id>/stream`)
 * so the raw, permanent, public Blob URL never reaches the client and a shared
 * link is useless without the viewer's session. YouTube/Vimeo (and other
 * external embeds) stay as iframes — those live on the partner's chosen host,
 * not ours, so there's nothing for us to protect.
 */
const BLOB_HOST = "blob.vercel-storage.com";

/** A file we can stream-proxy: our Blob host, or a direct video file URL. */
export function isProxyableVideo(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(BLOB_HOST)) return true;
    return /\.(mp4|webm|mov|m4v|ogv)$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export type LessonMedia = { kind: "video" | "iframe"; src: string } | null;

/**
 * Resolve what the client should render for a lesson. Returns `null` when the
 * lesson has no playable video — callers MUST also pass `null` for viewers who
 * aren't entitled, so a raw URL never lands in the client payload.
 */
export function lessonMediaFor(lessonId: string, videoUrl: string | null): LessonMedia {
  if (!videoUrl || videoUrl.includes("placeholder.edt")) return null;
  let u: URL;
  try {
    u = new URL(videoUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v");
    if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
  }
  if (host === "youtu.be") {
    return { kind: "iframe", src: `https://www.youtube.com/embed${u.pathname}` };
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
  }

  // Our hosted file → protected proxy (raw Blob URL stays server-side).
  if (isProxyableVideo(videoUrl)) {
    return { kind: "video", src: `/api/lessons/${lessonId}/stream` };
  }

  // Any other external embed (Loom, etc.) — the partner's own hosted choice.
  return { kind: "iframe", src: videoUrl };
}
