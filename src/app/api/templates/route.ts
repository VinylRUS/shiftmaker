import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasEditAccess, unauthorized } from '@/lib/access'

export const dynamic = 'force-dynamic'

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате ЧЧ:ММ')

const templateSchema = z.object({
  startTime: time,
  endTime: time,
})

// Список пресетов (требуется вход по коду — пресеты нужны только при редактировании)
export async function GET() {
  if (!(await hasEditAccess())) return unauthorized()

  const templates = await db.shiftTemplate.findMany({
    orderBy: [{ startTime: 'asc' }, { endTime: 'asc' }],
  })
  return NextResponse.json(templates)
}

// Сохранить пресет. Если такой промежуток уже есть — возвращаем существующий
// (дубликаты не создаются, уникальность гарантируется и на уровне БД).
export async function POST(request: Request) {
  if (!(await hasEditAccess())) return unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = templateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 }
    )
  }

  const { startTime, endTime } = parsed.data

  const existing = await db.shiftTemplate.findUnique({
    where: { startTime_endTime: { startTime, endTime } },
  })
  if (existing) {
    return NextResponse.json({ ...existing, created: false })
  }

  const template = await db.shiftTemplate.create({ data: { startTime, endTime } })
  return NextResponse.json({ ...template, created: true }, { status: 201 })
}
