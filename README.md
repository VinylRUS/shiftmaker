# График смен — планировщик расписания сотрудников

Веб-приложение в виде Excel-подобной таблицы: сотрудники × дни недели, смены с
временем (включая ночные через полночь), дежурства без времени и примечания.
Перетаскивание смен мышью, копирование и очистка недель, тёмная тема, режим
только для чтения по ссылке `?mode=view`.

## Стек

- **Next.js 16** (App Router, TypeScript) + React 19
- **Tailwind CSS 4** + shadcn/ui
- **Prisma + SQLite**
- **dnd-kit** — drag & drop смен

## Локальный запуск

```bash
npm install          # зависимости
cp .env.example .env # путь к базе (опционально, есть умолчание db/custom.db)
npm run db:generate  # Prisma-клиент
npm run db:init      # создать БД + демо-данные при первом запуске
npm run dev          # http://localhost:3000
```

Продакшен-сборка локально:

```bash
npm run build
npm start            # PORT=3000, слушает 0.0.0.0
```

## Полезные команды

| Команда            | Что делает                                             |
|--------------------|--------------------------------------------------------|
| `npm run dev`      | dev-сервер с hot reload                                 |
| `npm run build`    | продакшен-сборка                                        |
| `npm start`        | продакшен-сервер (`PORT`, хост `0.0.0.0`)               |
| `npm run db:init`  | `prisma db push` + демо-данные, если база создаётся впервые |
| `npm run db:seed`  | перезаписать базу демо-данными                          |
| `npm run lint`     | ESLint                                                  |

## Структура

```
prisma/schema.prisma     # модели Employee и Shift (SQLite)
prisma/seed.mjs          # демо-данные (5 сотрудников, 22 смены)
scripts/init-db.mjs      # инициализация БД при старте контейнера
src/app/api/…            # REST API (employees, shifts, shifts/copy, health)
src/components/schedule/ # WeekTable, ShiftChip, ShiftDialog, EmployeeManager…
src/lib/                 # палитра, даты (неделя с Пн), типы, db
Dockerfile               # продакшен-образ для Bothost
```

## Деплой

Инструкция для хостинга **bothost.ru** — в файле [DEPLOY-BOTHOST.md](./DEPLOY-BOTHOST.md).

Проверка живости после деплоя: `https://ваш-домен/health`.
