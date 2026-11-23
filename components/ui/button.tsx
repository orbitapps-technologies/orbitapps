import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-white text-[#03050D] shadow-[0_10px_34px_-10px_rgba(255,255,255,0.45)] hover:bg-white/90 hover:shadow-[0_14px_40px_-10px_rgba(167,139,250,0.7)]",
        gradient:
          "bg-brand-gradient text-white shadow-[0_12px_30px_-10px_rgba(109,74,255,0.6)] hover:brightness-110",
        outline: "border border-white/15 bg-white/[0.04] text-ink backdrop-blur hover:border-white/30 hover:bg-white/[0.08]",
        light: "bg-white text-navy hover:bg-white/90 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]",
        ghost: "text-ink-soft hover:bg-white/[0.06] hover:text-ink",
        link: "rounded-none px-0 text-ink underline-offset-[6px] hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
