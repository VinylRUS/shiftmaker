import { NextResponse } from 'next/server'
import { z } from 'zod'
import { format } from 'date-fns'
import { db } from '@/lib/db'
import { hasEditAccess, unauthorized } from '@/lib/access'

export const dynamic = 'force-dynamic'

// Копирование недели: переносим все смены исходной недели (7 дней от sourceFrom)
// на целевую неделю (7 дней от targetFrom), целевая неделя предварительно очищается.
const copySchema = z.object({
  sourceFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days, 12)
  return format(date, 'yyyy-MM-dd')
}

export async function POST(request: Request) {
  if (!(await hasEditAccess())) return unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = copySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные параметры копирования' }, { status: 400 })
  }

  const { sourceFrom, targetFrom } = parsed.data
  if (sourceFrom === targetFrom) {
    return NextResponse.json({ error: 'Исходная и целевая недели совпадают' }, { status: 400 })
  }

  const sourceTo = addDaysISO(sourceFrom, 6)
  const targetTo = addDaysISO(targetFrom, 6)

  const sourceShifts = await db.shift.findMany({
    where: { date: { gte: sourceFrom, lte: sourceTo } },
  })

  if (sourceShifts.length === 0) {
    return NextResponse.json({ error: 'На исходной неделе нет смен для копирования' }, { status: 400 })
  }

  const offsetDays = Math.round(
    (new Date(targetFrom).getTime() - new Date(sourceFrom).getTime()) / (24 * 60 * 60 * 1000)
  )

  const result = await db.$transaction(async (tx) => {
    await tx.shift.deleteMany({ where: { date: { gte: targetFrom, lte: targetTo } } })
    return tx.shift.createMany({
      data: sourceShifts.map((s) => ({
        employeeId: s.employeeId,
        date: addDaysISO(s.date, offsetDays),
        startTime: s.startTime,
        endTime: s.endTime,
        note: s.note,
      })),
    })
  })

  return NextResponse.json({ copied: result.count })
}
