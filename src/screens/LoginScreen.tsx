import {AlertCircleIcon, EyeIcon, EyeOffIcon, Loader2Icon} from 'lucide-react'
import {type FormEvent, useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {signIn} from '@/auth/authActions'
import {MODULE_ITEMS} from '@/app/navigation'
import {BrandLockup} from '@/components/BrandMark'
import {CommitHash, EnvironmentPill} from '@/components/EnvironmentPill'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Field, FieldGroup, FieldLabel} from '@/components/ui/field'
import {Input} from '@/components/ui/input'
import {toApiError} from '@/lib/api'
import {STRINGS} from '@/lib/strings'
import {ThemeToggle} from '@/theme/ThemeToggle'
import {AUTH_ERROR_CODES} from '@/types/auth'

function messageForError(error: unknown): string {
  const apiError = toApiError(error)
  if (apiError.isNetworkError) return STRINGS.errors.NETWORK
  if (apiError.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) return STRINGS.errors.INVALID_CREDENTIALS
  if (apiError.code === AUTH_ERROR_CODES.ADMIN_DISABLED) return STRINGS.errors.ADMIN_DISABLED
  if (apiError.statusCode === 401) return STRINGS.errors.INVALID_CREDENTIALS
  return STRINGS.errors.UNKNOWN
}

/**
 * Split login: brand panel on the left (a dark band above the form on mobile)
 * and the form on the right. The environment and commit are visible before
 * signing in, which is the whole point of showing them at all.
 */
export default function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = (location.state as {from?: string} | null)?.from ?? '/'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError(STRINGS.login.required)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await signIn({email: trimmedEmail, password})
      navigate(redirectTo, {replace: true})
    } catch (err) {
      setError(messageForError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      {/* In light mode the panel is the primary block; in dark it becomes the raised
          sidebar surface, which needs a border to separate it from the page. */}
      <aside className="relative isolate shrink-0 overflow-hidden bg-primary px-6 pt-14 pb-7 text-primary-foreground lg:flex lg:w-[592px] lg:flex-col lg:justify-between lg:p-12 dark:border-b dark:border-sidebar-border dark:bg-sidebar dark:text-sidebar-foreground lg:dark:border-r lg:dark:border-b-0">
        <div aria-hidden className="brand-grid pointer-events-none absolute inset-0 -z-10" />

        <div className="flex items-start justify-between gap-4">
          <BrandLockup inverted />
          {/* Lives inside the panel so it inherits the light-on-dark colour in both themes. */}
          <ThemeToggle className="-mt-1 -mr-2 hover:bg-current/10 hover:text-current dark:hover:bg-current/10" />
        </div>

        <div className="mt-6 flex max-w-70 flex-col gap-7 lg:mt-0 lg:mb-6 lg:max-w-105">
          <p className="text-xl leading-[1.3] font-medium tracking-[-0.018em] text-pretty lg:text-3xl lg:leading-[1.25] lg:tracking-[-0.022em]">
            {STRINGS.login.statement}
          </p>

          <ul className="hidden flex-col gap-3 lg:flex">
            {MODULE_ITEMS.map(({to, title, icon: Icon}) => (
              <li key={to} className="flex items-center gap-2.5 text-[13px] leading-[18px] opacity-55">
                <Icon aria-hidden className="size-[15px] shrink-0" />
                {title}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="text-[11px] font-medium tracking-[0.06em] uppercase opacity-40">{STRINGS.shell.environment}</span>
          <EnvironmentPill inverted />
          <CommitHash className="opacity-35" />
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-6 py-8 lg:items-center lg:justify-center lg:p-12">
        <div className="flex w-full max-w-96 flex-1 flex-col lg:flex-none">
          <header className="flex flex-col gap-1.5">
            <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.021em] lg:text-2xl lg:leading-8">{STRINGS.login.title}</h1>
            <p className="text-sm text-pretty text-muted-foreground">{STRINGS.login.subtitle}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate className="mt-7 lg:mt-8">
            <FieldGroup>
              {error ? (
                <Alert id="login-error" variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>{STRINGS.login.errorTitle}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="login-email">{STRINGS.login.email}</FieldLabel>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder={STRINGS.login.emailPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-11 px-3 md:h-10"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="login-password">{STRINGS.login.password}</FieldLabel>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={STRINGS.login.passwordPlaceholder}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'login-error' : undefined}
                    className="h-11 px-3 pr-11 md:h-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={submitting}
                    aria-label={showPassword ? STRINGS.login.hidePassword : STRINGS.login.showPassword}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                  </Button>
                </div>
              </Field>

              <Button type="submit" disabled={submitting} className="mt-1 h-11 w-full text-[15px] md:h-10 md:text-sm">
                {submitting ? (
                  <>
                    <Loader2Icon aria-hidden className="animate-spin" />
                    {STRINGS.login.submitting}
                  </>
                ) : (
                  STRINGS.login.submit
                )}
              </Button>
            </FieldGroup>
          </form>

          <div className="mt-auto flex items-center justify-center gap-2 pt-6 lg:hidden">
            <EnvironmentPill />
            <CommitHash className="text-muted-foreground" />
          </div>
        </div>
      </main>
    </div>
  )
}
