'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pencil, Plus, Trash2, UserRound, Loader2, X } from 'lucide-react'
import type { EmployeeDTO } from '@/lib/types'
import { PALETTE, getPaletteColor } from '@/lib/palette'
import { cn } from '@/lib/utils'

interface EmployeeManagerProps {
  open: boolean
  employees: EmployeeDTO[]
  onClose: () => void
  onCreate: (data: { name: string; position: string | null; color: string }) => Promise<boolean>
  onUpdate: (
    id: string,
    data: { name: string; position: string | null; color: string }
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function EmployeeManager({ open, employees, onClose, onCreate, onUpdate, onDelete }: EmployeeManagerProps) {
  // Форма: editingId === null — добавление, иначе редактирование.
  // Сброс формы выполняется ремоунтом компонента (key в родителе) — без эффектов.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [color, setColor] = useState('emerald')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = (e: EmployeeDTO) => {
    setEditingId(e.id)
    setName(e.name)
    setPosition(e.position ?? '')
    setColor(e.color)
    setError(null)
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPosition('')
    setColor(PALETTE[employees.length % PALETTE.length].key)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Укажите имя сотрудника')
      return
    }
    setBusy(true)
    const data = { name: name.trim(), position: position.trim() || null, color }
    const ok = editingId ? await onUpdate(editingId, data) : await onCreate(data)
    setBusy(false)
    if (ok) resetForm()
  }

  const handleDelete = async (id: string) => {
    setBusy(true)
    await onDelete(id)
    setBusy(false)
    if (editingId === id) resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Сотрудники</DialogTitle>
          <DialogDescription>
            Каждый сотрудник — строка таблицы. Удаление сотрудника также удалит все его смены.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-3">
          <ul className="flex flex-col gap-1">
            {employees.length === 0 && (
              <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Пока никого нет — добавьте первого сотрудника ниже
              </li>
            )}
            {employees.map((e) => {
              const c = getPaletteColor(e.color)
              const isEditing = editingId === e.id
              return (
                <li
                  key={e.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2',
                    isEditing && 'border-ring bg-accent/40'
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border"
                    style={{ backgroundColor: c.dot, borderColor: c.border }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium leading-tight">{e.name}</div>
                    {e.position && (
                      <div className="truncate text-xs text-muted-foreground">{e.position}</div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => (isEditing ? resetForm() : startEdit(e))}
                    aria-label={isEditing ? `Отменить редактирование ${e.name}` : `Редактировать ${e.name}`}
                  >
                    {isEditing ? <X className="h-4 w-4" aria-hidden /> : <Pencil className="h-4 w-4" aria-hidden />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Удалить ${e.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить {e.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Все смены этого сотрудника будут также удалены. Действие необратимо.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(ev) => {
                            ev.preventDefault()
                            handleDelete(e.id)
                          }}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              )
            })}
          </ul>
        </ScrollArea>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            {editingId ? (
              <>
                <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />
                Редактирование
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
                Новый сотрудник
              </>
            )}
          </div>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="emp-name">Имя</Label>
              <Input
                id="emp-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                placeholder="Например: Анна Смирнова"
                maxLength={80}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-position">Должность (необязательно)</Label>
              <Input
                id="emp-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Например: бариста"
                maxLength={80}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div className="grid gap-2">
              <Label>Цвет плашек</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Цвет сотрудника">
                {PALETTE.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={color === c.key}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setColor(c.key)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      color === c.key ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.dot }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" onClick={handleSubmit} disabled={busy || !name.trim()}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                <UserRound className="h-4 w-4" aria-hidden />
                {editingId ? 'Сохранить' : 'Добавить'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
                  Отмена
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
