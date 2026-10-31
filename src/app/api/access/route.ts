import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EDIT_COOKIE, codeMatches, hasEditAccess, makeEditToken, usingDefaultCode } from '@/lib/access'

export const dynamic = 'force-dynamic'

const codeSchema = z.object({ code: z.string().min(1, 'Введите код').max(128) })

// Текущее состояние доступа (проверяется cookie)
export async function GET() {
  return NextResponse.json({ edit: await hasEditAccess() })
}

// Вход по коду: при успехе выдаём httpOnly-cookie с подписью HMAC
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = codeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Введите код' }, { status: 400 })
  }
  if (!codeMatches(parsed.data.code)) {
    return NextResponse.json({ error: 'Неверный код' }, { status: 401 })
  }

  if (usingDefaultCode()) {
    console.warn(
      '[access] Используется код по умолчанию. Задайте переменную окружения ADMIN_CODE ' +
        'в настройках приложения на Bothost (или в .env локально).'
    )
  }

  const res = NextResponse.json({ edit: true })
  res.cookies.set(EDIT_COOKIE, makeEditToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  })
  return res
}

// Выход из режима редактирования
export async function DELETE() {
  const res = NextResponse.json({ edit: false })
  res.cookies.set(EDIT_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
