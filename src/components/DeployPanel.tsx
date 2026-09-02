import { useEffect, useRef, useState } from "react";
import type { ApiFailure } from "../App.js";
import type { StaffBuild, StaffDeploy } from "../lib/types.js";
import { describeDuration } from "../lib/format.js";
import { Badge } from "./ui/badge.js";
import { Button } from "./ui/button.js";
import { Card, CardBody, CardHeader, CardLabel } from "./ui/card.js";

/**
 * Putting the visitor's app back on the air, and opening its backend.
 *
 * The redeploy is a minute of work with nothing to stream, so the button
 * counts seconds rather than spinning. That is not decoration: a booth
 * conversation needs something to point at, and "it's about forty seconds in"
 * is a sentence a spinner cannot support.
 *
 * A build with no captured source gets an explanation instead of a disabled
 * button. It is the normal state of every build made before Hatch started
 * keeping source, and a greyed-out control with no reason beside it reads as
 * something broken.
 *
 * The same rule covers the expired environment. An ephemeral lives about an
 * hour, so a build staff come back to after lunch answers `deploy_expired` on
 * the backend button — and that sentence alone left them clicking the same
 * dead button, four times in three minutes at the booth. It is the one failure
 * here whose remedy is on screen, so the remedy goes NEXT TO the sentence
 * rather than a scroll away, and the panel stops claiming to be live.
 */
export function DeployPanel({
  build,
  onRedeploy,
  onOpenBackend,
  pending,
  error,
}: {
  build: StaffBuild;
  onRedeploy: () => void;
  /** Must run the fetch AND the window.open in one handler — see App. */
  onOpenBackend: () => void;
  pending: boolean;
  error: ApiFailure | null;
}) {
  const deploy = build.deploy;
  /*
   * Hatch is the only thing that knows. The row survives expiry and carries no
   * end time, and a clock counting down from `deployedAt` would be a guess the
   * screen states as fact. So the panel learns this the moment a click asks
   * Xano and Xano says the tenant is gone — late, but never wrong.
   */
  const expired = error?.code === "deploy_expired";

  return (
    <Card className={deploy && !expired ? "border-deck-blue/40 bg-deck-blue-soft" : undefined}>
      <CardHeader className={deploy && !expired ? "border-deck-blue/25" : undefined}>
        <CardLabel>Demo environment</CardLabel>
        {deploy && <Badge variant={expired ? "muted" : "live"}>{expired ? "Expired" : "Live"}</Badge>}
      </CardHeader>

      <CardBody>
        {deploy ? (
          <LiveEnvironment
            deploy={deploy}
            onOpenBackend={onOpenBackend}
            pending={pending}
            expired={expired}
          />
        ) : !build.redeployable ? (
          <NotRedeployable state={build.state} />
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13.5px] leading-[1.5] text-deck-text-soft">
              Deploys this build&rsquo;s saved source into a fresh environment. About a minute.
            </p>
            <div>
              <Button onClick={onRedeploy} disabled={pending}>
                {pending ? <Elapsed /> : "Deploy it"}
              </Button>
            </div>
          </div>
        )}

        {error !== null && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-[13px] text-deck-halt">{error.message}</p>
            {/*
              The remedy, beside the problem. Only for the expiry: every other
              failure here is a fault where deploying again is a guess, and a
              button offered against all of them would train staff to press it
              at things it cannot fix.
            */}
            {expired && (
              <Button onClick={onRedeploy} disabled={pending} size="sm">
                {pending ? <Elapsed /> : "Redeploy"}
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function LiveEnvironment({
  deploy,
  onOpenBackend,
  pending,
  expired,
}: {
  deploy: StaffDeploy;
  onOpenBackend: () => void;
  pending: boolean;
  expired: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <a
        href={deploy.siteUrl}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-11 items-center truncate rounded-lg border border-deck-line bg-deck-sunk px-3 font-deck-mono text-[13px] text-deck-blue-hi transition-colors hover:text-deck-text"
        title={deploy.siteUrl}
      >
        {deploy.siteUrl}
      </a>

      <div className="flex flex-wrap items-center gap-2">
        {/*
          Offered only when the deploy named a tenant. Without one there is no
          address to mint against, and a button that always 404s is worse than
          no button — the same rule the public done screen follows.
        */}
        {deploy.tenantName !== undefined && (
          /*
            Demoted, not removed, once the tenant is gone. There is one solid
            blue control on this screen and it is what to do next — which after
            an expiry is Redeploy, below. Removing this instead would move the
            layout under a hand that is already reaching for it.
          */
          <Button
            onClick={onOpenBackend}
            disabled={pending}
            variant={expired ? "outline" : "default"}
          >
            Open the backend
          </Button>
        )}
        {deploy.deployMs !== undefined && (
          <span className="font-deck-mono text-[10.5px] tracking-[0.12em] text-deck-text-faint uppercase">
            Deployed in {describeDuration(deploy.deployMs)}
          </span>
        )}
      </div>

      <p className="text-[12px] leading-[1.5] text-deck-text-faint">
        {expired
          ? "This environment is gone. Redeploying makes a fresh one, and the site link above changes with it."
          : "Read-only, and it expires on its own in about an hour. Reset takes it away now."}
      </p>
    </div>
  );
}

function NotRedeployable({ state }: { state: StaffBuild["state"] }) {
  return (
    <p className="text-[13.5px] leading-[1.5] text-deck-text-soft">
      {state === "succeeded"
        ? "This build was made before Xano started saving source, so there is nothing to redeploy. The original site has expired."
        : "This build never finished, so there is nothing to deploy."}
    </p>
  );
}

/**
 * Seconds since the press.
 *
 * Mounted only while pending and unmounted when it settles, so there is no
 * reset to get wrong and no interval left running behind a finished deploy.
 */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  return <>Deploying&hellip; {seconds}s</>;
}
