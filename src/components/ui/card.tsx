import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.js";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-xl border border-deck-line bg-deck-raise", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-center justify-between gap-3 border-b border-deck-line px-4 py-2.5", className)}
      {...props}
    />
  );
}

/** The small mono label that titles every panel in this palette. */
export function CardLabel({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="card-label"
      className={cn(
        "font-deck-mono text-[10px] tracking-[0.16em] text-deck-text-faint uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-body" className={cn("px-4 py-3.5", className)} {...props} />;
}
