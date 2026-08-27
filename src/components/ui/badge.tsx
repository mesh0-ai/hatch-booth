import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-deck-mono " +
    "text-[10px] tracking-[0.12em] uppercase",
  {
    variants: {
      variant: {
        // Green means finished, never "the current thing" — the accent owns
        // here-and-now, which is the rule every Hatch skin already holds.
        live: "bg-deck-live/12 text-deck-live",
        halt: "bg-deck-halt/12 text-deck-halt",
        muted: "bg-deck-line-soft text-deck-text-faint",
        info: "bg-deck-blue-soft text-deck-blue-hi",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
