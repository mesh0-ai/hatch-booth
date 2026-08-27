/** Presentation helpers shared by the panels. */

/**
 * A duration a staff member reads out loud.
 *
 * Rounded to whole seconds under a minute and to `Xm Ys` above, because the
 * sentence this feeds is "it took about two minutes" — precision past that is
 * noise in a conversation.
 */
export function describeDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`;
}

/**
 * Group a booth code the way the SMS does.
 *
 * Only for display of a code the dashboard is echoing back. What staff type is
 * sent as typed — Hatch normalises it, and doing it here too would be a second
 * rule to keep in step with the first.
 */
export function groupCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}

/**
 * Strip what cannot be in a code, and uppercase the rest.
 *
 * Applied as staff TYPE, so the field shows a clean code while somebody reads
 * one out. This is a display convenience and not the authority: Hatch runs the
 * same normalisation on what it receives, so a paste that dodges this still
 * resolves.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export function cleanCodeInput(value: string): string {
  let out = "";
  for (const ch of value.toUpperCase()) if (ALPHABET.includes(ch)) out += ch;
  // Both code lengths Hatch accepts; past twelve it is not a code.
  return out.slice(0, 12);
}
