import { useId, type ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { editorClosed, editorOpened, selectEditor } from '@/store/admin/editorSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

interface EditorDialogProps {
  /** The button that opens the dialog (focus returns to it on close). */
  trigger: ReactNode
  title: string
  description?: string
  submitLabel: string
  /** Wider dialog for long forms. */
  wide?: boolean
  /** The form. Give it `id={formId}` so the footer's Save button submits it. */
  children: (formId: string) => ReactNode
}

/**
 * Add/edit dialog for the admin portal. The form is mounted fresh each time it opens.
 * While saving, Save is disabled; a failure keeps the form and shows the server's reason;
 * a success closes the dialog (the saga shows the toast).
 */
export function EditorDialog({
  trigger,
  title,
  description,
  submitLabel,
  wide,
  children,
}: EditorDialogProps) {
  const { t, err } = useT()
  const dispatch = useAppDispatch()
  const editor = useAppSelector(selectEditor)
  const formId = useId()
  // Open/closed lives in the store, so a successful save can close the dialog.
  const open = editor.openId === formId
  const saving = open && editor.status === 'loading'

  const onOpenChange = (next: boolean) => {
    dispatch(next ? editorOpened(formId) : editorClosed())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        closeLabel={t('common.close')}
        className={cn('max-h-[90dvh] overflow-y-auto', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
      >
        <DialogHeader>
          <DialogTitle className="pe-8 text-lg">{title}</DialogTitle>
          <DialogDescription className={description ? undefined : 'sr-only'}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>
        {editor.status === 'error' && editor.error && (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-destructive">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {err(editor.error)}
          </p>
        )}
        {children(formId)}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11 px-4" disabled={saving}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} className="h-11 px-5" disabled={saving}>
            {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
            {saving ? t('common.saving') : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
