import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, Field, Input } from '@/components/ui/primitives'
import { loginSchema, type LoginForm } from '@/lib/schemas'
import { DEMO_USERS } from '@/mocks/fixtures'

const DEMO_PASSWORD = 'mindex-demo'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/experiments'

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (user) return <Navigate to={from} replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
      await navigate(from, { replace: true })
    } catch (err) {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Sunucuya ulaşılamadı.',
      })
    }
  })

  const fillDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', DEMO_PASSWORD, { shouldValidate: true })
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            M
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Mindex Arena</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Birlikte öğrenen kripto ticaret ajanları
          </p>
        </div>

        <Card>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="E-posta" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
            </Field>
            <Field label="Parola" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
            </Field>
            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </Button>
          </form>
        </Card>

        <Card className="text-xs">
          <p className="mb-2 font-medium">Demo hesapları (sahte API)</p>
          <div className="flex flex-col gap-2">
            {Object.entries(DEMO_USERS).map(([email, { role }]) => (
              <Button key={email} variant="outline" size="sm" onClick={() => fillDemo(email)}>
                {role === 'researcher' ? 'Araştırmacı' : 'İzleyici'} · {email}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </main>
  )
}
