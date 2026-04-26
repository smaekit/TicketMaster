import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import { editUserSchema, type EditUserInput } from '@ticketmaster/shared'
import type { User } from './UsersTable'
import api from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type EditUserFormData = EditUserInput

type Props = {
  user: User
}

export function EditUserModal({ user }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: user.name, email: user.email, password: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: EditUserFormData) => api.patch(`/users/${user.id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
    },
    onError: (err: any) => {
      form.setError('root', { message: getErrorMessage(err, 'Failed to update user') })
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset({ name: user.name, email: user.email, password: '' })
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit ${user.name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(data => mutation.mutate(data))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              {...form.register('email')}
              aria-invalid={!!form.formState.errors.email}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-password">Password</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              {...form.register('password')}
              aria-invalid={!!form.formState.errors.password}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
