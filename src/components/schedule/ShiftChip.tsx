'use client'

import { useDraggable } from '@dnd-kit/core'
import { useTheme } from 'next-themes'
import { GripVertical, Moon } from 'lucide-react'
import type { ShiftDTO } from '@/lib/types'
import { getPaletteColor } from '@/lib/palette'
import { isOvernight } from '@/lib/date'
import { cn } from '@/lib/utils'

interface ChipContentProps {
  shift: ShiftDTO
  colorKey: string
  admin: boolean
  overlay?: boolean
  onClick?: (shift: ShiftDTO) => void
  suppressClickRef?: React.MutableRefObject<boolean>
}

/** Чистая визуальная часть плашки (без хуков dnd — безопасна для DragOverlay) */
export function ShiftChipContent({ shift, colorKey, admin, overlay, onClick, suppressClickRef }: ChipContentProps) {
  const { resolvedTheme } = useTheme()
  const color = getPaletteColor(colorKey)

  const overnight = isOvernight(shift.startTime, shift.endTime)
  const timeLabel = shift.startTime && shift.endTime ? `${shift.startTime}–${shift.endTime}` : null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (suppressClickRef?.current) return
    onClick?.(shift)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      if (suppressClickRef?.current) return
      onClick?.(shift)
    }
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !overlay ? 0 : undefined}
      aria-label={`Смена ${shift.date}${timeLabel ? `, ${timeLabel}` : ', без времени'}${shift.note ? `, ${shift.note}` : ''}`}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      title={shift.note ?? undefined}
      className={cn(
        'group/chip relative flex w-full touch-none select-none items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs font-medium leading-tight',
        onClick && 'cursor-pointer transition-shadow',
        overlay && 'rotate-2 cursor-grabbing shadow-xl ring-2 ring-ring/40'
      )}
      style={{
        backgroundColor: resolvedTheme === 'dark' ? color.bgDark : color.bg,
        color: resolvedTheme === 'dark' ? color.textDark : color.text,
        borderColor: resolvedTheme === 'dark' ? color.bgDark : color.border,
      }}
    >
      {admin && !overlay && (
        <GripVertical
          className="h-3 w-3 shrink-0 opacity-40 transition-opacity group-hover/chip:opacity-80"
          aria-hidden
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {timeLabel ? (
          <span className="tabular-nums tracking-tight">{timeLabel}</span>
        ) : (
          <span>Дежурство</span>
        )}
        {shift.note && <span className="truncate text-[11px] font-normal opacity-80">{shift.note}</span>}
      </span>
      {overnight && (
        <Moon className="h-3 w-3 shrink-0 opacity-70" aria-label="Смена переходит на следующий день" />
      )}
    </div>
  )
}

interface ShiftChipProps {
  shift: ShiftDTO
  colorKey: string
  readOnly: boolean
  onClick?: (shift: ShiftDTO) => void
  suppressClickRef?: React.MutableRefObject<boolean>
}

/** Плашка смены в ячейке: в режиме редактора перетаскивается (dnd-kit) */
export function ShiftChip({ shift, colorKey, readOnly, onClick, suppressClickRef }: ShiftChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
    disabled: readOnly,
  })

  if (readOnly) {
    return <ShiftChipContent shift={shift} colorKey={colorKey} admin={false} />
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (suppressClickRef?.current) return
    onClick?.(shift)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      if (suppressClickRef?.current) return
      onClick?.(shift)
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn('cursor-pointer touch-none', isDragging && 'opacity-40')}
    >
      <ShiftChipContent shift={shift} colorKey={colorKey} admin />
    </div>
  )
}
