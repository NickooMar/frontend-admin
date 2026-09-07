import {Loader2Icon} from 'lucide-react'

export function FullScreenLoader({label}: {label: string}) {
  return (
    <output
      aria-live="polite"
      className="flex min-h-svh w-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2Icon aria-hidden className="size-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </output>
  )
}
