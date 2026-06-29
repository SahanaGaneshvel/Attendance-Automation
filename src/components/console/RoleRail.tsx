import { useAppStore } from '@/store/appStore'
import { DeanRail } from './rails/DeanRail'
import { HodRail } from './rails/HodRail'
import { TeacherRail } from './rails/TeacherRail'

export function RoleRail() {
  const { role } = useAppStore()

  switch (role) {
    case 'teacher':
      return <TeacherRail />
    case 'hod':
      return <HodRail />
    case 'dean':
    default:
      return <DeanRail />
  }
}
