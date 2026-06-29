import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBiggestMovers } from '@/data/store'
import { formatPercent, cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// Infer type from store function return
type BiggestMover = ReturnType<typeof getBiggestMovers>['risers'][number]

function MoverItem({ mover, index, type }: { mover: BiggestMover; index: number; type: 'riser' | 'faller' }) {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const isRiser = type === 'riser'

  return (
    <motion.button
      onClick={() => navigate(`/section/${mover.sectionId}`)}
      initial={prefersReducedMotion ? {} : { opacity: 0, x: isRiser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
        isRiser ? 'bg-pass-bg/50 hover:bg-pass-bg' : 'bg-fail-bg/50 hover:bg-fail-bg'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isRiser ? 'bg-pass/10' : 'bg-fail/10'
          )}
        >
          {isRiser ? (
            <TrendingUp className="h-4 w-4 text-pass" />
          ) : (
            <TrendingDown className="h-4 w-4 text-fail" />
          )}
        </div>
        <div className="text-left">
          <p className="font-medium text-ink">
            {mover.department.code} Section {mover.section.name}
          </p>
          <p className="text-xs text-muted">
            {formatPercent(mover.previousWeekAvg, 0)} → {formatPercent(mover.currentWeekAvg, 0)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          'font-mono text-sm font-semibold tabular-nums',
          isRiser ? 'text-pass' : 'text-fail'
        )}
      >
        {isRiser ? '+' : ''}
        {formatPercent(mover.delta, 1)}
      </span>
    </motion.button>
  )
}

export function BiggestMovers() {
  const { risers, fallers } = getBiggestMovers()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Biggest Movers</CardTitle>
        <p className="text-sm text-muted">Week-over-week attendance change</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="risers">
          <TabsList className="w-full">
            <TabsTrigger value="risers" className="flex-1 gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Risers
            </TabsTrigger>
            <TabsTrigger value="fallers" className="flex-1 gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Fallers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="risers" className="mt-3">
            {risers.length === 0 ? (
              <p className="text-center text-sm text-muted py-6">No significant risers this week</p>
            ) : (
              <div className="space-y-2">
                {risers.map((mover, index) => (
                  <MoverItem key={mover.sectionId} mover={mover} index={index} type="riser" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fallers" className="mt-3">
            {fallers.length === 0 ? (
              <p className="text-center text-sm text-muted py-6">No significant fallers this week</p>
            ) : (
              <div className="space-y-2">
                {fallers.map((mover, index) => (
                  <MoverItem key={mover.sectionId} mover={mover} index={index} type="faller" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
