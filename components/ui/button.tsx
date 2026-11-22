import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-300 outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,179,71,0.4),0_10px_40px_-10px_rgba(255,179,71,0.7)] hover:bg-[#FFC36E] hover:shadow-[0_0_0_1px_rgba(255,179,71,0.6),0_14px_50px_-10px_rgba(255,179,71,0.9)]",
        orbit:
          "border border-white/15 bg-white/[0.04] text-foreground backdrop-blur-md hover:border-sky-300/50 hover:bg-sky-400/10 hover:shadow-[0_0_30px_-6px_rgba(56,189,248,0.6)]",
        ghost: "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        link: "rounded-none px-0 text-foreground underline-offset-8 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-13 px-8 text-[15px]",
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
