import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface UseCountUpOptions {
  duration?: number
  decimals?: number
  enabled?: boolean
}

export function useCountUp(
  endValue: number,
  { duration = 600, decimals = 1, enabled = true }: UseCountUpOptions = {}
): number {
  const [displayValue, setDisplayValue] = useState(endValue)
  const prefersReducedMotion = useReducedMotion()
  const previousValue = useRef(endValue)
  const animationFrame = useRef<number>()

  useEffect(() => {
    if (prefersReducedMotion || !enabled) {
      setDisplayValue(endValue)
      previousValue.current = endValue
      return
    }

    const startValue = previousValue.current
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      const currentValue = startValue + (endValue - startValue) * eased
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        previousValue.current = endValue
      }
    }

    animationFrame.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [endValue, duration, prefersReducedMotion, enabled])

  return Number(displayValue.toFixed(decimals))
}
