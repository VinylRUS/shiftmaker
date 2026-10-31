// Общие типы приложения «График смен»

export interface EmployeeDTO {
  id: string
  name: string
  position: string | null
  color: string
  order: number
}

export interface ShiftDTO {
  id: string
  employeeId: string
  date: string // YYYY-MM-DD
  startTime: string | null // HH:mm
  endTime: string | null // HH:mm
  note: string | null
}

// Данные формы создания/редактирования смены
export interface ShiftInput {
  employeeId: string
  date: string
  startTime: string | null
  endTime: string | null
  note: string | null
}

export type AppMode = 'admin' | 'view'
