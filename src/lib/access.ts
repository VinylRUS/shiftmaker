import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Вход в режим редактирования по коду.
//
// Код задаётся переменной окружения ADMIN_CODE (на Bothost — в панели,
// «Переменные окружения»). Если она не задана, используется код по умолчанию
// '1234' — только чтобы приложение можно было открыть «из коробки»;
// в продакшене обязательно задайте свой код.
//
// Проверка выполняется НА СЕРВЕРЕ: все изменяющие операции API (POST/PATCH/
// DELETE по сотрудникам и сменам) требуют httpOnly-cookie с подписью HMAC,
// которая выдаётся только после ввода верного кода. Смена ADMIN_CODE на
// сервере мгновенно «гасит» все ранее выданные cookie.

export const EDIT_COOKIE = 'sm_edit'
const DEFAULT_CODE = '1234'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 дней

export function getAdminCode(): string {
  return process.env.ADMIN_CODE?.trim() || DEFAULT_CODE
}

export function usingDefaultCode(): boolean {
  return !process.env.ADMIN_CODE?.trim()
}

/** Подпись, которую кладём в cookie после успешного ввода кода. */
export function makeEditToken(): string {
  return createHmac('sha256', getAdminCode()).update('shiftmaker:edit-mode').digest('hex')
}

/** Сравнение кода без тайминговых утечек. */
export function codeMatches(input: unknown): boolean {
  if (typeof input !== 'string') return false
  const expected = Buffer.from(getAdminCode(), 'utf8')
  const actual = Buffer.from(input, 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Есть ли у текущего запроса право на редактирование (валидная cookie). */
export async function hasEditAccess(): Promise<boolean> {
  const store = await cookies()
  const value = store.get(EDIT_COOKIE)?.value
  if (!value) return false
  const expected = Buffer.from(makeEditToken(), 'utf8')
  const actual = Buffer.from(value, 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Стандартный ответ «требуется вход по коду» для защищённых операций. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Требуется вход по коду редактирования' }, { status: 401 })
}
