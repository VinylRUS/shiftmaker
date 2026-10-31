// Палитра цветов сотрудников: мягкие фоны + насыщенный текст + рамка.
// Ключ хранится в БД, HEX задаются явно (динамические Tailwind-классы не работают).

export interface PaletteColor {
  key: string
  label: string
  dot: string
  bg: string // фон плашки в светлой теме
  text: string // текст плашки в светлой теме
  border: string
  bgDark: string // фон плашки в тёмной теме
  textDark: string // текст плашки в тёмной теме
}

export const PALETTE: PaletteColor[] = [
  {
    key: 'emerald',
    label: 'Изумрудный',
    dot: '#10b981',
    bg: '#d1fae5',
    text: '#065f46',
    border: '#6ee7b7',
    bgDark: '#064e3b',
    textDark: '#a7f3d0',
  },
  {
    key: 'amber',
    label: 'Янтарный',
    dot: '#f59e0b',
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fcd34d',
    bgDark: '#78350f',
    textDark: '#fde68a',
  },
  {
    key: 'rose',
    label: 'Розовый',
    dot: '#f43f5e',
    bg: '#ffe4e6',
    text: '#9f1239',
    border: '#fda4af',
    bgDark: '#881337',
    textDark: '#fecdd3',
  },
  {
    key: 'teal',
    label: 'Бирюзовый',
    dot: '#14b8a6',
    bg: '#ccfbf1',
    text: '#115e59',
    border: '#5eead4',
    bgDark: '#134e4a',
    textDark: '#99f6e4',
  },
  {
    key: 'violet',
    label: 'Фиолетовый',
    dot: '#8b5cf6',
    bg: '#ede9fe',
    text: '#5b21b6',
    border: '#c4b5fd',
    bgDark: '#4c1d95',
    textDark: '#ddd6fe',
  },
  {
    key: 'orange',
    label: 'Оранжевый',
    dot: '#f97316',
    bg: '#ffedd5',
    text: '#9a3412',
    border: '#fdba74',
    bgDark: '#7c2d12',
    textDark: '#fed7aa',
  },
  {
    key: 'cyan',
    label: 'Голубой',
    dot: '#06b6d4',
    bg: '#cffafe',
    text: '#155e75',
    border: '#67e8f9',
    bgDark: '#164e63',
    textDark: '#a5f3fc',
  },
  {
    key: 'pink',
    label: 'Малиновый',
    dot: '#ec4899',
    bg: '#fce7f3',
    text: '#9d174d',
    border: '#f9a8d4',
    bgDark: '#831843',
    textDark: '#fbcfe8',
  },
  {
    key: 'lime',
    label: 'Лаймовый',
    dot: '#84cc16',
    bg: '#ecfccb',
    text: '#3f6212',
    border: '#bef264',
    bgDark: '#365314',
    textDark: '#d9f99d',
  },
  {
    key: 'slate',
    label: 'Серый',
    dot: '#64748b',
    bg: '#e2e8f0',
    text: '#334155',
    border: '#94a3b8',
    bgDark: '#1e293b',
    textDark: '#cbd5e1',
  },
]

export const DEFAULT_COLOR = 'emerald'

export function getPaletteColor(key: string): PaletteColor {
  return PALETTE.find((c) => c.key === key) ?? PALETTE[0]
}
