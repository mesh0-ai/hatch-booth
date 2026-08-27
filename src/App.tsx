import { useState } from "react";
import { BuildDetail } from "./components/BuildDetail.js";
import { CodeEntry } from "./components/CodeEntry.js";
import { DeployPanel } from "./components/DeployPanel.js";
import { Button } from "./components/ui/button.js";
import {
  StaffApiError,
  configured,
  fetchBuild,
  openBackend,
  redeployBuild,
  resetBuild,
} from "./lib/api.js";
import type { StaffBuild } from "./lib/types.js";

/**
 * The whole dashboard: one screen, three states.
 *
 *   Idle    — an empty code box. Where every visitor starts and ends.
 *   Loaded  — a build is on screen; it may or may not have a live environment.
 *
 * There is no router and no persistence, and both absences are deliberate. A
 * URL that survived a refresh would survive between visitors too, and the one
 * thing this screen must guarantee is that the next person does not see the
 * last person's app.
 */
export function App() {
  const [build, setBuild] = useState<StaffBuild | null>(null);
  const [pending, setPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * The code as staff typed it, held so every later action can address the
   * same build. Deliberately not `build.boothCode`: a build found by its
   * twelve-character watch code has a booth code that is not what was typed,
   * and reusing the wrong one would work by luck rather than by design.
   */
  const [code, setCode] = useState("");

  async function find(entered: string) {
    setPending(true);
    setLookupError(null);
    try {
      const found = await fetchBuild(entered);
      setCode(entered);
      setBuild(found);
    } catch (err) {
      setLookupError(describe(err, "That code did not match a build."));
    } finally {
      setPending(false);
    }
  }

  async function deploy() {
    setPending(true);
    setActionError(null);
    try {
      await redeployBuild(code);
      // Re-read rather than merging the response in: the lookup is the one
      // description of this build, and a screen assembled from two sources is
      // a screen that can disagree with itself.
      setBuild(await fetchBuild(code));
    } catch (err) {
      setActionError(describe(err, "The redeploy did not work."));
    } finally {
      setPending(false);
    }
  }

  /**
   * Open the backend.
   *
   * The `window.open` runs in the same handler as the fetch that produced the
   * URL, and both halves of that matter. The token inside it lives 60 seconds
   * and is spent on first use, so it cannot be rendered as a link and opened
   * later — and a popup opened from an async continuation is the one browsers
   * block. So the window is opened FIRST, synchronously, and pointed at the
   * URL once it arrives.
   */
  async function backend() {
    setActionError(null);
    const opened = window.open("", "_blank", "noopener");
    try {
      const { url } = await openBackend(code);
      if (opened) opened.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      opened?.close();
      setActionError(describe(err, "Could not open the backend."));
    }
  }

  /**
   * Back to an empty box, and take the environment away.
   *
   * No confirmation dialog. This is pressed between visitors, dozens of times
   * a day, and it is the one interaction that has to be instant — the friction
   * of a dialog would cost more than the mistake it prevents, and the mistake
   * is recoverable by pressing Deploy again.
   *
   * The UI clears whether or not the teardown succeeded, matching what Hatch
   * does with the row: a laptop that will not reset because a gateway timed
   * out is worse than a tenant that expires on its own.
   */
  async function reset() {
    const target = code;
    setBuild(null);
    setCode("");
    setActionError(null);
    setLookupError(null);
    if (target !== "") await resetBuild(target).catch(() => undefined);
  }

  if (!configured()) return <Misconfigured />;

  return (
    <div className="booth-ground min-h-dvh">
      <header className="flex items-center justify-between border-b border-deck-line px-4 py-3 sm:px-6">
        <span className="font-deck-mono text-[10.5px] tracking-[0.18em] text-deck-text-faint uppercase">
          Xano &middot; Booth 606
        </span>
        {build !== null && (
          <Button variant="danger" size="sm" onClick={() => void reset()}>
            Reset
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-[680px] px-4 py-8 sm:px-6">
        {build === null ? (
          <CodeEntry onSubmit={(c) => void find(c)} pending={pending} error={lookupError} />
        ) : (
          <div className="flex flex-col gap-3">
            <BuildDetail build={build} />
            <DeployPanel
              build={build}
              onRedeploy={() => void deploy()}
              onOpenBackend={() => void backend()}
              pending={pending}
              error={actionError}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Hatch answers 404 for a wrong token and an unknown code alike, so that
 * probing cannot confirm the staff surface exists. Correct there, useless
 * here — this is the only side that can tell the two apart, and it does so by
 * knowing whether the bundle was given a token at all.
 */
function Misconfigured() {
  return (
    <div className="booth-ground flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-[420px] text-center">
        <h1 className="text-[18px] font-bold">Not configured</h1>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-deck-text-soft">
          This build has no Xano URL or staff token. Copy <code>.env.example</code> to{" "}
          <code>.env</code>, fill both in, and restart <code>npm run dev</code> — Vite reads
          them at build time, so a running server will not pick them up.
        </p>
      </div>
    </div>
  );
}

/** Hatch's prose when it sent some, and something a person can act on when not. */
function describe(err: unknown, fallback: string): string {
  if (err instanceof StaffApiError) {
    if (err.code === "unreachable") return err.message;
    // 404 covers both "no such code" and "wrong token". The token is known
    // present by here, so the code is the likelier of the two — but saying so
    // without hedging would have staff retyping a good code at a visitor.
    if (err.status === 404) return "No build for that code. Check the token if it keeps happening.";
    return err.message;
  }
  return fallback;
}
