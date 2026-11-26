/**
 * Sharing a single entry.
 *
 * Share links point at /s/:id, a page that renders just that submission, so a
 * link opened from WhatsApp or X lands on the video that was shared instead of
 * a feed the recipient has to scroll through to find it.
 */

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

export function submissionShareUrl(submissionId: string, origin = window.location.origin): string {
  return `${origin}/s/${encodeURIComponent(submissionId)}`;
}

interface ShareTarget {
  id: string;
  caption?: string | null;
  user?: { displayName: string };
  challenge?: { title: string };
}

export function shareText(target: ShareTarget): string {
  const who = target.user?.displayName ? `@${target.user.displayName}` : "this entry";
  const where = target.challenge?.title ? ` in #${target.challenge.title}` : "";
  return `Vote for ${who}${where}`;
}

/**
 * Native share sheet where the browser has one (mobile), clipboard otherwise.
 *
 * The user closing the share sheet rejects with an AbortError. That is a
 * normal choice, not a failure, so it is reported as "cancelled" and the caller
 * shows nothing. It must NOT fall through to the clipboard, because copying
 * after someone dismissed the sheet would be surprising.
 */
export async function shareSubmission(target: ShareTarget): Promise<ShareOutcome> {
  const url = submissionShareUrl(target.id);
  const data = { title: "Clashreel", text: shareText(target), url };

  if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return "cancelled";
      // Any other failure (e.g. NotAllowedError outside a user gesture): try the clipboard.
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      // Clipboard permission denied: fall through.
    }
  }
  return "unavailable";
}
