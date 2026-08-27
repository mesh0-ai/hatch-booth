# hatch-booth

The staff dashboard for the Hatch booth at **AI TechWorld 2026, Booth 606**.

A visitor texts the Twilio number, walks away with a built app, and comes to
the booth. This is what staff use when they get there: type the short code from
the visitor's text, see what was built and how fast, and put that exact app
back on the air to demo it.

> The Hatch side of this — the booth code, the source archive, the off-pool
> deployer, the staff API — is documented in the `hatch` repo at
> **`docs/booth.md`**. Read that first if anything here looks arbitrary.

## Running it

```sh
npm install
cp .env.example .env    # fill both values in
npm run dev             # http://localhost:5174
```

```
VITE_HATCH_URL=https://hatch.mesh0.ai
VITE_HATCH_STAFF_TOKEN=<must match HATCH_STAFF_TOKEN on that deployment>
```

Vite reads these **at build time**, so a `.env` written while the dev server is
running will not be picked up — restart it. If either is missing the app says
so on its own screen rather than letting every lookup fail as "no such code".

## Do not host this

`VITE_HATCH_STAFF_TOKEN` is **inlined into the bundle**. On a public origin
that is a published token, and this token is the whole of the authentication —
it reads any build, mints Xano impersonation tokens, and starts deploys.

So it runs from a clone on the booth laptop, and nowhere else. Not Vercel, not
Netlify, not a preview URL. Revoking is redeploying Hatch with a new value.

## What it does

| | |
| --- | --- |
| **Find** | Resolves the six-character booth code from the visitor's text. The twelve-character code from their link works too — that is the recovery path when the short one has been misheard across a hall. |
| **Deploy it** | Deploys the build's saved source into a fresh ephemeral environment. About a minute. The site and a read-only way into its Xano backend come back. |
| **Reset** | Tears the environment down and returns to an empty box. No confirmation — it is pressed between visitors and has to be instant. |

The code box uppercases and strips as you type, so the dashed form
(`K7Q-M2X`), a lowercase reading, and stray spaces all work. Hatch runs the
same normalisation server-side, so a paste that dodges the field still resolves.

## Two things worth knowing before changing code

**`src/lib/types.ts` is a hand-written copy.** It mirrors `StaffBuild`,
`StaffDeploy`, and `StaffHandoff` from the hatch repo's `shared/contracts.ts`,
and nothing typechecks the two against each other — this repo does not depend
on that one. Adding a field over there is safe; **renaming or removing one
silently breaks this app**, and nothing catches it until a staff member does.
The `xano-cli` repo has the same arrangement with the activity contract.

**The backend window is opened synchronously.** `POST …/xano` returns a URL
rather than redirecting, because a cross-origin navigation cannot carry the
bearer header. The token inside that URL lives 60 seconds and is spent on first
use, so it cannot be rendered as a link — and a popup opened from an async
continuation is the one browsers block. `App.tsx` opens a blank window inside
the click handler and points it at the URL when it arrives. Do not "simplify"
that into an await-then-open.

## Design

React 19, Vite, Tailwind v4, and shadcn/ui components — which are copied into
`src/components/ui/` and owned here, as shadcn intends, rather than depended on.

The palette in `src/index.css` is Xano's own, copied from the hatch repo's
`frontend/src/index.css`. Copied rather than shared on purpose: a dependency
between two repos to carry a dozen colours would be worse than the duplication.
That file stays the source of truth — if a value moves there, move it here by
hand. The comments explaining *why* there are two blues rather than one came
along with the values, and are worth keeping.

## Tests

```sh
npm test
npm run typecheck
```

The suite stubs `fetch` and asserts behaviour, not markup. The two cases that
matter most are the popup rule above and Reset clearing the screen whether or
not the teardown succeeded — the next visitor must never see the last one's app.
