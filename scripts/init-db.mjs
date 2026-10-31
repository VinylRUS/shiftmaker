// Инициализация базы данных при старте контейнера (Bothost).
//
// 1) `prisma db push --skip-generate` — создаёт/обновляет таблицы SQLite
//    (быстро и идемпотентно: если схема совпадает, ничего не делает).
// 2) Если база создана ВПЕРВЫЕ — заполняем её демо-данными, чтобы приложение
//    не открывалось пустым. Отключается переменной окружения SEED_DEMO=0.
//
// Вызывается из Dockerfile перед запуском сервера:
//   CMD ["sh", "-c", "node scripts/init-db.mjs && npm start"]
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { seedDemoData } from '../prisma/seed.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Node не подхватывает .env автоматически (это делает только Next/Prisma CLI),
// поэтому для единообразия читаем DATABASE_URL из .env руками.
// Если и её нет — путь по умолчанию: db/custom.db в корне проекта.
// Относительные пути Prisma отсчитывает от папки prisma/schema.prisma.
if (!process.env.DATABASE_URL) {
  try {
    const envText = readFileSync(resolve(root, '.env'), 'utf8')
    const match = envText.match(/^DATABASE_URL\s*=\s*(.+)$/m)
    if (match) process.env.DATABASE_URL = match[1].trim()
  } catch {
    /* .env отсутствует — не страшно */
  }
  process.env.DATABASE_URL ||= 'file:../db/custom.db'
}

// Куда Prisma реально положит файл базы.
function dbFilePath() {
  const url = process.env.DATABASE_URL
  const p = url.startsWith('file:') ? url.slice(5) : url
  return isAbsolute(p) ? p : resolve(root, 'prisma', p)
}

const dbFile = dbFilePath()
mkdirSync(dirname(dbFile), { recursive: true })
const existed = existsSync(dbFile)

console.log(
  `[init-db] DATABASE_URL=${process.env.DATABASE_URL} -> ${dbFile} ` +
    `(${existed ? 'существующая база, демо-данные не трогаем' : 'новая база'})`
)

// Создание/обновление таблиц. При деструктивных изменениях схемы команда
// завершится ошибкой — это видно в логах Bothost, данные не теряются молча.
execSync('npx prisma db push --skip-generate', {
  cwd: root,
  stdio: 'inherit',
})

if (existed) {
  console.log('[init-db] База готова.')
} else if (process.env.SEED_DEMO === '0') {
  console.log('[init-db] База готова (SEED_DEMO=0 — демо-данные пропущены).')
} else {
  const db = new PrismaClient()
  try {
    const r = await seedDemoData(db)
    console.log(
      `[init-db] Демо-данные: ${r.employees} сотрудников, ${r.shifts} смен ` +
        `(неделя с ${r.monday}). Отключить при первом старте: SEED_DEMO=0.`
    )
    console.log('[init-db] База готова.')
  } finally {
    await db.$disconnect()
  }
}
