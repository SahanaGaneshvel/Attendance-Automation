import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { getDepartmentById, getSectionById } from '@/data/store'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface BreadcrumbProps {
  departmentId?: string
  sectionId?: string
}

export function Breadcrumb({ departmentId, sectionId }: BreadcrumbProps) {
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()

  const department = departmentId ? getDepartmentById(departmentId) : null
  const section = sectionId ? getSectionById(sectionId) : null

  const crumbs: { label: string; href: string; current: boolean }[] = [
    { label: 'College', href: '/', current: location.pathname === '/' },
  ]

  if (department) {
    crumbs.push({
      label: department.code,
      href: `/department/${department.id}`,
      current: location.pathname === `/department/${department.id}` && !sectionId,
    })
  }

  if (section && department) {
    crumbs.push({
      label: `Section ${section.name}`,
      href: `/section/${section.id}`,
      current: true,
    })
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <motion.div
          key={crumb.href}
          className="flex items-center gap-1"
          initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted" />}
          {index === 0 && <Home className="mr-1 h-4 w-4 text-muted" />}
          {crumb.current ? (
            <span className="font-medium text-ink">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.href}
              className="text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded px-1"
            >
              {crumb.label}
            </Link>
          )}
        </motion.div>
      ))}
    </nav>
  )
}
