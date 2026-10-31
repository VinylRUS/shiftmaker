'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import type { EmployeeDTO, ShiftDTO, AppMode } from '@/lib/types'
import { getPaletteColor } from '@/lib/palette'
import { formatDayHeader, isToday } from '@/lib/date'
import { cn } from '@/lib/utils'
import { ShiftChip } from './ShiftChip'

interface WeekTableProps {
  employees: EmployeeDTO[]
  days: string[]
  shifts: ShiftDTO[]
  mode: AppMode
  onCellClick: (employeeId: string, date: string) => void
  onShiftClick: (shift: ShiftDTO) => void
  suppressClickRef: React.MutableRefObject<boolean>
}

/** Ячейка «сотрудник × день» — приёмник при перетаскивании */
function DayCell({
  employeeId,
  employeeColor,
  date,
  shifts,
  mode,
  onCellClick,
  onShiftClick,
  suppressClickRef,
  weekend,
}: {
  employeeId: string
  employeeColor: string
  date: string
  shifts: ShiftDTO[]
  mode: AppMode
  onCellClick: (employeeId: string, date: string) => void
  onShiftClick: (shift: ShiftDTO) => void
  suppressClickRef: React.MutableRefObject<boolean>
  weekend: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell|${employeeId}|${date}` })
  const today = isToday(date)
  const admin = mode === 'admin'

  return (
    <td
      ref={setNodeRef}
      onClick={
        admin
          ? () => {
              if (suppressClickRef.current) return
              onCellClick(employeeId, date)
            }
          : undefined
      }
      className={cn(
        'group/cell relative min-w-[104px] cursor-default border-b border-r p-1 align-top transition-colors',
        weekend && !today && 'bg-muted/30',
        today && 'bg-primary/[0.04]',
        admin && 'cursor-copy hover:bg-accent/60',
        isOver && 'bg-accent ring-2 ring-inset ring-ring/50'
      )}
    >
      <div className="flex min-h-[52px] flex-col gap-1">
        {shifts.map((shift) => (
          <ShiftChip
            key={shift.id}
            shift={shift}
            colorKey={employeeColor}
            readOnly={!admin}
            onClick={onShiftClick}
            suppressClickRef={suppressClickRef}
          />
        ))}
        {admin && shifts.length === 0 && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover/cell:opacity-50">
            <Plus className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </td>
  )
}

/**
 * Главная таблица: строки — сотрудники, столбцы — дни недели (Пн..Вс).
 * Липкая шапка и липкая колонка с фамилиями, скролл в контейнере.
 */
export function WeekTable({
  employees,
  days,
  shifts,
  mode,
  onCellClick,
  onShiftClick,
  suppressClickRef,
}: WeekTableProps) {
  const admin = mode === 'admin'

  const shiftsByCell = new Map<string, ShiftDTO[]>()
  for (const shift of shifts) {
    const key = `${shift.employeeId}|${shift.date}`
    const list = shiftsByCell.get(key)
    if (list) list.push(shift)
    else shiftsByCell.set(key, [shift])
  }

  return (
    <div className="group max-h-[68vh] overflow-auto rounded-xl border bg-background">
      <table className="w-full min-w-[840px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-40 w-[200px] min-w-[200px] border-b border-r bg-background px-3 py-2 text-left text-xs font-medium text-muted-foreground"
            >
              Сотрудник
            </th>
            {days.map((day) => {
              const { weekday, day: dayNum, weekend } = formatDayHeader(day)
              const today = isToday(day)
              return (
                <th
                  key={day}
                  scope="col"
                  className={cn(
                    'sticky top-0 z-30 min-w-[104px] border-b border-r bg-background px-2 py-2 text-center font-medium',
                    weekend ? 'text-muted-foreground' : 'text-foreground',
                    today && 'bg-primary/[0.06] text-primary'
                  )}
                >
                  <span className="block text-[11px] uppercase tracking-wide">{weekday}</span>
                  <span className={cn('block text-base font-semibold tabular-nums', today && 'text-primary')}>
                    {dayNum}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const color = getPaletteColor(employee.color)
            return (
              <tr key={employee.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-20 w-[200px] min-w-[200px] border-b border-r bg-background px-3 py-2 text-left align-middle"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border"
                      style={{ backgroundColor: color.dot, borderColor: color.border }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-tight">{employee.name}</div>
                      {employee.position && (
                        <div className="truncate text-xs text-muted-foreground">{employee.position}</div>
                      )}
                    </div>
                  </div>
                </th>
                {days.map((day) => (
                  <DayCell
                    key={day}
                    employeeId={employee.id}
                    employeeColor={employee.color}
                    date={day}
                    shifts={shiftsByCell.get(`${employee.id}|${day}`) ?? []}
                    mode={mode}
                    onCellClick={onCellClick}
                    onShiftClick={onShiftClick}
                    suppressClickRef={suppressClickRef}
                    weekend={formatDayHeader(day).weekend}
                  />
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
