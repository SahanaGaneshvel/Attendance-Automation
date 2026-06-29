import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SessionStatus } from '@/data/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export function isPassingThreshold(percentage: number, threshold: number = 75): boolean {
  return percentage >= threshold
}

export function getThresholdColor(percentage: number, threshold: number = 75): 'pass' | 'fail' {
  return percentage >= threshold ? 'pass' : 'fail'
}

// Session status determines how a cell renders:
// - recorded: normal pass/fail coloring based on threshold
// - no_session: neutral/grey, never red, excluded from averages
// - pending: neutral/grey, shows as "not reported"
export function getSessionStatusColor(
  status: SessionStatus,
  percentage: number,
  threshold: number = 75
): 'pass' | 'fail' | 'neutral' {
  if (status !== 'recorded') return 'neutral'
  return percentage >= threshold ? 'pass' : 'fail'
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
