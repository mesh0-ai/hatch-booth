import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The screen that exists because Hatch cannot tell staff what is wrong.
 *
 * A missing token and an unknown code both answer 404 over there, on purpose,
 * so probing cannot confirm the staff surface exists. This side knows whether
 * the bundle was given a token at all, and it is the only side that does.
 */

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.unstubAllEnvs();
});

async function appWith(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  const { App } = await import("../src/App.js");
  return App;
}

describe("when the bundle has no token", () => {
  it("says it is not configured rather than showing a code box", async () => {
    const App = await appWith({ VITE_HATCH_STAFF_TOKEN: "" });
    render(<App />);

    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.queryByLabelText("Booth code")).not.toBeInTheDocument();
  });

  it("says which file to edit, and that a restart is needed", async () => {
    // Vite inlines these at build time, so a running dev server will not pick
    // up a .env somebody just wrote — which is the actual mistake.
    const App = await appWith({ VITE_HATCH_STAFF_TOKEN: "" });
    render(<App />);

    expect(screen.getByText(/\.env\.example/)).toBeInTheDocument();
    expect(screen.getByText(/restart/)).toBeInTheDocument();
  });

  it("says the same when the URL is missing", async () => {
    const App = await appWith({ VITE_HATCH_URL: "" });
    render(<App />);
    expect(screen.getByText("Not configured")).toBeInTheDocument();
  });

  it("never renders the token, even when it has one", async () => {
    const App = await appWith({ VITE_HATCH_STAFF_TOKEN: "secret-token-value-aaaaaaaaaaaaaa" });
    const { container } = render(<App />);
    expect(container.textContent).not.toContain("secret-token-value");
  });
});
