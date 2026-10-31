// Помощники для работы с датами. Неделя начинается с понедельника (русская конвенция).
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'

const pad = (n: number) => String(n).padStart(2, '0')

/** Дата в формате YYYY-MM-DD без таймзонных сдвигов */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Безопасный парсинг YYYY-MM-DD (полдень, чтобы исключить сдвиги DST) */
export function fromISODate(iso: string): Date {
  const d = parseISO(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
}

/** Понедельник недели, содержащей дату */
export function weekStart(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

/** 7 дат недели (Пн..Вс) в формате YYYY-MM-DD */
export function weekDays(weekStartIso: string): string[] {
  const start = fromISODate(weekStartIso)
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)))
}

export function shiftWeek(weekStartIso: string, weeks: number): string {
  return toISODate(addWeeks(fromISODate(weekStartIso), weeks))
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** «27 октября – 2 ноября 2026 г.» — подпись диапазона недели */
export function formatWeekRange(weekStartIso: string): string {
  const start = fromISODate(weekStartIso)
  const end = addDays(start, 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const startFmt = format(start, 'd MMMM', { locale: ru })
  const endFmt = sameMonth
    ? format(end, 'd', { locale: ru })
    : format(end, 'd MMMM', { locale: ru })
  return `${startFmt} – ${endFmt} ${format(end, 'yyyy')} г.`
}

/** Короткая подпись дня для шапки таблицы: «Пн 27» */
export function formatDayHeader(iso: string): { weekday: string; day: string; weekend: boolean } {
  const d = fromISODate(iso)
  const weekday = format(d, 'EEEEEE', { locale: ru }) // пн, вт...
  return {
    weekday: weekday.toUpperCase(),
    day: format(d, 'd'),
    weekend: d.getDay() === 0 || d.getDay() === 6,
  }
}

/** «27 октября» и т.п. */
export function formatDayLong(iso: string): string {
  return format(fromISODate(iso), 'd MMMM', { locale: ru })
}

export function isToday(iso: string): boolean {
  return isSameDay(fromISODate(iso), new Date())
}

/** Смена переходит на следующий день, если конец <= началу */
export function isOvernight(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false
  return endTime <= startTime
}

/** Длительность смены в минутах (с учётом перехода через полночь), либо null */
export function shiftMinutes(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return mins
}
