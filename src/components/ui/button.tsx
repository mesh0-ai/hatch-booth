import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.js";

/**
 * shadcn's button, in Xano's palette.
 *
 * Written here rather than pulled from a package because that is what shadcn
 * is — components are copied into the repo and owned, not depended on. The
 * conventions are kept (cva variants, a `data-slot`, `cn` merging) so anything
 * added later with the CLI lands beside code shaped the same way.
 *
 * `h-11` on every size: this is pressed with one hand while the other holds a
 * phone or a conversation, and 44px is the smallest target that reliably
 * survives that.
 */
const buttonVariants = cva(
  "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg " +
    "text-[14px] font-medium whitespace-nowrap transition-colors outline-none " +
    "focus-visible:ring-2 focus-visible:ring-deck-blue-hi focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-deck disabled:pointer-events-none disabled:opacity-55 " +
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The one solid blue control on any given screen, and there should
        // only ever be one — it is what "the next thing to do" looks like.
        default: "bg-deck-blue text-white hover:bg-deck-blue-hi",
        outline:
          "border border-deck-line text-deck-text-soft hover:border-deck-blue hover:text-deck-text",
        // Reset. Visually distinct from Redeploy on purpose: they sit next to
        // each other and are pressed dozens of times a day, one of which
        // destroys an environment.
        danger:
          "border border-deck-halt/45 text-deck-halt hover:border-deck-halt hover:bg-deck-halt/10",
        ghost: "text-deck-text-faint hover:text-deck-text",
      },
      size: { default: "px-5", sm: "px-3.5 text-[13px]", icon: "w-11 px-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
