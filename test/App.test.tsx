import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";
import type { StaffBuild } from "../src/lib/types.js";

/**
 * The one screen staff use.
 *
 * Two behaviours here are load-bearing beyond looking right. The backend
 * window must be opened synchronously inside the click handler — a popup from
 * an async continuation is the one browsers block, and the token it carries
 * lives 60 seconds so it cannot be opened later. And Reset must return to an
 * empty box whether or not the teardown succeeded, because the next visitor
 * must never see the last one's app.
 */

const BUILD: StaffBuild = {
  sessionId: "sess-1",
  boothCode: "K7QM2X",
  state: "succeeded",
  framework: "react",
  prompt: "a portfolio site for a potter",
  buildMs: 184_000,
  createdAt: Date.now(),
  originalSiteUrl: "https://original.example",
  objects: { tables: 2, apis: 3 },
  sitePages: 4,
  redeployable: true,
};

const DEPLOYED: StaffBuild = {
  ...BUILD,
  deploy: {
    siteUrl: "https://booth-redeploy.dev.xano.io",
    tenantName: "booth-tenant-0007",
    deployMs: 52_000,
    deployedAt: Date.now(),
  },
};

/** Calls the app made, so a test can assert the token and the path. */
let calls: Array<{ url: string; method: string; auth: string | null }>;
/** Queued responses, matched by URL substring, in the order they were added. */
let routes: Array<{ match: string; status: number; body: unknown }>;

function respond(match: string, body: unknown, status = 200) {
  routes.push({ match, status, body });
}

beforeEach(() => {
  calls = [];
  routes = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? "GET",
      auth: headers["authorization"] ?? null,
    });
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`no stubbed route for ${url}`);
    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: { "content-type": "application/json" },
    });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Type a code and press Find. */
async function find(code = "K7QM2X") {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText("Booth code"), code);
  await user.click(screen.getByRole("button", { name: "Find" }));
  return user;
}

describe("finding a build", () => {
  it("shows the prompt and how long it took", async () => {
    respond("/api/staff/builds/K7QM2X", BUILD);
    await find();

    await screen.findByText("a portfolio site for a potter");
    expect(screen.getByText("3m 4s")).toBeInTheDocument();
  });

  it("shows what the build registered", async () => {
    respond("/api/staff/builds/K7QM2X", BUILD);
    await find();

    await screen.findByText("a portfolio site for a potter");
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("omits a count Hatch could not establish rather than showing zero", async () => {
    // Absent means unknown, never none. A zero beside a backend that has three
    // functions is the one wrong answer this panel cannot afford.
    respond("/api/staff/builds/K7QM2X", { ...BUILD, objects: { tables: 2 } });
    await find();

    await screen.findByText("Tables");
    expect(screen.queryByText("Functions")).not.toBeInTheDocument();
    expect(screen.queryByText("Endpoints")).not.toBeInTheDocument();
  });

  it("sends the staff token on every request", async () => {
    respond("/api/staff/builds/K7QM2X", BUILD);
    await find();

    await screen.findByText("a portfolio site for a potter");
    expect(calls[0]!.auth).toMatch(/^Bearer .+/);
  });

  it("uppercases and strips as staff type", async () => {
    // Typed while somebody reads a code out. A staff member should not have to
    // look at the field to know it is right.
    respond("/api/staff/builds", BUILD);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Booth code"), "k7q-m2x");

    expect(screen.getByLabelText("Booth code")).toHaveValue("K7QM2X");
  });

  it("drops characters the alphabet excludes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Booth code"), "K7QM2XO1I");
    expect(screen.getByLabelText("Booth code")).toHaveValue("K7QM2X");
  });

  it("accepts the twelve-character watch code", async () => {
    respond("/api/staff/builds/K7QM2XPA9RTV", BUILD);
    await find("K7QM2XPA9RTV");
    await screen.findByText("a portfolio site for a potter");
  });

  it("explains an unknown code and stays on the box", async () => {
    respond("/api/staff/builds", { code: "session_not_found", message: "No such build." }, 404);
    await find();

    await screen.findByRole("alert");
    expect(screen.getByLabelText("Booth code")).toBeInTheDocument();
  });

  it("mentions the token on a 404, since Hatch cannot tell them apart", async () => {
    respond("/api/staff/builds", { code: "session_not_found", message: "No such build." }, 404);
    await find();

    expect(await screen.findByRole("alert")).toHaveTextContent(/token/i);
  });

  it("says so when Hatch is unreachable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await find();

    expect(await screen.findByRole("alert")).toHaveTextContent(/connection/i);
  });

  it("does not submit an empty code", async () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Find" })).toBeDisabled();
  });
});

describe("a build with no saved source", () => {
  it("explains it instead of offering a dead button", async () => {
    // The normal state of every build made before capture shipped. A greyed
    // control with no reason beside it reads as something broken.
    respond("/api/staff/builds/K7QM2X", { ...BUILD, redeployable: false });
    await find();

    await screen.findByText(/before Xano started saving source/);
    expect(screen.queryByRole("button", { name: "Deploy it" })).not.toBeInTheDocument();
  });

  it("says something different for a build that never finished", async () => {
    respond("/api/staff/builds/K7QM2X", {
      ...BUILD,
      state: "failed",
      redeployable: false,
      failureMessage: "That build did not make it.",
    });
    await find();

    await screen.findByText(/never finished/);
    expect(screen.getByText("That build did not make it.")).toBeInTheDocument();
  });
});

describe("deploying", () => {
  it("shows the site once it lands", async () => {
    respond("/api/staff/builds/K7QM2X/redeploy", DEPLOYED.deploy);
    respond("/api/staff/builds/K7QM2X", BUILD);
    const user = await find();

    await screen.findByRole("button", { name: "Deploy it" });
    routes = [
      { match: "/redeploy", status: 200, body: DEPLOYED.deploy },
      { match: "/api/staff/builds/K7QM2X", status: 200, body: DEPLOYED },
    ];
    await user.click(screen.getByRole("button", { name: "Deploy it" }));

    const link = await screen.findByRole("link", { name: DEPLOYED.deploy!.siteUrl });
    expect(link).toHaveAttribute("href", DEPLOYED.deploy!.siteUrl);
  });

  it("counts seconds while it runs, rather than spinning", async () => {
    // A booth conversation needs something to point at.
    let release: (() => void) | undefined;
    const held = new Promise<void>((r) => (release = r));
    respond("/api/staff/builds/K7QM2X", BUILD);
    const user = await find();
    await screen.findByRole("button", { name: "Deploy it" });

    vi.stubGlobal("fetch", async () => {
      await held;
      return new Response(JSON.stringify(DEPLOYED.deploy), { status: 200 });
    });
    await user.click(screen.getByRole("button", { name: "Deploy it" }));

    expect(await screen.findByRole("button", { name: /Deploying/ })).toBeDisabled();
    release!();
  });

  it("reports a failure and leaves the button pressable", async () => {
    respond("/api/staff/builds/K7QM2X", BUILD);
    const user = await find();
    await screen.findByRole("button", { name: "Deploy it" });

    routes = [
      { match: "/redeploy", status: 409, body: { code: "redeploy_failed", message: "The redeploy did not produce a site." } },
    ];
    await user.click(screen.getByRole("button", { name: "Deploy it" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("did not produce a site");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Deploy it" })).not.toBeDisabled(),
    );
  });
});

describe("opening the backend", () => {
  it("opens the window inside the click, before the URL is known", async () => {
    // The popup rule: a window opened from an async continuation is blocked,
    // and the token in the URL is spent on first use and lives 60 seconds.
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    const open = vi.fn(() => opened);
    vi.stubGlobal("open", open);

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [{ match: "/xano", status: 200, body: { url: "https://x.xano.io/impersonate?_ti=t" } }];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));

    // No "noopener" feature: it makes real browsers return null, which lands
    // the backend in this window and leaves a blank tab behind.
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(opened.opener).toBeNull();
    await waitFor(() =>
      expect(opened.location.href).toBe("https://x.xano.io/impersonate?_ti=t"),
    );
  });

  it("closes the blank window when the mint fails", async () => {
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [{ match: "/xano", status: 502, body: { code: "internal", message: "Could not open the backend." } }];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));

    await screen.findByRole("alert");
    expect(opened.close).toHaveBeenCalled();
  });

  it("offers a redeploy button beside an expired deploy", async () => {
    // The remedy next to the problem. Staff clicked a dead backend button four
    // times in three minutes when the sentence stood on its own.
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [
      {
        match: "/xano",
        status: 410,
        body: { code: "deploy_expired", message: "This deploy has expired." },
      },
    ];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This deploy has expired.");
    expect(within(alert).getByRole("button", { name: "Redeploy" })).toBeInTheDocument();
  });

  it("stops calling an expired environment live", async () => {
    // A LIVE badge over "this deploy has expired" is the screen disagreeing
    // with itself while a visitor reads both.
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });
    expect(screen.getByText("Live")).toBeInTheDocument();

    routes = [
      {
        match: "/xano",
        status: 410,
        body: { code: "deploy_expired", message: "This deploy has expired." },
      },
    ];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));

    await screen.findByRole("alert");
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("offers no redeploy button beside a failure redeploying cannot fix", async () => {
    // A 502 is our lost scope or Xano being down. A button offered against
    // every failure would train staff to press it at things it cannot fix.
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [
      { match: "/xano", status: 502, body: { code: "internal", message: "Could not open it." } },
    ];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).queryByRole("button", { name: "Redeploy" })).not.toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("redeploys from that button and clears the expiry", async () => {
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [
      {
        match: "/xano",
        status: 410,
        body: { code: "deploy_expired", message: "This deploy has expired." },
      },
    ];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));
    await screen.findByRole("alert");

    const fresh = { ...DEPLOYED.deploy!, siteUrl: "https://fresh.dev.xano.io" };
    routes = [
      { match: "/reset", status: 200, body: { ok: true } },
      { match: "/redeploy", status: 200, body: fresh },
      { match: "/api/staff/builds/K7QM2X", status: 200, body: { ...DEPLOYED, deploy: fresh } },
    ];
    await user.click(screen.getByRole("button", { name: "Redeploy" }));

    await screen.findByRole("link", { name: "https://fresh.dev.xano.io" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("drops the dead row first, or the redeploy returns it right back", async () => {
    /*
     * POST /redeploy is idempotent: with a row present it answers 200 carrying
     * the environment that is already there, having deployed nothing. On an
     * expired one that reads as a button that does nothing — which is exactly
     * what it did. Reset is what drops the row, and it must come first.
     */
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [
      {
        match: "/xano",
        status: 410,
        body: { code: "deploy_expired", message: "This deploy has expired." },
      },
    ];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));
    await screen.findByRole("alert");

    const fresh = { ...DEPLOYED.deploy!, siteUrl: "https://fresh.dev.xano.io" };
    routes = [
      { match: "/reset", status: 200, body: { ok: true } },
      { match: "/redeploy", status: 200, body: fresh },
      { match: "/api/staff/builds/K7QM2X", status: 200, body: { ...DEPLOYED, deploy: fresh } },
    ];
    calls = [];
    await user.click(screen.getByRole("button", { name: "Redeploy" }));
    await screen.findByRole("link", { name: "https://fresh.dev.xano.io" });

    const paths = calls.map((c) => c.url);
    expect(paths[0]).toContain("/reset");
    expect(paths[1]).toContain("/redeploy");
  });

  it("does not reset when deploying a build that has no environment", async () => {
    // Reset is destructive and this path has nothing to drop. It must stay a
    // single call — the guard only exists for the expiry.
    respond("/api/staff/builds/K7QM2X", BUILD);
    const user = await find();
    await screen.findByRole("button", { name: "Deploy it" });

    routes = [
      { match: "/redeploy", status: 200, body: DEPLOYED.deploy },
      { match: "/api/staff/builds/K7QM2X", status: 200, body: DEPLOYED },
    ];
    calls = [];
    await user.click(screen.getByRole("button", { name: "Deploy it" }));
    await screen.findByRole("link", { name: DEPLOYED.deploy!.siteUrl });

    expect(calls.some((c) => c.url.includes("/reset"))).toBe(false);
  });

  it("keeps counting on the redeploy button rather than unmounting it", async () => {
    // Clearing the error on the way in would take the button — and the running
    // count — out from under the finger that just pressed it.
    const opened = { location: { href: "" }, close: vi.fn(), opener: {} };
    vi.stubGlobal("open", vi.fn(() => opened));

    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Open the backend" });

    routes = [
      {
        match: "/xano",
        status: 410,
        body: { code: "deploy_expired", message: "This deploy has expired." },
      },
    ];
    await user.click(screen.getByRole("button", { name: "Open the backend" }));
    await screen.findByRole("alert");

    let release: (() => void) | undefined;
    const held = new Promise<void>((r) => (release = r));
    vi.stubGlobal("fetch", async () => {
      await held;
      return new Response(JSON.stringify(DEPLOYED.deploy), { status: 200 });
    });
    await user.click(screen.getByRole("button", { name: "Redeploy" }));

    expect(await screen.findByRole("button", { name: /Deploying/ })).toBeDisabled();
    release!();
  });

  it("offers no backend button when the deploy named no tenant", async () => {
    // There is no address to mint against; a button that always fails is
    // worse than no button.
    respond("/api/staff/builds/K7QM2X", {
      ...DEPLOYED,
      deploy: { siteUrl: "https://s.example", deployedAt: Date.now() },
    });
    await find();

    await screen.findByRole("link", { name: "https://s.example" });
    expect(screen.queryByRole("button", { name: "Open the backend" })).not.toBeInTheDocument();
  });
});

describe("resetting between visitors", () => {
  it("returns to an empty code box", async () => {
    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Reset" });

    routes = [{ match: "/reset", status: 200, body: { ok: true } }];
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(await screen.findByLabelText("Booth code")).toHaveValue("");
    expect(screen.queryByText("a portfolio site for a potter")).not.toBeInTheDocument();
  });

  it("asks for no confirmation", async () => {
    // Pressed dozens of times a day between visitors; a dialog would cost more
    // than the mistake it prevents, and the mistake is recoverable.
    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Reset" });

    routes = [{ match: "/reset", status: 200, body: { ok: true } }];
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByLabelText("Booth code");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears even when the teardown fails", async () => {
    // The next visitor must never see the last one's app, whatever Xano did.
    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Reset" });

    routes = [{ match: "/reset", status: 502, body: { code: "internal", message: "no" } }];
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(await screen.findByLabelText("Booth code")).toHaveValue("");
  });

  it("tells Hatch which build to tear down", async () => {
    respond("/api/staff/builds/K7QM2X", DEPLOYED);
    const user = await find();
    await screen.findByRole("button", { name: "Reset" });

    routes = [{ match: "/reset", status: 200, body: { ok: true } }];
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByLabelText("Booth code");

    expect(calls.at(-1)!.url).toContain("/api/staff/builds/K7QM2X/reset");
    expect(calls.at(-1)!.method).toBe("POST");
  });

  it("is offered from a loaded build with nothing deployed", async () => {
    // Staff press it between visitors without checking the state first.
    respond("/api/staff/builds/K7QM2X", BUILD);
    await find();
    expect(await screen.findByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("is not offered on the empty screen", async () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
  });
});
