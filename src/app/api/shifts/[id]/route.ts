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

const shiftUpdateSchema = z.object({
  employeeId: z.string().min(1).optional(),
  date: isoDate.optional(),
  startTime: time.nullable().optional(),
  endTime: time.nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
})

// Изменить/перенести смену (требуется вход по коду)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasEditAccess())) return unauthorized()

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = shiftUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 })
  }

  const existing = await db.shift.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Смена не найдена' }, { status: 404 })
  }

  if (parsed.data.employeeId) {
    const employee = await db.employee.findUnique({ where: { id: parsed.data.employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 400 })
    }
  }

  const shift = await db.shift.update({
    where: { id },
    data: {
      ...(parsed.data.employeeId !== undefined ? { employeeId: parsed.data.employeeId } : {}),
      ...(parsed.data.date !== undefined ? { date: parsed.data.date } : {}),
      ...(parsed.data.startTime !== undefined ? { startTime: parsed.data.startTime } : {}),
      ...(parsed.data.endTime !== undefined ? { endTime: parsed.data.endTime } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    },
  })
  return NextResponse.json(shift)
}

// Удалить смену (требуется вход по коду)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasEditAccess())) return unauthorized()

  const { id } = await params
  const existing = await db.shift.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Смена не найдена' }, { status: 404 })
  }
  await db.shift.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
