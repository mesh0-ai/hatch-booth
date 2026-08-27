import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.js";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-lg border border-deck-line bg-deck-sunk px-3.5 text-[15px]",
        "text-deck-text placeholder:text-deck-text-faint outline-none transition-colors",
        "focus-visible:border-deck-blue focus-visible:ring-2 focus-visible:ring-deck-blue-soft",
        "disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
