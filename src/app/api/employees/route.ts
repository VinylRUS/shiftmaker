import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { PALETTE } from '@/lib/palette'
import { hasEditAccess, unauthorized } from '@/lib/access'

export const dynamic = 'force-dynamic'

const employeeSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя сотрудника').max(80),
  position: z.string().trim().max(80).optional().nullable(),
  color: z
    .string()
    .refine((c) => PALETTE.some((p) => p.key === c), 'Неизвестный цвет')
    .optional(),
})

// Список сотрудников (в порядке order)
export async function GET() {
  const employees = await db.employee.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(employees)
}

// Создать сотрудника (требуется вход по коду)
export async function POST(request: Request) {
  if (!(await hasEditAccess())) return unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = employeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 })
  }

  const last = await db.employee.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })
  const nextColor =
    PALETTE[((last?.order ?? -1) + 1) % PALETTE.length].key
  const employee = await db.employee.create({
    data: {
      name: parsed.data.name,
      position: parsed.data.position || null,
      color: parsed.data.color ?? nextColor,
      order: (last?.order ?? -1) + 1,
    },
  })
  return NextResponse.json(employee, { status: 201 })
}
