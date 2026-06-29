import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand text-white",
        secondary: "border-transparent bg-surface-2 text-ink",
        outline: "text-ink border-line",
        pass: "border-transparent bg-pass-bg text-pass",
        fail: "border-transparent bg-fail-bg text-fail",
        warn: "border-transparent bg-warn-bg text-warn",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
