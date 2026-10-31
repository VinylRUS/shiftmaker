'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, CalendarDays, Copy, Trash2, Users } from 'lucide-react'
import type { AppMode, EmployeeDTO } from '@/lib/types'
import { formatWeekRange } from '@/lib/date'

interface ToolbarProps {
  mode: AppMode
  weekStart: string
  busy?: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onCopyPrevWeek: () => void
  onClearWeek: () => void
  onOpenEmployees: () => void
  // Фильтр по сотруднику (только режим просмотра)
  employeeFilter: string
  onEmployeeFilter: (id: string) => void
  employees: EmployeeDTO[]
}

export function Toolbar({
  mode,
  weekStart,
  busy,
  onPrevWeek,
  onNextWeek,
  onToday,
  onCopyPrevWeek,
  onClearWeek,
  onOpenEmployees,
  employeeFilter,
  onEmployeeFilter,
  employees,
}: ToolbarProps) {
  const admin = mode === 'admin'

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Навигация по неделям */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onPrevWeek}
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onNextWeek}
            aria-label="Следующая неделя"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onToday} className="gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden />
          Сегодня
        </Button>
        <span className="ml-1 text-sm font-medium tabular-nums text-foreground/80 first-letter:uppercase">
          {formatWeekRange(weekStart)}
        </span>
      </div>

      {/* Действия */}
      <div className="flex flex-wrap items-center gap-2">
        {admin ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopyPrevWeek}
              disabled={busy}
              className="gap-1.5"
              title="Скопировать смены прошлой недели на текущую"
            >
              <Copy className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Копировать прошлую неделю</span>
              <span className="sm:hidden">Копировать</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearWeek}
              disabled={busy}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Удалить все смены текущей недели"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Очистить неделю</span>
              <span className="sm:hidden">Очистить</span>
            </Button>
            <Button type="button" size="sm" onClick={onOpenEmployees} className="gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              Сотрудники
            </Button>
          </>
        ) : (
          employees.length > 0 && (
            <Select value={employeeFilter} onValueChange={onEmployeeFilter}>
              <SelectTrigger className="w-[220px]" aria-label="Фильтр по сотруднику">
                <SelectValue placeholder="Все сотрудники" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сотрудники</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        )}
      </div>
    </div>
  )
}
