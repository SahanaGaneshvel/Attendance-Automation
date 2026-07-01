/**
 * Motion System — Purposeful animations for the Attendance Console
 *
 * Principles:
 * - Nothing may delay reading a number > ~400ms
 * - No ambient loops or scroll-triggered effects behind data
 * - Respect prefers-reduced-motion
 * - Motion is always tied to a change/transition/hierarchy
 */

import { Variants, Transition } from 'motion/react'

// ============================================
// TIMING CONSTANTS
// ============================================

export const TIMING = {
  // Fast - for micro-interactions
  fast: 0.12,
  // Standard - for most transitions
  standard: 0.2,
  // Emphasized - for drill-down morphs
  emphasized: 0.28,
  // Count-up duration
  countUp: 0.5,
  // Stagger delay between items
  stagger: 0.025,
  // Ripple delay per cell
  ripple: 0.015,
} as const

// ============================================
// SPRING CONFIGS
// ============================================

export const SPRING = {
  // Snappy - for hovers, micro-interactions
  snappy: { type: 'spring', stiffness: 500, damping: 30 } as Transition,
  // Smooth - for panel transitions
  smooth: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  // Morph - for drill-down animations (the signature)
  morph: { type: 'spring', stiffness: 350, damping: 35, mass: 0.8 } as Transition,
  // Gentle - for tree expansions
  gentle: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
} as const

// ============================================
// PANEL ENTRANCE VARIANTS
// ============================================

export const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.smooth,
  },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: TIMING.stagger * 4,
      delayChildren: 0.05,
    },
  },
}

// ============================================
// TREE NODE VARIANTS
// ============================================

export const treeNodeVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: SPRING.gentle,
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: SPRING.gentle,
  },
}

export const treeChildrenVariants: Variants = {
  collapsed: { opacity: 0 },
  expanded: {
    opacity: 1,
    transition: {
      staggerChildren: TIMING.stagger,
      delayChildren: 0.02,
    },
  },
}

export const treeChildVariants: Variants = {
  collapsed: {
    opacity: 0,
    x: -8,
  },
  expanded: {
    opacity: 1,
    x: 0,
    transition: SPRING.gentle,
  },
}

// ============================================
// RAIL COLLAPSE VARIANTS
// ============================================

export const railVariants: Variants = {
  expanded: {
    width: 248,
    transition: SPRING.smooth,
  },
  collapsed: {
    width: 64,
    transition: SPRING.smooth,
  },
}

// ============================================
// MATRIX/HEATMAP VARIANTS
// ============================================

export const matrixCellVariants: Variants = {
  initial: {
    scale: 0.85,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: SPRING.snappy,
  },
  hover: {
    y: -2,
    boxShadow: 'var(--panel-shadow-lg)',
    transition: { duration: TIMING.fast },
  },
}

// Ripple recolor - returns delay based on position
export function getRippleDelay(row: number, col: number): number {
  // Diagonal ripple from top-left
  return (row + col) * TIMING.ripple
}

// ============================================
// BAR/CHART VARIANTS
// ============================================

export const barVariants: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: {
    scaleX: 1,
    transition: { ...SPRING.smooth, delay: 0.1 },
  },
}

export const pathDrawVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.8, ease: 'easeOut' },
      opacity: { duration: 0.2 },
    },
  },
}

// ============================================
// STREAK STRIP VARIANTS
// ============================================

export const streakContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
    },
  },
}

export const streakDayVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: SPRING.snappy,
  },
}

// ============================================
// ALERT VARIANTS
// ============================================

export const alertVariants: Variants = {
  initial: {
    opacity: 0,
    height: 0,
    y: -8,
  },
  animate: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: SPRING.smooth,
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: TIMING.standard },
  },
}

// ============================================
// CHIP VARIANTS (for absent roll entry)
// ============================================

export const chipVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: SPRING.snappy,
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: TIMING.fast },
  },
}

// ============================================
// MICRO-INTERACTIONS
// ============================================

export const cardHoverVariants: Variants = {
  rest: {
    y: 0,
    boxShadow: 'var(--panel-shadow)',
  },
  hover: {
    y: -2,
    boxShadow: 'var(--panel-shadow-lg)',
    transition: { duration: TIMING.fast },
  },
}

export const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  pressed: {
    scale: 0.97,
    transition: { duration: 0.1 },
  },
}

// ============================================
// CROSSHAIR HIGHLIGHT
// ============================================

export const crosshairRowVariants: Variants = {
  inactive: {
    backgroundColor: 'transparent',
  },
  active: {
    backgroundColor: 'var(--accent-soft)',
    transition: { duration: TIMING.fast },
  },
}

// ============================================
// REDUCED MOTION HELPER
// ============================================

export function getReducedMotionVariants<T extends Variants>(variants: T): T {
  // Returns instant versions of variants for reduced-motion preference
  const reduced = {} as T
  for (const key in variants) {
    const variant = variants[key]
    if (typeof variant === 'object' && variant !== null) {
      reduced[key] = {
        ...variant,
        transition: { duration: 0 },
      } as typeof variant
    } else {
      reduced[key] = variant
    }
  }
  return reduced
}
