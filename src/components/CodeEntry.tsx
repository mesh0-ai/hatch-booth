import { useState, type FormEvent } from "react";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { cleanCodeInput } from "../lib/format.js";

/**
 * The code box, which is the whole of the idle screen.
 *
 * Typed while talking to somebody, from a code that arrived over SMS as
 * `K7Q-M2X` and is often read aloud rather than shown. So the field strips
 * everything outside the alphabet as it goes and uppercases the rest: a staff
 * member should never be looking at the field to know it is right.
 *
 * Submits on Enter, autofocused, and `autoComplete="off"` — a browser offering
 * the last visitor's code under this field would be a real hazard at a booth.
 */
export function CodeEntry({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (code: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (code.length > 0 && !pending) onSubmit(code);
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[420px] text-center">
      <h1 className="text-[22px] font-bold tracking-[-0.01em]">Booth code</h1>
      <p className="mt-1.5 text-[13.5px] text-deck-text-soft">
        From the visitor&rsquo;s text. The long code from their link works too.
      </p>

      <div className="mt-5 flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(cleanCodeInput(e.target.value))}
          placeholder="K7QM2X"
          aria-label="Booth code"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="text-center font-deck-mono text-[20px] tracking-[0.28em] uppercase"
        />
        <Button type="submit" disabled={code.length === 0 || pending}>
          {pending ? "Finding" : "Find"}
        </Button>
      </div>

      {error !== null && (
        <p role="alert" className="mt-3 text-[13px] text-deck-halt">
          {error}
        </p>
      )}
    </form>
  );
}
