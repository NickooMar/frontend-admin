import {MonitorIcon, MoonIcon, SunIcon} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {STRINGS} from '@/lib/strings'
import type {ThemePreference} from './theme'
import {useThemeStore} from './themeStore'

const OPTIONS = [
  {value: 'light', label: STRINGS.theme.light, icon: SunIcon},
  {value: 'dark', label: STRINGS.theme.dark, icon: MoonIcon},
  {value: 'system', label: STRINGS.theme.system, icon: MonitorIcon},
] as const satisfies ReadonlyArray<{value: ThemePreference; label: string; icon: typeof SunIcon}>

/** Ghost icon button + three-way radio menu. The icon shows what is painted, not what was picked. */
export function ThemeToggle({className}: {className?: string}) {
  const preference = useThemeStore((state) => state.preference)
  const resolved = useThemeStore((state) => state.resolved)
  const setPreference = useThemeStore((state) => state.setPreference)

  const Icon = resolved === 'dark' ? MoonIcon : SunIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={STRINGS.theme.label} className={className}>
          <Icon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup value={preference} onValueChange={(value) => setPreference(value as ThemePreference)}>
          {OPTIONS.map(({value, label, icon: OptionIcon}) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <OptionIcon aria-hidden />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
