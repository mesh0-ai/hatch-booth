import type { StaffBuild } from "../lib/types.js";
import { describeDuration, groupCode } from "../lib/format.js";
import { Badge } from "./ui/badge.js";
import { Card, CardBody, CardHeader, CardLabel } from "./ui/card.js";

/**
 * What was built, and how fast.
 *
 * The prompt is the headline because it is the first thing a staff member says
 * back to a visitor — "you asked for a portfolio site for a potter" is what
 * establishes that this is the right build before anything is deployed.
 *
 * The speed sits beside it because it is the pitch. Everything below is
 * supporting detail and is allowed to be absent: Hatch omits a count it could
 * not establish rather than sending a zero, so a missing pill means "unknown"
 * and must render as nothing at all.
 */
export function BuildDetail({ build }: { build: StaffBuild }) {
  return (
    <Card>
      <CardHeader>
        <CardLabel>What they asked for</CardLabel>
        <div className="flex items-center gap-2">
          {build.boothCode !== null && (
            <span className="font-deck-mono text-[11px] tracking-[0.14em] text-deck-blue-hi">
              {groupCode(build.boothCode)}
            </span>
          )}
          <StateBadge state={build.state} />
        </div>
      </CardHeader>

      <CardBody>
        <p className="text-[16px] leading-[1.5] text-pretty">{build.prompt}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {build.buildMs !== undefined && (
            <Stat label="Built in" value={describeDuration(build.buildMs)} />
          )}
          <Stat label="Frontend" value={build.framework} />
          {build.objects?.tables !== undefined && (
            <Stat label="Tables" value={String(build.objects.tables)} />
          )}
          {build.objects?.apis !== undefined && (
            <Stat label="Endpoints" value={String(build.objects.apis)} />
          )}
          {build.objects?.functions !== undefined && (
            <Stat label="Functions" value={String(build.objects.functions)} />
          )}
          {build.sitePages !== undefined && (
            <Stat label="Pages" value={String(build.sitePages)} />
          )}
        </div>

        {build.failureMessage !== undefined && (
          <p className="mt-3.5 text-[13px] text-deck-halt">{build.failureMessage}</p>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-deck-mono text-[10px] tracking-[0.14em] text-deck-text-faint uppercase">
        {label}
      </span>
      <span className="font-deck-mono text-[13.5px] font-medium">{value}</span>
    </span>
  );
}

function StateBadge({ state }: { state: StaffBuild["state"] }) {
  if (state === "succeeded") return <Badge variant="live">Succeeded</Badge>;
  if (state === "failed" || state === "expired" || state === "rejected") {
    return <Badge variant="halt">{state}</Badge>;
  }
  if (state === "cancelled") return <Badge variant="muted">Stopped</Badge>;
  // Still running. Rare here — a visitor reaching the booth mid-build has
  // walked fast — but it is a real state and must not render as a failure.
  return <Badge variant="info">{state}</Badge>;
}
