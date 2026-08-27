/**
 * Talking to Hatch's staff API.
 *
 * Every call is cross-origin and carries the staff token as a bearer header.
 * Both halves matter: Hatch answers `Access-Control-Allow-Origin: *` on
 * `/api/staff/*` only, and it sends no `Allow-Credentials` — the token is a
 * header the dashboard holds deliberately, not a cookie a browser attaches.
 *
 * One thing to know before changing anything here: **Hatch answers 404 for a
 * wrong token and for an unknown code alike**, on purpose, so that probing
 * cannot confirm the surface exists. That is right for the API and useless for
 * a staff member, so `configured()` below lets the UI tell the two apart from
 * this side — the only place that distinction can be made.
 */

import type { ApiError, StaffBuild, StaffDeploy, StaffHandoff } from "./types.js";

const BASE = (import.meta.env["VITE_HATCH_URL"] as string | undefined) ?? "";
const TOKEN = (import.meta.env["VITE_HATCH_STAFF_TOKEN"] as string | undefined) ?? "";

/**
 * Whether this build was given a Hatch URL and a token at all.
 *
 * Inlined at build time, so this is a fact about the bundle rather than about
 * the network. When it is false every request would 404 in a way that reads as
 * "no such code", which would have staff retyping a perfectly good code at a
 * visitor. The UI checks this first and says what is actually wrong.
 */
export function configured(): boolean {
  return BASE !== "" && TOKEN !== "";
}

/** Raised for any non-2xx, carrying Hatch's stable error code when it sent one. */
export class StaffApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StaffApiError";
  }
}

async function call<T>(path: string, method: "GET" | "POST"): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
  } catch {
    // A failed fetch cross-origin is indistinguishable from a CORS rejection,
    // and at a booth it is nearly always the wifi.
    throw new StaffApiError(0, "unreachable", "Could not reach Xano. Check the connection.");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new StaffApiError(
      res.status,
      body?.code ?? "internal",
      body?.message ?? "Something went wrong.",
    );
  }
  return (await res.json()) as T;
}

/**
 * Look a build up by either code.
 *
 * The code is sent as typed. Hatch normalises it — uppercase, and everything
 * outside the alphabet dropped — so the dashed form it texts, a lowercase
 * reading, and stray spaces all resolve there rather than here. Doing it in
 * both places would mean two rules to keep in step.
 */
export function fetchBuild(code: string): Promise<StaffBuild> {
  return call<StaffBuild>(`/api/staff/builds/${encodeURIComponent(code)}`, "GET");
}

/** Deploy the build's captured source into a fresh ephemeral. Takes a minute. */
export function redeployBuild(code: string): Promise<StaffDeploy> {
  return call<StaffDeploy>(`/api/staff/builds/${encodeURIComponent(code)}/redeploy`, "POST");
}

/**
 * Mint the way into the redeployed backend.
 *
 * Returns a URL rather than redirecting, because a cross-origin navigation
 * cannot carry the bearer header. The token inside that URL lives 60 seconds
 * and is spent on first use, so the caller must open it immediately — and from
 * inside the click handler, or the browser blocks the popup.
 */
export function openBackend(code: string): Promise<StaffHandoff> {
  return call<StaffHandoff>(`/api/staff/builds/${encodeURIComponent(code)}/xano`, "POST");
}

/** Tear the environment down and forget it. Safe on a build with none. */
export function resetBuild(code: string): Promise<{ ok: boolean }> {
  return call<{ ok: boolean }>(`/api/staff/builds/${encodeURIComponent(code)}/reset`, "POST");
}
