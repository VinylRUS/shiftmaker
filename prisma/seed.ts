// Демо-данные: сотрудники и смены на текущую неделю (Пн–Вс)
import { PrismaClient, type Employee } from '@prisma/client'

const db = new PrismaClient()

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Понедельник текущей недели
const now = new Date()
const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

const D = (offset: number) => {
  const d = new Date(monday)
  d.setDate(d.getDate() + offset)
  return iso(d)
}

const employees = [
  { name: 'Анна Смирнова', position: 'Старший менеджер', color: 'emerald', order: 0 },
  { name: 'Игорь Петров', position: 'Бариста', color: 'amber', order: 1 },
  { name: 'Мария Козлова', position: 'Повар', color: 'rose', order: 2 },
  { name: 'Дмитрий Волков', position: 'Курьер', color: 'teal', order: 3 },
  { name: 'Елена Соколова', position: 'Администратор', color: 'violet', order: 4 },
]

// [день (0=Пн), сотрудник, начало, конец, примечание]
type Row = [number, number, string | null, string | null, string | null]
const shifts: Row[] = [
  [0, 0, '09:00', '18:00', 'Открытие смены'],
  [0, 1, '08:00', '16:00', null],
  [0, 2, '10:00', '20:00', null],
  [0, 3, null, null, 'Дежурство на линии'],
  [1, 0, '09:00', '18:00', null],
  [1, 1, '12:00', '21:00', null],
  [1, 4, '14:00', '23:00', 'Вечерняя смена'],
  [2, 2, '06:00', '14:00', 'Ранняя заготовка'],
  [2, 3, '10:00', '19:00', null],
  [2, 4, null, null, 'Инвентаризация'],
  [3, 0, '10:00', '15:00', 'Короткий день'],
  [3, 1, '20:00', '08:00', 'Ночная смена'],
  [3, 2, '10:00', '20:00', null],
  [4, 0, '09:00', '18:00', null],
  [4, 1, '08:00', '16:00', null],
  [4, 3, '12:00', '21:00', null],
  [4, 4, '09:00', '13:00', null],
  [5, 2, '11:00', '23:00', 'Суббота, пик'],
  [5, 1, '09:00', '17:00', null],
  [5, 3, '10:00', '19:00', null],
  [6, 0, null, null, 'Дежурство администратора'],
  [6, 4, '12:00', '20:00', 'Закрытие недели'],
]

async function main() {
  await db.shift.deleteMany()
  await db.employee.deleteMany()

  const created: Employee[] = []
  for (const e of employees) {
    created.push(await db.employee.create({ data: e }))
  }

  for (const [day, empIdx, start, end, note] of shifts) {
    await db.shift.create({
      data: {
        employeeId: created[empIdx].id,
        date: D(day),
        startTime: start,
        endTime: end,
        note: note,
      },
    })
  }

  console.log(`Посеяно: ${created.length} сотрудников, ${shifts.length} смен. Понедельник недели: ${D(0)}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
