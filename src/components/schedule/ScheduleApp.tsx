'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useTheme } from 'next-themes'
import { CalendarCog, Loader2, Moon, Sun, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useToast } from '@/hooks/use-toast'
import type { AppMode, EmployeeDTO, ShiftDTO } from '@/lib/types'
import { weekDays, shiftWeek, toISODate, weekStart as weekStartOf } from '@/lib/date'
import { Toolbar } from './Toolbar'
import { WeekTable } from './WeekTable'
import { ShiftDialog, type ShiftDialogState } from './ShiftDialog'
import { EmployeeManager } from './EmployeeManager'
import { ShiftChipContent } from './ShiftChip'

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    const body = res.ok ? ((await res.json()) as T) : undefined
    if (!res.ok) {
      const err = body as unknown as { error?: string } | undefined
      return { ok: false, error: err?.error ?? `Ошибка запроса (${res.status})` }
    }
    return { ok: true, data: body }
  } catch {
    return { ok: false, error: 'Нет связи с сервером' }
  }
}

const emptySubscribe = () => () => {}

/** Переключатель светлой/тёмной темы */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // Флаг «после гидратации»: на сервере false, на клиенте true — без рассинхрона
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  if (!mounted) return <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Переключить тему" />
  const dark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  )
}

export function ScheduleApp() {
  const { toast } = useToast()

  const [mode, setMode] = useState<AppMode>('admin')
  const [weekStart, setWeekStart] = useState(() => toISODate(weekStartOf(new Date())))
  const [employees, setEmployees] = useState<EmployeeDTO[]>([])
  const [shifts, setShifts] = useState<ShiftDTO[]>([])
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [shiftDialog, setShiftDialog] = useState<ShiftDialogState | null>(null)
  const [employeesOpen, setEmployeesOpen] = useState(false)
  const [confirmCopy, setConfirmCopy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const [activeShift, setActiveShift] = useState<ShiftDTO | null>(null)
  const justDraggedRef = useRef(false)

  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const weekEnd = days[6]

  // Менеджер сотрудников/фильтр (только просмотр)
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const visibleEmployees = useMemo(
    () => (mode === 'view' && employeeFilter !== 'all' ? employees.filter((e) => e.id === employeeFilter) : employees),
    [mode, employeeFilter, employees]
  )

  // Режим просмотра читаем из ?mode=view (ссылка для сотрудников).
  // Синхронизация с внешней системой (URL) после гидратации — намеренно.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get('mode') === 'view') setMode('view')
  }, [])

  const switchMode = (next: AppMode) => {
    setMode(next)
    const url = new URL(window.location.href)
    if (next === 'view') url.searchParams.set('mode', 'view')
    else url.searchParams.delete('mode')
    window.history.replaceState(null, '', url.toString())
  }

  // Первичная загрузка сотрудников
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { ok, data, error } = await api<EmployeeDTO[]>('/api/employees')
      if (cancelled) return
      if (ok && data) setEmployees(data)
      else if (error)
        toast({ title: 'Не удалось загрузить сотрудников', description: error, variant: 'destructive' })
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  // Загрузка смен текущей недели; loading вычисляем из loadedWeek — без синхронного setState в эффекте
  const loading = loadedWeek !== weekStart

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { ok, data, error } = await api<ShiftDTO[]>(`/api/shifts?from=${weekStart}&to=${weekEnd}`)
      if (cancelled) return
      if (ok && data) {
        setShifts(data)
        setLoadedWeek(weekStart)
      } else if (error) {
        setLoadedWeek(weekStart)
        toast({ title: 'Не удалось загрузить смены', description: error, variant: 'destructive' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [weekStart, weekEnd, toast])

  // ---------- Смены ----------

  const saveShift = async (data: {
    id?: string
    employeeId: string
    date: string
    startTime: string | null
    endTime: string | null
    note: string | null
  }): Promise<boolean> => {
    const payload = {
      employeeId: data.employeeId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      note: data.note,
    }
    if (data.id) {
      const { ok, data: updated, error } = await api<ShiftDTO>(`/api/shifts/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      if (ok && updated) {
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        toast({ title: 'Смена обновлена' })
        return true
      }
      toast({ title: 'Не удалось сохранить смену', description: error, variant: 'destructive' })
      return false
    }
    const { ok, data: created, error } = await api<ShiftDTO>('/api/shifts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (ok && created) {
      setShifts((prev) => [...prev, created])
      toast({ title: 'Смена добавлена' })
      return true
    }
    toast({ title: 'Не удалось добавить смену', description: error, variant: 'destructive' })
    return false
  }

  const deleteShift = async (shift: ShiftDTO): Promise<boolean> => {
    const { ok, error } = await api(`/api/shifts/${shift.id}`, { method: 'DELETE' })
    if (ok) {
      setShifts((prev) => prev.filter((s) => s.id !== shift.id))
      toast({ title: 'Смена удалена' })
      return true
    }
    toast({ title: 'Не удалось удалить смену', description: error, variant: 'destructive' })
    return false
  }

  const moveShift = async (shift: ShiftDTO, employeeId: string, date: string) => {
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, employeeId, date } : s)))
    const { ok, data, error } = await api<ShiftDTO>(`/api/shifts/${shift.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ employeeId, date }),
    })
    if (ok && data) {
      setShifts((prev) => prev.map((s) => (s.id === data.id ? data : s)))
      toast({ title: 'Смена перенесена' })
    } else {
      setShifts((prev) =>
        prev.map((s) => (s.id === shift.id ? { ...s, employeeId: shift.employeeId, date: shift.date } : s))
      )
      toast({ title: 'Не удалось перенести смену', description: error, variant: 'destructive' })
    }
  }

  // ---------- Сотрудники ----------

  const createEmployee = async (data: { name: string; position: string | null; color: string }) => {
    const { ok, data: created, error } = await api<EmployeeDTO>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (ok && created) {
      setEmployees((prev) => [...prev, created])
      toast({ title: 'Сотрудник добавлен', description: data.name })
      return true
    }
    toast({ title: 'Не удалось добавить сотрудника', description: error, variant: 'destructive' })
    return false
  }

  const updateEmployee = async (id: string, data: { name: string; position: string | null; color: string }) => {
    const { ok, data: updated, error } = await api<EmployeeDTO>(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    if (ok && updated) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)))
      toast({ title: 'Сотрудник обновлён' })
      return true
    }
    toast({ title: 'Не удалось обновить сотрудника', description: error, variant: 'destructive' })
    return false
  }

  const deleteEmployee = async (id: string) => {
    const { ok, error } = await api(`/api/employees/${id}`, { method: 'DELETE' })
    if (ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      setShifts((prev) => prev.filter((s) => s.employeeId !== id))
      toast({ title: 'Сотрудник удалён' })
      return true
    }
    toast({ title: 'Не удалось удалить сотрудника', description: error, variant: 'destructive' })
    return false
  }

  // ---------- Массовые операции ----------

  const copyPrevWeek = async () => {
    setBusy(true)
    const sourceFrom = shiftWeek(weekStart, -1)
    const { ok, data, error } = await api<{ copied: number }>('/api/shifts/copy', {
      method: 'POST',
      body: JSON.stringify({ sourceFrom, targetFrom: weekStart }),
    })
    setBusy(false)
    setConfirmCopy(false)
    if (ok) {
      // Перечитываем смены недели после копирования
      const { ok: okReload, data: fresh, error: errReload } = await api<ShiftDTO[]>(
        `/api/shifts?from=${weekStart}&to=${weekEnd}`
      )
      if (okReload && fresh) setShifts(fresh)
      else if (errReload)
        toast({ title: 'Не удалось обновить неделю', description: errReload, variant: 'destructive' })
      toast({ title: 'Неделя скопирована', description: `Перенесено смен: ${data?.copied ?? 0}` })
    } else {
      toast({ title: 'Не удалось скопировать неделю', description: error, variant: 'destructive' })
    }
  }

  const clearWeek = async () => {
    setBusy(true)
    const { ok, data, error } = await api<{ deleted: number }>(
      `/api/shifts?from=${weekStart}&to=${weekEnd}`,
      { method: 'DELETE' }
    )
    setBusy(false)
    setConfirmClear(false)
    if (ok) {
      setShifts([])
      toast({ title: 'Неделя очищена', description: `Удалено смен: ${data?.deleted ?? 0}` })
    } else {
      toast({ title: 'Не удалось очистить неделю', description: error, variant: 'destructive' })
    }
  }

  // ---------- Drag & Drop ----------

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const onDragStart = (event: DragStartEvent) => {
    const shift = shifts.find((s) => s.id === event.active.id)
    setActiveShift(shift ?? null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveShift(null)
    if (!over) return
    const shift = shifts.find((s) => s.id === active.id)
    if (!shift) return
    const overId = String(over.id)
    if (!overId.startsWith('cell|')) return
    const [, employeeId, date] = overId.split('|')
    if (employeeId === shift.employeeId && date === shift.date) return

    justDraggedRef.current = true
    window.setTimeout(() => {
      justDraggedRef.current = false
    }, 120)

    void moveShift(shift, employeeId, date)
  }

  const activeEmployee = employees.find((e) => e.id === activeShift?.employeeId)
  const admin = mode === 'admin'

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Шапка */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCog className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">График смен</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Планировщик расписания сотрудников
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={mode} onValueChange={(v) => switchMode(v as AppMode)}>
              <TabsList aria-label="Режим работы">
                <TabsTrigger value="admin">Редактор</TabsTrigger>
                <TabsTrigger value="view">Просмотр</TabsTrigger>
              </TabsList>
            </Tabs>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Основной блок */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Toolbar
          mode={mode}
          weekStart={weekStart}
          busy={busy}
          onPrevWeek={() => setWeekStart((w) => shiftWeek(w, -1))}
          onNextWeek={() => setWeekStart((w) => shiftWeek(w, 1))}
          onToday={() => setWeekStart(toISODate(weekStartOf(new Date())))}
          onCopyPrevWeek={() => setConfirmCopy(true)}
          onClearWeek={() => setConfirmClear(true)}
          onOpenEmployees={() => setEmployeesOpen(true)}
          employeeFilter={employeeFilter}
          onEmployeeFilter={setEmployeeFilter}
          employees={employees}
        />

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed py-20 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              Загружаем расписание…
            </div>
          ) : employees.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Пока нет ни одного сотрудника. Добавьте первого — и появится таблица расписания.
                </p>
                {admin && (
                  <Button type="button" onClick={() => setEmployeesOpen(true)} className="gap-1.5">
                    <Users className="h-4 w-4" aria-hidden />
                    Добавить сотрудника
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <WeekTable
                employees={visibleEmployees}
                days={days}
                shifts={shifts}
                mode={mode}
                onCellClick={(employeeId, date) => setShiftDialog({ shift: null, employeeId, date })}
                onShiftClick={(shift) => setShiftDialog({ shift, employeeId: shift.employeeId, date: shift.date })}
                suppressClickRef={justDraggedRef}
              />
              <DragOverlay>
                {activeShift && activeEmployee ? (
                  <div className="w-32">
                    <ShiftChipContent shift={activeShift} colorKey={activeEmployee.color} admin overlay />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {!admin && !loading && employees.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Это версия для сотрудников: расписание доступно только для чтения. Наведите курсор на
            смену, чтобы увидеть примечание.
          </p>
        )}
      </main>

      {/* Подвал */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 text-xs text-muted-foreground">
          {admin
            ? 'Перетаскивайте смены мышью или пальцем, чтобы переносить их между днями и сотрудниками. Клик по пустой ячейке — новая смена, клик по плашке — редактирование.'
            : 'Режим просмотра · расписание только для чтения.'}
        </div>
      </footer>

      {/* Диалоги */}
      {shiftDialog && (
        <ShiftDialog
          open
          state={shiftDialog}
          employees={employees}
          onClose={() => setShiftDialog(null)}
          onSave={saveShift}
          onDelete={deleteShift}
        />
      )}

      {/* key обеспечивает сброс формы менеджера при каждом открытии */}
      <EmployeeManager
        key={employeesOpen ? 'employees-open' : 'employees-closed'}
        open={employeesOpen}
        employees={employees}
        onClose={() => setEmployeesOpen(false)}
        onCreate={createEmployee}
        onUpdate={updateEmployee}
        onDelete={deleteEmployee}
      />

      <AlertDialog open={confirmCopy} onOpenChange={setConfirmCopy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Скопировать прошлую неделю?</AlertDialogTitle>
            <AlertDialogDescription>
              Смены предыдущей недели будут перенесены на текущую. Существующие смены текущей недели
              будут заменены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void copyPrevWeek() }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Скопировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить текущую неделю?</AlertDialogTitle>
            <AlertDialogDescription>
              Все смены видимой недели будут удалены. Сотрудники останутся без изменений.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); void clearWeek() }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
