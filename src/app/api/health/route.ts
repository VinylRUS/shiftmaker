import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Проверка живости приложения и БД (Bothost: удобно для диагностики домена).
// Доступен как /api/health, так и короткий алиас /health (см. next.config.ts).
export async function GET() {
  try {
    const [employees, shifts] = await Promise.all([
      db.employee.count(),
      db.shift.count(),
    ])
    return NextResponse.json({
      ok: true,
      db: 'up',
      employees,
      shifts,
      uptimeSec: Math.round(process.uptime()),
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, db: 'down', error: String(error) },
      { status: 500 }
    )
  }
}
