import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hasEditAccess, unauthorized } from '@/lib/access'

export const dynamic = 'force-dynamic'

// Удалить пресет (требуется вход по коду)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasEditAccess())) return unauthorized()

  const { id } = await params
  const existing = await db.shiftTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Пресет не найден' }, { status: 404 })
  }

  await db.shiftTemplate.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
