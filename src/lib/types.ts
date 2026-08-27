/**
 * The shape of Hatch's staff API, hand-written.
 *
 * This is a COPY of `StaffBuild`, `StaffDeploy`, and `StaffHandoff` in the
 * hatch repo's `shared/contracts.ts`. Nothing typechecks the two against each
 * other — this repo does not depend on that one — which is the same
 * out-of-repo-consumer arrangement `xano-cli` has with the activity contract,
 * and it carries the same rule:
 *
 *   **Adding a field over there is safe. Renaming or removing one silently
 *   breaks this app, and nothing will catch it until a staff member does.**
 *
 * So keep this file boring: mirror the names exactly, and when something
 * changes in `shared/contracts.ts`, change it here in the same sitting.
 */

/** The states a Hatch build can be in. Mirrors `SessionState`. */
export type BuildState =
  | "draft"
  | "queued"
  | "provisioning"
  | "building"
  | "deploying"
  | "succeeded"
  | "failed"
  | "expired"
  | "rejected"
  | "cancelled";

/** An environment a booth redeploy created and staff are demoing now. */
export interface StaffDeploy {
  siteUrl: string;
  /** Absent when the deploy named no tenant; the backend door is not offered. */
  tenantName?: string;
  deployMs?: number;
  deployedAt: number;
}

/** Everything the dashboard shows for one code. */
export interface StaffBuild {
  sessionId: string;
  boothCode: string | null;
  state: BuildState;
  framework: "react" | "svelte";
  prompt: string;
  /** End to end, in ms. Absent for a build that never reached a terminal state. */
  buildMs?: number;
  createdAt: number;
  /** What the ORIGINAL build published — expired by the time staff see it. */
  originalSiteUrl?: string;
  objects?: { tables?: number; apis?: number; functions?: number };
  sitePages?: number;
  failureMessage?: string;
  /** False for every build made before Hatch started keeping source. */
  redeployable: boolean;
  deploy?: StaffDeploy;
}

/** The one-time way into a redeployed backend. Opened, never rendered. */
export interface StaffHandoff {
  url: string;
}

/** Hatch's error envelope. `code` is the stable key; `message` is prose. */
export interface ApiError {
  code: string;
  message: string;
}
