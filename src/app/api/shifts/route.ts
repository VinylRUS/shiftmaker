import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasEditAccess, unauthorized } from '@/lib/access'

export const dynamic = 'force-dynamic'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате ЧЧ:ММ')

const shiftSchema = z.object({
  employeeId: z.string().min(1),
  date: isoDate,
  startTime: time.nullable().optional(),
  endTime: time.nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
})

// Смены за диапазон дат (включительно): ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'Нужны параметры from и to (ГГГГ-ММ-ДД)' }, { status: 400 })
  }

  const shifts = await db.shift.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
  return NextResponse.json(shifts)
}

// Создать смену (требуется вход по коду)
export async function POST(request: Request) {
  if (!(await hasEditAccess())) return unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = shiftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 })
  }

  const employee = await db.employee.findUnique({ where: { id: parsed.data.employeeId } })
  if (!employee) {
    return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 400 })
  }

  const shift = await db.shift.create({
    data: {
      employeeId: parsed.data.employeeId,
      date: parsed.data.date,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      note: parsed.data.note || null,
    },
  })
  return NextResponse.json(shift, { status: 201 })
}

// Очистить диапазон дат: ?from=YYYY-MM-DD&to=YYYY-MM-DD (требуется вход по коду)
export async function DELETE(request: Request) {
  if (!(await hasEditAccess())) return unauthorized()

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'Нужны параметры from и to (ГГГГ-ММ-ДД)' }, { status: 400 })
  }

  const result = await db.shift.deleteMany({ where: { date: { gte: from, lte: to } } })
  return NextResponse.json({ deleted: result.count })
}
