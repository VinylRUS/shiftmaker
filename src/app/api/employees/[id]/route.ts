import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { PALETTE } from '@/lib/palette'
import { hasEditAccess, unauthorized } from '@/lib/access'

export const dynamic = 'force-dynamic'

const employeeUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя сотрудника').max(80).optional(),
  position: z.string().trim().max(80).nullable().optional(),
  color: z
    .string()
    .refine((c) => PALETTE.some((p) => p.key === c), 'Неизвестный цвет')
    .optional(),
  order: z.number().int().min(0).optional(),
})

// Изменить сотрудника (требуется вход по коду)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasEditAccess())) return unauthorized()

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = employeeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 })
  }

  const existing = await db.employee.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 })
  }

  const employee = await db.employee.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.position !== undefined ? { position: parsed.data.position } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
    },
  })
  return NextResponse.json(employee)
}

// Удалить сотрудника (смены удалятся каскадом; требуется вход по коду)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasEditAccess())) return unauthorized()

  const { id } = await params
  const existing = await db.employee.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 })
  }
  await db.employee.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
