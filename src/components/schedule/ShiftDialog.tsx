'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Trash2, Moon, CalendarOff, X } from 'lucide-react'
import type { EmployeeDTO, ShiftDTO, ShiftTemplateDTO } from '@/lib/types'
import { isOvernight, shiftMinutes } from '@/lib/date'

export interface ShiftDialogState {
  shift: ShiftDTO | null // null = создание новой
  employeeId: string
  date: string
}

interface ShiftDialogProps {
  open: boolean
  state: ShiftDialogState
  employees: EmployeeDTO[]
  onClose: () => void
  onSave: (data: {
    id?: string
    employeeId: string
    date: string
    startTime: string | null
    endTime: string | null
    note: string | null
  }) => Promise<boolean> // true — успех, диалог можно закрыть
  onDelete?: (shift: ShiftDTO) => Promise<boolean>
  // Пресеты смен (предлагаются только при создании новой смены)
  templates?: ShiftTemplateDTO[]
  onCreateTemplate?: (data: { startTime: string; endTime: string }) => void
  onDeleteTemplate?: (id: string) => void
}

export function ShiftDialog({
  open,
  state,
  employees,
  onClose,
  onSave,
  onDelete,
  templates,
  onCreateTemplate,
  onDeleteTemplate,
}: ShiftDialogProps) {
  // Диалог монтируется только при открытии, поэтому форму инициализируем лениво
  const [employeeId, setEmployeeId] = useState(() => state.shift?.employeeId ?? state.employeeId)
  const [date, setDate] = useState(() => state.shift?.date ?? state.date)
  const [startTime, setStartTime] = useState(() => state.shift?.startTime ?? '')
  const [endTime, setEndTime] = useState(() => state.shift?.endTime ?? '')
  const [note, setNote] = useState(() => state.shift?.note ?? '')
  const [saveAsPreset, setSaveAsPreset] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editing = Boolean(state.shift)
  const overnight = isOvernight(startTime || null, endTime || null)
  const minutes = shiftMinutes(startTime || null, endTime || null)
  const noTime = !startTime && !endTime

  const handleSave = async () => {
    if (!employeeId || !date) return
    setSaving(true)
    const ok = await onSave({
      id: state.shift?.id,
      employeeId,
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      note: note.trim() || null,
    })
    setSaving(false)
    if (ok) {
      // Галочка «Сохранить как пресет»: сохраняем промежуток, но не дублируем
      // уже существующий пресет (дубль отсекается и на сервере)
      if (
        !editing &&
        saveAsPreset &&
        startTime &&
        endTime &&
        !templates?.some((t) => t.startTime === startTime && t.endTime === endTime)
      ) {
        onCreateTemplate?.({ startTime, endTime })
      }
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!state.shift) return
    setDeleting(true)
    const ok = await onDelete?.(state.shift)
    setDeleting(false)
    if (ok) {
      setConfirmDelete(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Изменить смену' : 'Новая смена'}</DialogTitle>
          <DialogDescription>
            {noTime
              ? 'Время не указано — смена будет отмечена на весь день (дежурство).'
              : 'Укажите время начала и окончания. Если окончание раньше начала — смена переходит на следующий день.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="shift-employee">Сотрудник</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="shift-employee">
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                    {e.position ? ` · ${e.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="shift-date">Дата</Label>
            <Input
              id="shift-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="shift-start">Начало</Label>
              <Input
                id="shift-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shift-end">Окончание</Label>
              <Input
                id="shift-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {overnight && minutes && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Moon className="h-3.5 w-3.5" aria-hidden />
              Смена переходит на следующий день · {Math.floor(minutes / 60)} ч {minutes % 60} мин
            </p>
          )}
          {!overnight && minutes && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarOff className="h-3.5 w-3.5" aria-hidden />
              Длительность · {Math.floor(minutes / 60)} ч {minutes % 60} мин
            </p>
          )}

          {/* Пресеты — только при создании новой смены */}
          {!editing && templates && templates.length > 0 && (
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Пресеты смен</span>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <div key={t.id} className="inline-flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime(t.startTime)
                        setEndTime(t.endTime)
                      }}
                      title={`Подставить время ${t.startTime}–${t.endTime}`}
                      className="flex items-center gap-1 bg-muted/40 px-2 py-1 text-xs font-medium tabular-nums transition-colors hover:bg-accent"
                    >
                      {t.startTime}–{t.endTime}
                      {isOvernight(t.startTime, t.endTime) && (
                        <Moon
                          className="h-3 w-3 opacity-70"
                          aria-label="Смена переходит на следующий день"
                        />
                      )}
                    </button>
                    {onDeleteTemplate && (
                      <button
                        type="button"
                        onClick={() => onDeleteTemplate(t.id)}
                        aria-label={`Удалить пресет ${t.startTime}–${t.endTime}`}
                        title="Удалить пресет"
                        className="flex w-6 items-center justify-center border-l bg-muted/40 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Нажмите на пресет, чтобы подставить время.
              </p>
            </div>
          )}

          {/* Сохранение промежутка как пресета — только для новой смены */}
          {!editing && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-preset"
                checked={saveAsPreset}
                disabled={!startTime || !endTime}
                onCheckedChange={(v) => setSaveAsPreset(v === true)}
              />
              <Label
                htmlFor="save-preset"
                className="cursor-pointer text-xs font-normal text-muted-foreground"
              >
                Сохранить промежуток как пресет
              </Label>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="shift-note">Примечание</Label>
            <Input
              id="shift-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: обучение, замена, инвентаризация…"
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !employeeId || !date}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Сохранить
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить смену?</AlertDialogTitle>
            <AlertDialogDescription>
              Смена от {date} будет удалена без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
