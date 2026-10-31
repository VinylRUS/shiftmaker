'use client'

import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AccessDialogProps {
  open: boolean
  /** Возвращает текст ошибки или null при успехе */
  onSubmit: (code: string) => Promise<string | null>
  onClose: () => void
}

/** Окно входа в режим редактирования по коду (ADMIN_CODE). */
export function AccessDialog({ open, onSubmit, onClose }: AccessDialogProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (!value || busy) return
    setBusy(true)
    setError(null)
    const err = await onSubmit(value)
    setBusy(false)
    if (err) {
      setError(err)
      setCode('')
    }
    // при успехе родитель закрывает диалог (размонтирование сбрасывает форму)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden />
            Вход в режим редактирования
          </DialogTitle>
          <DialogDescription>
            Введите код администратора, чтобы составлять и изменять расписание.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">Код доступа</Label>
            <Input
              id="access-code"
              type="password"
              autoComplete="off"
              autoFocus
              placeholder="Код редактирования"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy || !code.trim()} className="gap-1.5">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Войти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
